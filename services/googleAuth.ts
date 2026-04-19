// Google OAuth 2.0 - Authentication only (no calendar/drive access)
// Uses Firebase signInWithPopup to get ID token (initTokenClient only returns access_token, not id_token)

import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, signInWithCredential, type User as FirebaseAuthUser } from 'firebase/auth';
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

/** Google warns if `initialize()` runs more than once per page load. */
let gsiClientInitialized = false;

const GSI_INIT_PROMISE_KEY = '__meant2grow_gsi_init_promise__';

/**
 * Single initialize() per browser tab: dedupes React Strict Mode, remounts, and duplicate
 * bundled copies of this module (each would otherwise have its own module-level flag).
 */
export const initializeGoogleAuth = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('Google API not loaded. Make sure to include the Google Sign-In script.')
    );
  }

  type GsiWindow = Window & { [GSI_INIT_PROMISE_KEY]?: Promise<void> };
  const w = window as GsiWindow;
  const existing = w[GSI_INIT_PROMISE_KEY];
  if (existing) {
    return existing;
  }

  const p = (async () => {
    if (!window.google) {
      throw new Error('Google API not loaded. Make sure to include the Google Sign-In script.');
    }
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID is not set');
    }
    if (gsiClientInitialized) {
      return;
    }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: () => {
        // Auto-select callback (optional)
      },
    });
    gsiClientInitialized = true;
  })();

  p.catch(() => {
    delete w[GSI_INIT_PROMISE_KEY];
  });

  w[GSI_INIT_PROMISE_KEY] = p;
  return p;
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
export const signInToFirebaseAuth = async (idToken: string): Promise<FirebaseAuthUser> => {
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
    return userCredential.user;
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

/**
 * Firebase ID token for Cloud Functions (verifyIdToken). Prefer the live Auth session
 * so tokens stay fresh; localStorage keys can be missing or out of sync with auth.
 */
export async function getFirebaseIdTokenForCloudFunctions(): Promise<string> {
  const user = auth.currentUser;
  if (user) {
    return user.getIdToken();
  }

  const stored = localStorage.getItem("authToken");
  if (stored && stored !== "simulated-token" && stored.trim().length > 0) {
    return stored;
  }

  const google = localStorage.getItem("google_id_token");
  if (google && google.trim().length > 0) {
    return google;
  }

  throw new Error(
    "Sign in required for video calls. Refresh the page or sign in again."
  );
}

