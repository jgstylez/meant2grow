/**
 * Script to check and optionally fix user role in Firestore
 * Usage: npx ts-node scripts/check-user-role.ts <userId>
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('❌ Missing Firebase credentials in .env.local');
    process.exit(1);
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  });
}

const db = getFirestore();

async function checkUserRole(userId?: string) {
  try {
    if (!userId) {
      console.log('❌ Usage: npx ts-node scripts/check-user-role.ts <userId>');
      process.exit(1);
    }

    console.log(`\n🔍 Checking user: ${userId}\n`);

    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.log('❌ User document not found in Firestore');
      console.log('\nPossible solutions:');
      console.log('1. User authenticated with Firebase Auth but document not created');
      console.log('2. Incorrect userId provided');
      console.log('\nTo find the userId, check localStorage in browser console:');
      console.log('   localStorage.getItem("userId")');
      return;
    }

    const userData = userDoc.data();
    console.log('✅ User document found\n');
    console.log('User data:');
    console.log('  Name:', userData?.name);
    console.log('  Email:', userData?.email);
    console.log('  Role:', userData?.role);
    console.log('  Organization ID:', userData?.organizationId);
    console.log('  Created:', userData?.createdAt?.toDate?.()?.toISOString() || userData?.createdAt);

    // Check if user is platform admin
    const isPlatformAdmin = 
      userData?.role === 'PLATFORM_ADMIN' ||
      userData?.role === 'PLATFORM_OPERATOR' ||
      userData?.organizationId === 'platform';

    console.log('\n📊 Permission check:');
    console.log('  Is Platform Admin:', isPlatformAdmin ? '✅ Yes' : '❌ No');

    if (!isPlatformAdmin) {
      console.log('\n⚠️  This user does not have platform admin permissions');
      console.log('\nTo fix, you can either:');
      console.log('1. Update the role to PLATFORM_ADMIN:');
      console.log(`   firebase firestore:update users/${userId} role=PLATFORM_ADMIN`);
      console.log('2. Set organizationId to "platform":');
      console.log(`   firebase firestore:update users/${userId} organizationId=platform`);
      console.log('\nOr run this script with --fix flag:');
      console.log(`   npx ts-node scripts/check-user-role.ts ${userId} --fix`);
    }

    // Check for --fix flag
    if (process.argv.includes('--fix') && !isPlatformAdmin) {
      console.log('\n🔧 Updating user role to PLATFORM_ADMIN...');
      await db.collection('users').doc(userId).update({
        role: 'PLATFORM_ADMIN',
      });
      console.log('✅ User role updated successfully');
      console.log('\nPlease refresh your browser to see the changes.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get userId from command line
const userId = process.argv[2];
checkUserRole(userId).then(() => process.exit(0));
