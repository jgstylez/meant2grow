import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { updateUser, getUser } from './database';
import { logger } from './logger';

/**
 * Ensures a Firestore user has a Firebase Auth account (lazy migration)
 * If the user doesn't have a Firebase Auth account, creates one
 * Links the Firebase Auth UID to the Firestore user document
 * 
 * @param email - User's email address
 * @param password - User's password (optional, will generate temporary if not provided)
 * @param firestoreUserId - The Firestore user document ID
 * @returns Firebase Auth UID if successful, null if failed
 */
export const ensureFirebaseAuthAccount = async (
  email: string,
  password: string | null,
  firestoreUserId: string
): Promise<string | null> => {
  try {
    // Check if Firebase Auth account exists for this email
    // If email/password auth is not enabled, this will fail with auth/configuration-not-found
    let signInMethods: string[] = [];
    try {
      signInMethods = await fetchSignInMethodsForEmail(auth, email);
    } catch (checkError: any) {
      // If email/password auth is not configured, try to create account directly
      if (checkError.code === 'auth/configuration-not-found') {
        logger.warn('Email/password authentication not enabled in Firebase Console. Attempting to create account directly.', {
          email,
          firestoreUserId,
        });
        
        // Skip the sign-in methods check and try to create account directly
        if (!password) {
          logger.error('Cannot create Firebase Auth account: email/password auth not enabled and no password provided', {
            email,
            firestoreUserId,
          });
          return null;
        }
        
        // Try to create account directly (will fail if email already exists, which is fine)
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const firebaseAuthUid = userCredential.user.uid;
          await updateUser(firestoreUserId, { firebaseAuthUid });
          logger.info('Created Firebase Auth account (email/password auth not fully configured)', {
            email,
            firebaseAuthUid,
            firestoreUserId,
          });
          return firebaseAuthUid;
        } catch (createError: any) {
          // If email already exists, try to sign in
          if (createError.code === 'auth/email-already-in-use') {
            try {
              const userCredential = await signInWithEmailAndPassword(auth, email, password);
              const firebaseAuthUid = userCredential.user.uid;
              await updateUser(firestoreUserId, { firebaseAuthUid });
              logger.info('Signed in to existing Firebase Auth account', {
                email,
                firebaseAuthUid,
                firestoreUserId,
              });
              return firebaseAuthUid;
            } catch (signInError: any) {
              logger.error('Failed to sign in after email-already-in-use', {
                email,
                firestoreUserId,
                error: signInError,
              });
              return null;
            }
          }
          
          logger.error('Failed to create Firebase Auth account (email/password auth may not be enabled)', {
            email,
            firestoreUserId,
            error: createError,
          });
          return null;
        }
      }
      
      // Re-throw other errors
      throw checkError;
    }
    
    if (signInMethods.length > 0) {
      // User has Firebase Auth account - try to authenticate
      if (!password) {
        // No password provided - can't authenticate
        // Send password reset email so user can set their password
        logger.info('Firebase Auth account exists but no password provided. Sending password reset email.', {
          email,
          firestoreUserId,
        });
        
        try {
          await firebaseSendPasswordResetEmail(auth, email);
          logger.info('Password reset email sent', { email });
        } catch (resetError: any) {
          logger.error('Failed to send password reset email', resetError);
        }
        
        // Return null - user needs to set password
        return null;
      }
      
      try {
        // Try to sign in with provided password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseAuthUid = userCredential.user.uid;
        
        // Update Firestore user document with Firebase Auth UID
        await updateUser(firestoreUserId, { firebaseAuthUid });
        
        // Also create/update user document with ID = Firebase Auth UID (for Firestore rules)
        // This allows Firestore rules to find the user by request.auth.uid
        try {
          const authUidDocRef = doc(db, 'users', firebaseAuthUid);
          const authUidDoc = await getDoc(authUidDocRef);
          
          if (!authUidDoc.exists()) {
            // Create user document with Firebase Auth UID as ID
            // Copy data from the original user document
            const originalUser = await getUser(firestoreUserId);
            if (originalUser) {
              await setDoc(authUidDocRef, {
                ...originalUser,
                id: firebaseAuthUid, // Use Firebase Auth UID as ID
                firebaseAuthUid: firebaseAuthUid, // Also store as field for reference
                originalFirestoreUserId: firestoreUserId, // Keep reference to original document
              }, { merge: true });
            }
          } else {
            // Update existing document
            await setDoc(authUidDocRef, {
              firebaseAuthUid: firebaseAuthUid,
              originalFirestoreUserId: firestoreUserId,
            }, { merge: true });
          }
        } catch (docError: any) {
          // Log but don't fail - the original document update already succeeded
          logger.warn('Failed to create user document with Firebase Auth UID as ID', {
            firebaseAuthUid,
            firestoreUserId,
            error: docError.message,
          });
        }
        
        logger.info('Authenticated existing Firebase Auth account', {
          email,
          firebaseAuthUid,
          firestoreUserId,
        });
        
        return firebaseAuthUid;
      } catch (authError: any) {
        // Password might be wrong, or account might need password reset
        if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
          logger.warn('Password incorrect for Firebase Auth account', {
            email,
            firestoreUserId,
            errorCode: authError.code,
          });
          
          // Send password reset email
          try {
            await firebaseSendPasswordResetEmail(auth, email);
            logger.info('Password reset email sent due to incorrect password', { email });
          } catch (resetError: any) {
            logger.error('Failed to send password reset email', resetError);
          }
          
          return null;
        }
        
        throw authError;
      }
    } else {
      // No Firebase Auth account exists - create one (lazy migration)
      if (!password) {
        // Generate a temporary password that user will need to reset
        // Use a secure random password that user can't guess
        password = `temp-${firestoreUserId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseAuthUid = userCredential.user.uid;
        
        // Link Firebase Auth UID to Firestore user document
        await updateUser(firestoreUserId, { firebaseAuthUid });
        
        // Also create user document with ID = Firebase Auth UID (for Firestore rules)
        try {
          const originalUser = await getUser(firestoreUserId);
          
          if (originalUser) {
            const authUidDocRef = doc(db, 'users', firebaseAuthUid);
            await setDoc(authUidDocRef, {
              ...originalUser,
              id: firebaseAuthUid, // Use Firebase Auth UID as ID
              firebaseAuthUid: firebaseAuthUid,
              originalFirestoreUserId: firestoreUserId,
            }, { merge: true });
          }
        } catch (docError: any) {
          // Log but don't fail - the original document update already succeeded
          logger.warn('Failed to create user document with Firebase Auth UID as ID', {
            firebaseAuthUid,
            firestoreUserId,
            error: docError.message,
          });
        }
        
        logger.info('Created Firebase Auth account for existing Firestore user (lazy migration)', {
          email,
          firebaseAuthUid,
          firestoreUserId,
        });
        
        // If we used a temporary password, send password reset email
        if (password.startsWith('temp-')) {
          try {
            await firebaseSendPasswordResetEmail(auth, email);
            logger.info('Password reset email sent for newly migrated user', { email });
          } catch (resetError: any) {
            logger.error('Failed to send password reset email after migration', resetError);
          }
        }
        
        return firebaseAuthUid;
      } catch (createError: any) {
        logger.error('Failed to create Firebase Auth account', {
          email,
          firestoreUserId,
          error: createError,
        });
        
        // If email already exists (race condition), try to sign in instead
        if (createError.code === 'auth/email-already-in-use') {
          logger.info('Email already in use, attempting to sign in instead', { email });
          if (password && !password.startsWith('temp-')) {
            try {
              const userCredential = await signInWithEmailAndPassword(auth, email, password);
              const firebaseAuthUid = userCredential.user.uid;
              await updateUser(firestoreUserId, { firebaseAuthUid });
              return firebaseAuthUid;
            } catch (signInError) {
              logger.error('Failed to sign in after email-already-in-use error', signInError);
            }
          }
        }
        
        return null;
      }
    }
  } catch (error: any) {
    logger.error('Error ensuring Firebase Auth account', {
      email,
      firestoreUserId,
      error,
    });
    return null;
  }
};

/**
 * Creates a Firebase Auth account for a new user during signup
 * 
 * @param email - User's email address
 * @param password - User's password
 * @param firestoreUserId - The Firestore user document ID
 * @returns Firebase Auth UID if successful, null if failed
 */
export const createFirebaseAuthAccount = async (
  email: string,
  password: string,
  firestoreUserId: string
): Promise<string | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseAuthUid = userCredential.user.uid;
    
    // Verify user is authenticated (createUserWithEmailAndPassword automatically signs them in)
    if (auth.currentUser?.uid !== firebaseAuthUid) {
      logger.warn('User created but not authenticated', {
        email,
        firebaseAuthUid,
        currentUserUid: auth.currentUser?.uid,
      });
    }
    
    // Link Firebase Auth UID to Firestore user document
    await updateUser(firestoreUserId, { firebaseAuthUid });
    
    // Also create user document with ID = Firebase Auth UID (for Firestore rules)
    try {
      const originalUser = await getUser(firestoreUserId);
      if (originalUser) {
        const authUidDocRef = doc(db, 'users', firebaseAuthUid);
        await setDoc(authUidDocRef, {
          ...originalUser,
          id: firebaseAuthUid,
          firebaseAuthUid: firebaseAuthUid,
          originalFirestoreUserId: firestoreUserId,
        }, { merge: true });
      }
    } catch (docError: any) {
      // Log but don't fail - the original document update already succeeded
      logger.warn('Failed to create user document with Firebase Auth UID as ID', {
        firebaseAuthUid,
        firestoreUserId,
        error: docError.message,
      });
    }
    
    logger.info('Created Firebase Auth account for new user', {
      email,
      firebaseAuthUid,
      firestoreUserId,
      authenticated: auth.currentUser?.uid === firebaseAuthUid,
    });
    
    return firebaseAuthUid;
  } catch (error: any) {
    logger.error('Failed to create Firebase Auth account for new user', {
      email,
      firestoreUserId,
      error,
    });
    
    // If email already exists, this might be a migration case
    if (error.code === 'auth/email-already-in-use') {
      logger.info('Email already in use, attempting lazy migration', { email });
      return await ensureFirebaseAuthAccount(email, password, firestoreUserId);
    }
    
    return null;
  }
};
