// Google OAuth 2.0 - Authentication only (no calendar/drive access)

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

export const signOut = (): void => {
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

