import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Role } from '../../types';
import { getErrorMessage } from '../../utils/errors';

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
    // Fail fast with clear error message if credentials are missing
    const missingVars: string[] = [];
    if (!serviceAccount.projectId) missingVars.push('FIREBASE_PROJECT_ID');
    if (!serviceAccount.clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
    if (!serviceAccount.privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');
    
    throw new Error(
      `Firebase Admin SDK initialization failed: Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

// Verify Firebase is initialized before getting Firestore
if (!getApps().length) {
  throw new Error('Firebase Admin SDK was not initialized. Cannot access Firestore.');
}

const db = getFirestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      googleId, 
      email, 
      name, 
      picture, 
      organizationCode, 
      invitationToken, 
      isNewOrg, 
      orgName, 
      role,
      // Explicitly reject impersonation-related parameters to prevent confusion with invitation tokens
      isImpersonating,
      originalOperatorId,
      originalOrganizationId,
      impersonateUserId,
    } = req.body;

    // Security: Explicitly reject any impersonation-related parameters
    // Impersonation is a client-side feature only and should never be sent to backend
    if (isImpersonating || originalOperatorId || originalOrganizationId || impersonateUserId) {
      return res.status(400).json({ 
        error: 'Impersonation parameters are not allowed in authentication requests. Impersonation is a client-side feature only.' 
      });
    }

    if (!googleId || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If joining existing organization via invitation token (preferred)
    if (invitationToken) {
      // Security: Ensure invitation tokens are ONLY used for actual invitations
      // Reject if token format looks suspicious (e.g., user IDs that might be confused with impersonation)
      if (invitationToken.length < 20) {
        return res.status(400).json({ 
          error: 'Invalid invitation token format. Invitation tokens must be at least 20 characters long.' 
        });
      }

      // Look up invitation by token
      const invitationSnapshot = await db.collection('invitations')
        .where('token', '==', invitationToken)
        .where('status', '==', 'Pending')
        .limit(1)
        .get();

      if (invitationSnapshot.empty) {
        return res.status(404).json({ error: 'Invalid or expired invitation' });
      }

      const invitationDoc = invitationSnapshot.docs[0];
      const invitationData = invitationDoc.data();

      // Check expiration
      if (invitationData.expiresAt) {
        const expiresAt = invitationData.expiresAt.toDate ? invitationData.expiresAt.toDate() : new Date(invitationData.expiresAt);
        if (expiresAt < new Date()) {
          await invitationDoc.ref.update({ status: 'Expired' });
          return res.status(400).json({ error: 'Invitation has expired' });
        }
      }

      // Verify email matches invitation
      if (invitationData.email && invitationData.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ 
          error: `This invitation is for ${invitationData.email}. Please sign in with that email address.` 
        });
      }

      const organizationId = invitationData.organizationId;
      const invitationRole = invitationData.role || role || Role.MENTEE;

      // Get organization
      const orgDoc = await db.collection('organizations').doc(organizationId).get();
      if (!orgDoc.exists) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Check if user already exists by Google ID
      let userSnapshot = await db.collection('users')
        .where('googleId', '==', googleId)
        .where('organizationId', '==', organizationId)
        .limit(1)
        .get();

      let userDoc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot | null = userSnapshot.empty ? null : userSnapshot.docs[0];

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
          // Refresh the document snapshot to get updated data
          const updatedDoc = await userDoc.ref.get();
          userDoc = updatedDoc as FirebaseFirestore.QueryDocumentSnapshot;
        }

        // Mark invitation as accepted
        await invitationDoc.ref.update({ status: 'Accepted' });

        const userData = userDoc.data();
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
        // Create new user with role from invitation
        const userRole = invitationRole === Role.MENTOR ? Role.MENTOR : Role.MENTEE;
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

        // Mark invitation as accepted
        await invitationDoc.ref.update({ status: 'Accepted' });

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

      let userDoc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot | null = userSnapshot.empty ? null : userSnapshot.docs[0];

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
          // Refresh the document snapshot to get updated data
          const updatedDoc = await userDoc.ref.get();
          userDoc = updatedDoc as FirebaseFirestore.QueryDocumentSnapshot;
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

    return res.status(400).json({ error: 'Either invitationToken, organizationCode, or isNewOrg must be provided' });
  } catch (error: unknown) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error', message: getErrorMessage(error) });
  }
}
