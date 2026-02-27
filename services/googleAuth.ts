// Google OAuth 2.0 - Authentication only (no calendar/drive access)
// Uses Firebase signInWithPopup to get ID token (initTokenClient only returns access_token, not id_token)

import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
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

/**
 * Sign in with Google using Firebase's signInWithPopup.
 * This ensures we get an ID token (initTokenClient only returns access_token).
 * Returns user info and Firebase ID token for API verification.
 */
export const signInWithGoogle = async (): Promise<{ user: GoogleUser; idToken: string }> => {
  const provider = new GoogleAuthProvider();
  provider.addScope('openid');
  provider.addScope('email');
  provider.addScope('profile');

  const userCredential = await signInWithPopup(auth, provider);
  const firebaseUser = userCredential.user;

  // Firebase ID token - API's verifyIdToken accepts this
  const idToken = await firebaseUser.getIdToken();
  if (!idToken || idToken.trim().length === 0) {
    throw new Error('Google ID token is missing or empty');
  }

  // Google user ID (sub) from provider - use for API matching
  const googleId = firebaseUser.providerData[0]?.uid ?? firebaseUser.uid;

  const user: GoogleUser = {
    id: googleId,
    email: firebaseUser.email ?? '',
    name: firebaseUser.displayName ?? '',
    picture: firebaseUser.photoURL ?? '',
  };

  localStorage.setItem('google_id_token', idToken);

  return { user, idToken };
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

