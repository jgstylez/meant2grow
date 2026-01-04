import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('email', '==', normalizedEmail).limit(1).get();

    if (userQuery.empty) {
      // Don't reveal if email exists - return success anyway for security
      return res.status(200).json({ message: 'If an account exists, a password reset link has been sent.' });
    }

    const userDoc = userQuery.docs[0];
    const userId = userDoc.id;

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Store reset token in Firestore
    await db.collection('passwordResetTokens').doc(resetToken).set({
      userId,
      email: normalizedEmail,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
      used: false,
    });

    // Generate reset URL
    const appUrl = process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://meant2grow.com';
    // Use query params - the app will detect the token and route to reset-password
    const resetUrl = `${appUrl}/?reset-password&token=${resetToken}`;

    // Send password reset email via Firebase Function
    try {
      const functionUrl = process.env.FIREBASE_FUNCTIONS_URL || process.env.VITE_FUNCTIONS_URL || 'https://us-central1-meant2grow-dev.cloudfunctions.net';
      const userName = userDoc.data().name || 'User';
      
      await fetch(`${functionUrl}/sendPasswordResetEmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          resetUrl,
          userName,
        }),
      }).catch((emailError) => {
        console.error('Failed to send password reset email via function:', emailError);
        // Log for development/debugging
        console.log(`Password reset URL for ${normalizedEmail}: ${resetUrl}`);
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Log for development/debugging
      console.log(`Password reset URL for ${normalizedEmail}: ${resetUrl}`);
    }

    // Return success (don't reveal if email exists)
    return res.status(200).json({ message: 'If an account exists, a password reset link has been sent.' });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
