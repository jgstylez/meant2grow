// Google OAuth 2.0 - Authentication only (no calendar/drive access)

import { signInWithCredential, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';
import { logger } from './logger';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => {
            requestAccessToken: () => void;
          };
        };
        id: {
          initialize: (config: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

// Minimal scopes - only what we need for authentication
const GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export const initializeGoogleAuth = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google) {
      reject(new Error('Google API not loaded. Make sure to include the Google Sign-In script.'));
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID is not set'));
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: () => {
          // Auto-select callback (optional)
        },
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

export const signInWithGoogle = (): Promise<{ user: GoogleUser; idToken: string }> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google) {
      reject(new Error('Google API not loaded'));
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID is not set'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES,
      callback: async (tokenResponse: any) => {
        try {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error));
            return;
          }

          // Fetch user info from Google
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          });

          if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch user info');
          }

          const userInfo = await userInfoResponse.json();

          // Store ID token (not access token) for backend verification
          if (tokenResponse.id_token) {
            localStorage.setItem('google_id_token', tokenResponse.id_token);
          }

          resolve({
            user: {
              id: userInfo.id,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
            },
            idToken: tokenResponse.id_token,
          });
        } catch (error) {
          reject(error);
        }
      },
    });

    tokenClient.requestAccessToken();
  });
};

/**
 * Sign in to Firebase Auth using Google ID token
 * This is required for Firebase Cloud Functions to authenticate requests
 * Firebase Auth will automatically handle token refresh
 */
export const signInToFirebaseAuth = async (idToken: string): Promise<void> => {
  // Validate idToken before attempting to use it
  if (!idToken || typeof idToken !== 'string' || idToken.trim().length === 0) {
    const error = new Error('Invalid Google ID token: token is empty or invalid');
    logger.error('Error signing in to Firebase Auth', error);
    throw error;
  }
  
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    if (!credential) {
      throw new Error('Failed to create credential from Google ID token');
    }
    const userCredential = await signInWithCredential(auth, credential);
    
    // Firebase Auth automatically persists the session and handles token refresh
    // The user is now authenticated and Firestore operations will work
    logger.info('Successfully signed in to Firebase Auth', {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
    });
  } catch (error: unknown) {
    // Check if error is due to expired token
    const errorCode = (error as { code?: string })?.code;
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorCode === 'auth/invalid-credential' || errorMessage.includes('expired')) {
      logger.error('Google ID token is expired or invalid. User needs to sign in again.', error);
      throw new Error('Token expired. Please sign in again.');
    }
    logger.error('Error signing in to Firebase Auth', error);
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  // Sign out from Firebase Auth
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    logger.error('Error signing out from Firebase Auth', error);
  }
  
  // Clear localStorage
  localStorage.removeItem('google_id_token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('organizationId');
  localStorage.removeItem('userId');
  
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
};

export const getIdToken = (): string | null => {
  return localStorage.getItem('google_id_token');
};

export const isAuthenticated = (): boolean => {
  return !!getIdToken();
};

