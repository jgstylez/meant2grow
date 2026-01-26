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
    // First, check if user already has a Firebase Auth UID in Firestore
    // If they do, we can skip fetchSignInMethodsForEmail (which can fail with continue_uri errors)
    // and go straight to signing in
    const userDoc = await getUser(firestoreUserId);
    if (userDoc?.firebaseAuthUid && password) {
      // User already has Firebase Auth account - try to sign in directly
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseAuthUid = userCredential.user.uid;
        
        // Verify the UID matches (in case it changed somehow)
        if (firebaseAuthUid !== userDoc.firebaseAuthUid) {
          await updateUser(firestoreUserId, { firebaseAuthUid });
        }
        
        logger.info('Authenticated existing Firebase Auth account (skipped fetchSignInMethodsForEmail)', {
          email,
          firebaseAuthUid,
          firestoreUserId,
        });
        
        return firebaseAuthUid;
      } catch (signInError: any) {
        // Password might be wrong
        if (signInError.code === 'auth/wrong-password' || signInError.code === 'auth/invalid-credential') {
          logger.warn('Password incorrect for existing Firebase Auth account', {
            email,
            firestoreUserId,
            errorCode: signInError.code,
          });
          return null;
        }
        // For other errors, fall through to the normal flow below
        logger.warn('Sign-in failed for existing account, falling back to normal flow', {
          email,
          firestoreUserId,
          errorCode: signInError.code,
        });
      }
    }
    
    // Check if Firebase Auth account exists for this email
    // If email/password auth is not enabled, this will fail with auth/configuration-not-found
    let signInMethods: string[] = [];
    try {
      signInMethods = await fetchSignInMethodsForEmail(auth, email);
    } catch (checkError: any) {
      // Handle continue_uri domain error - domain not authorized in Firebase Console
      if (checkError.code === 'auth/unauthorized-continue-uri' || 
          checkError.message?.includes('continue_uri domain') ||
          checkError.message?.includes('belongs to a different Firebase Hosting project')) {
        logger.error('Firebase Auth domain not authorized. Add the current domain to Firebase Console authorized domains.', {
          email,
          firestoreUserId,
          errorCode: checkError.code,
          errorMessage: checkError.message,
          currentDomain: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
          fixUrl: `https://console.firebase.google.com/project/${auth.app.options.projectId}/authentication/settings`,
        });
        // Return null to indicate failure - user needs to configure authorized domains
        return null;
      }
      
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
              // Log detailed error information
              logger.error('Failed to sign in after email-already-in-use', {
                email,
                firestoreUserId,
                errorCode: signInError.code,
                errorMessage: signInError.message,
                error: signInError,
              });
              
              // If password is wrong or invalid, send password reset email
              if (signInError.code === 'auth/wrong-password' || 
                  signInError.code === 'auth/invalid-credential' ||
                  signInError.code === 'auth/user-disabled' ||
                  signInError.code === 'auth/too-many-requests') {
                logger.warn('Password/auth issue when signing in after email-already-in-use', {
                  email,
                  firestoreUserId,
                  errorCode: signInError.code,
                });
                
                try {
                  await firebaseSendPasswordResetEmail(auth, email);
                  logger.info('Password reset email sent due to authentication issue', { email });
                } catch (resetError: any) {
                  logger.error('Failed to send password reset email', resetError);
                }
              } else {
                // For other errors, still try to send password reset email as a fallback
                logger.warn('Unexpected sign-in error, attempting to send password reset email', {
                  email,
                  errorCode: signInError.code,
                });
                try {
                  await firebaseSendPasswordResetEmail(auth, email);
                  logger.info('Password reset email sent as fallback', { email });
                } catch (resetError: any) {
                  logger.error('Failed to send password reset email', resetError);
                }
              }
              
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
              
              // Also create/update user document with ID = Firebase Auth UID (for Firestore rules)
              try {
                const originalUser = await getUser(firestoreUserId);
                if (originalUser) {
                  const authUidDocRef = doc(db, 'users', firebaseAuthUid);
                  const authUidDoc = await getDoc(authUidDocRef);
                  
                  if (!authUidDoc.exists()) {
                    await setDoc(authUidDocRef, {
                      ...originalUser,
                      id: firebaseAuthUid,
                      firebaseAuthUid: firebaseAuthUid,
                      originalFirestoreUserId: firestoreUserId,
                    }, { merge: true });
                  } else {
                    await setDoc(authUidDocRef, {
                      firebaseAuthUid: firebaseAuthUid,
                      originalFirestoreUserId: firestoreUserId,
                    }, { merge: true });
                  }
                }
              } catch (docError: any) {
                logger.warn('Failed to create user document with Firebase Auth UID as ID', {
                  firebaseAuthUid,
                  firestoreUserId,
                  error: docError.message,
                });
              }
              
              logger.info('Signed in to existing Firebase Auth account after email-already-in-use', {
                email,
                firebaseAuthUid,
                firestoreUserId,
              });
              return firebaseAuthUid;
            } catch (signInError: any) {
              // Log detailed error information
              logger.error('Failed to sign in after email-already-in-use error', {
                email,
                firestoreUserId,
                errorCode: signInError.code,
                errorMessage: signInError.message,
                error: signInError,
              });
              
              // If password is wrong or invalid, send password reset email
              if (signInError.code === 'auth/wrong-password' || 
                  signInError.code === 'auth/invalid-credential' ||
                  signInError.code === 'auth/user-disabled' ||
                  signInError.code === 'auth/too-many-requests') {
                logger.warn('Password/auth issue when signing in after email-already-in-use', {
                  email,
                  firestoreUserId,
                  errorCode: signInError.code,
                });
                
                try {
                  await firebaseSendPasswordResetEmail(auth, email);
                  logger.info('Password reset email sent due to authentication issue', { email });
                } catch (resetError: any) {
                  logger.error('Failed to send password reset email', resetError);
                }
              } else {
                // For other errors, still try to send password reset email as a fallback
                logger.warn('Unexpected sign-in error, attempting to send password reset email', {
                  email,
                  errorCode: signInError.code,
                });
                try {
                  await firebaseSendPasswordResetEmail(auth, email);
                  logger.info('Password reset email sent as fallback', { email });
                } catch (resetError: any) {
                  logger.error('Failed to send password reset email', resetError);
                }
              }
              
              // Return null to indicate failure
              return null;
            }
          } else {
            // No password or temporary password - send password reset email
            logger.info('Email already in use but no valid password provided, sending password reset email', { email });
            try {
              await firebaseSendPasswordResetEmail(auth, email);
              logger.info('Password reset email sent', { email });
            } catch (resetError: any) {
              logger.error('Failed to send password reset email', resetError);
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
      const result = await ensureFirebaseAuthAccount(email, password, firestoreUserId);
      
      // If ensureFirebaseAuthAccount failed, log helpful message
      if (!result) {
        logger.warn('Failed to link existing Firebase Auth account. The account exists but may not be linked to Firestore user.', {
          email,
          firestoreUserId,
          suggestion: 'Run: npm run link-firebase-auth-account <email> or npm run set-platform-operator-password <email> <password>',
        });
      }
      
      return result;
    }
    
    return null;
  }
};
