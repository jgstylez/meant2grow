import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin (server-side)
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    initializeApp({
      credential: cert(serviceAccount as any),
    });
  } else {
    const missingVars: string[] = [];
    if (!serviceAccount.projectId) missingVars.push('FIREBASE_PROJECT_ID');
    if (!serviceAccount.clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
    if (!serviceAccount.privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');
    
    throw new Error(
      `Firebase Admin SDK initialization failed: Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

const db = getFirestore();
const auth = getAuth();

// Password validation
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Get reset token from Firestore
    const tokenDoc = await db.collection('passwordResetTokens').doc(token).get();

    if (!tokenDoc.exists) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const tokenData = tokenDoc.data();
    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Check if token has been used
    if (tokenData.used === true) {
      return res.status(400).json({ error: 'This reset token has already been used' });
    }

    // Check if token has expired
    const expiresAt = tokenData.expiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    const userId = tokenData.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(400).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const userEmail = userData?.email;
    
    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Create or update Firebase Auth account with new password
    let firebaseAuthUid: string;
    
    try {
      // Check if Firebase Auth account already exists
      let firebaseUser;
      try {
        if (userData?.firebaseAuthUid) {
          // User already has Firebase Auth account - update password
          firebaseUser = await auth.getUser(userData.firebaseAuthUid);
          firebaseAuthUid = firebaseUser.uid;
          
          // Update password
          await auth.updateUser(firebaseAuthUid, {
            password: password,
            emailVerified: firebaseUser.emailVerified, // Preserve email verification status
          });
        } else {
          // Try to find user by email
          try {
            firebaseUser = await auth.getUserByEmail(userEmail);
            firebaseAuthUid = firebaseUser.uid;
            
            // Update password
            await auth.updateUser(firebaseAuthUid, {
              password: password,
            });
          } catch (emailError: any) {
            // User doesn't exist in Firebase Auth - create new account
            firebaseUser = await auth.createUser({
              email: userEmail,
              password: password,
              emailVerified: false, // User will need to verify email
            });
            firebaseAuthUid = firebaseUser.uid;
          }
        }
      } catch (authError: any) {
        console.error('Firebase Auth error:', authError);
        return res.status(500).json({ 
          error: 'Failed to update password in Firebase Auth', 
          message: authError.message 
        });
      }
      
      // Update Firestore user document with firebaseAuthUid and remove passwordHash if it exists
      const updateData: any = {
        firebaseAuthUid,
        passwordUpdatedAt: Timestamp.now(),
      };
      
      // Remove passwordHash field if it exists (migration cleanup)
      if (userData?.passwordHash) {
        updateData.passwordHash = FieldValue.delete();
      }
      
      await db.collection('users').doc(userId).update(updateData);
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      return res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }

    // Mark token as used
    await db.collection('passwordResetTokens').doc(token).update({
      used: true,
      usedAt: Timestamp.now(),
    });

    return res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error: any) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
