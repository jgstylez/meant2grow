import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Role } from '../../types';

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
  }
}

const db = getFirestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { googleId, email, name, picture, organizationCode, isNewOrg, orgName, role } = req.body;

    if (!googleId || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If creating new organization
    if (isNewOrg && orgName) {
      // Generate organization code
      const generateOrgCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      const organizationCode = generateOrgCode();

      // Create organization
      const orgRef = db.collection('organizations').doc();
      await orgRef.set({
        name: orgName,
        domain: undefined,
        logo: null,
        accentColor: '#10b981',
        programSettings: {
          programName: orgName,
          logo: null,
          accentColor: '#10b981',
          introText: 'Welcome to our mentorship program!',
          fields: [],
        },
        subscriptionTier: 'free',
        organizationCode,
        createdAt: Timestamp.now(),
      });

      const organizationId = orgRef.id;

      // Create admin user
      const userRef = db.collection('users').doc();
      await userRef.set({
        organizationId,
        name,
        email,
        role: Role.ADMIN,
        avatar: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        title: 'Administrator',
        company: orgName,
        skills: [],
        bio: '',
        googleId,
        createdAt: Timestamp.now(),
      });

      const userId = userRef.id;

      return res.json({
        user: {
          id: userId,
          organizationId,
          name,
          email,
          role: Role.ADMIN,
          avatar: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
          title: 'Administrator',
          company: orgName,
          skills: [],
          bio: '',
          googleId,
          createdAt: new Date().toISOString(),
        },
        organizationId,
        token: 'mock-token', // In production, generate JWT token
      });
    }

    // If joining existing organization
    if (organizationCode) {
      const orgSnapshot = await db.collection('organizations')
        .where('organizationCode', '==', organizationCode.toUpperCase())
        .limit(1)
        .get();

      if (orgSnapshot.empty) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const orgDoc = orgSnapshot.docs[0];
      const organizationId = orgDoc.id;

      // Check if user already exists by Google ID
      let userSnapshot = await db.collection('users')
        .where('googleId', '==', googleId)
        .where('organizationId', '==', organizationId)
        .limit(1)
        .get();

      let userDoc = userSnapshot.empty ? null : userSnapshot.docs[0];

      // If not found by Google ID, check by email
      if (!userDoc) {
        userSnapshot = await db.collection('users')
          .where('email', '==', email)
          .where('organizationId', '==', organizationId)
          .limit(1)
          .get();
        userDoc = userSnapshot.empty ? null : userSnapshot.docs[0];
      }

      if (userDoc) {
        // Update existing user with Google ID if not set
        if (!userDoc.data().googleId) {
          await userDoc.ref.update({ googleId });
        }

        const userData = userDoc.data();
        // Properly structure the response with user object
        return res.json({
          user: {
            id: userDoc.id,
            organizationId: userData.organizationId,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            avatar: userData.avatar,
            title: userData.title || '',
            company: userData.company || '',
            skills: userData.skills || [],
            bio: userData.bio || '',
            googleId: userData.googleId,
            createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : (userData.createdAt || new Date().toISOString()),
          },
          organizationId,
          token: 'mock-token',
        });
      } else {
        // Create new user (use role from request, or default to MENTEE)
        const userRole = role === Role.MENTOR ? Role.MENTOR : Role.MENTEE;
        const userRef = db.collection('users').doc();
        await userRef.set({
          organizationId,
          name,
          email,
          role: userRole,
          avatar: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
          title: '',
          company: '',
          skills: [],
          bio: '',
          googleId,
          createdAt: Timestamp.now(),
        });

        const userData = {
          id: userRef.id,
          organizationId,
          name,
          email,
          role: userRole,
          avatar: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
          title: '',
          company: '',
          skills: [],
          bio: '',
          googleId,
          createdAt: new Date().toISOString(),
        };

        return res.json({
          user: userData,
          organizationId,
          token: 'mock-token',
        });
      }
    }

    return res.status(400).json({ error: 'Either organizationCode or isNewOrg must be provided' });
  } catch (error: any) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
