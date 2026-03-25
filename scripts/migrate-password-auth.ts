/**
 * Migration Script: Identify Users Needing Password Authentication Migration
 * 
 * This script identifies users that were created before Firebase Auth was added
 * and may need to migrate their authentication to Firebase Auth.
 * 
 * Usage:
 *   npm run migrate:password-auth [-- --dry-run] [-- --send-reset-emails]
 *   OR
 *   npx ts-node --esm scripts/migrate-password-auth.ts [--dry-run] [--send-reset-emails]
 * 
 * Options:
 *   --dry-run: Only report findings without making changes
 *   --send-reset-emails: Send password reset emails to users needing migration
 */

import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (!getApps().length) {
  // Try to use service account key file if it exists (same pattern as create-platform-operator.ts)
  const prodServiceAccountPath = resolve(__dirname, '../meant2grow-prod-0587fbfd09ba.json');
  const devServiceAccountPath = resolve(__dirname, '../meant2grow-dev-dfcfbc9ebeaa.json');
  
  let serviceAccountPath: string | null = null;
  let projectId = 'meant2grow-prod';
  
  // Check if production service account exists
  try {
    readFileSync(prodServiceAccountPath, 'utf8');
    serviceAccountPath = prodServiceAccountPath;
    projectId = 'meant2grow-prod';
  } catch {
    // Fall back to dev service account
    try {
      readFileSync(devServiceAccountPath, 'utf8');
      serviceAccountPath = devServiceAccountPath;
      projectId = 'meant2grow-dev';
    } catch {
      // Neither exists, will try environment variables or default credentials
    }
  }
  
  if (serviceAccountPath) {
    try {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId,
      });
      console.log(`✅ Initialized Firebase Admin with service account (${projectId})`);
    } catch (fileError: any) {
      console.error('Failed to initialize with service account file:', fileError.message);
      // Fallback to environment variables
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID || projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      if (serviceAccount.clientEmail && serviceAccount.privateKey) {
        initializeApp({
          credential: cert(serviceAccount as any),
        });
        console.log('✅ Initialized Firebase Admin with environment variables');
      } else {
        // Last resort: try default credentials
        try {
          initializeApp({
            credential: applicationDefault(),
            projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId,
          });
          console.log('✅ Initialized Firebase Admin with default credentials');
        } catch {
          console.error('❌ Failed to initialize Firebase Admin:');
          console.error('   Please ensure you have either:');
          console.error('   1. A service account JSON file (meant2grow-dev-*.json or meant2grow-prod-*.json)');
          console.error('   2. Environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
          console.error('   3. Default credentials configured (gcloud auth application-default login)');
          process.exit(1);
        }
      }
    }
  } else {
    // No service account file, try environment variables
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'meant2grow-dev',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (serviceAccount.clientEmail && serviceAccount.privateKey) {
      initializeApp({
        credential: cert(serviceAccount as any),
      });
      console.log('✅ Initialized Firebase Admin with environment variables');
    } else {
      // Try default credentials
      try {
        initializeApp({
          credential: applicationDefault(),
          projectId: serviceAccount.projectId,
        });
        console.log('✅ Initialized Firebase Admin with default credentials');
      } catch {
        console.error('❌ Failed to initialize Firebase Admin:');
        console.error('   Please ensure you have either:');
        console.error('   1. A service account JSON file (meant2grow-dev-*.json or meant2grow-prod-*.json)');
        console.error('   2. Environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        console.error('   3. Default credentials configured (gcloud auth application-default login)');
        process.exit(1);
      }
    }
  }
}

const db = getFirestore();
const auth = getAuth();

interface MigrationReport {
  totalUsers: number;
  usersWithPasswordHash: number;
  usersWithoutFirebaseAuth: number;
  usersNeedingMigration: number;
  usersAlreadyMigrated: number;
  usersWithBoth: number;
  errors: string[];
  usersNeedingMigrationList: Array<{
    userId: string;
    email: string;
    hasPasswordHash: boolean;
    hasFirebaseAuthUid: boolean;
    firebaseAuthUid?: string;
  }>;
}

async function checkFirebaseAuthUser(email: string): Promise<string | null> {
  try {
    const user = await auth.getUserByEmail(email);
    return user.uid;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    throw error;
  }
}

async function generateMigrationReport(_dryRun: boolean, _sendResetEmails: boolean): Promise<MigrationReport> {
  const report: MigrationReport = {
    totalUsers: 0,
    usersWithPasswordHash: 0,
    usersWithoutFirebaseAuth: 0,
    usersNeedingMigration: 0,
    usersAlreadyMigrated: 0,
    usersWithBoth: 0,
    errors: [],
    usersNeedingMigrationList: [],
  };

  try {
    console.log('🔍 Scanning users collection...\n');
    
    const usersSnapshot = await db.collection('users').get();
    report.totalUsers = usersSnapshot.size;

    console.log(`Found ${report.totalUsers} total users\n`);

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const email = userData.email;
      const hasPasswordHash = !!userData.passwordHash;
      const hasFirebaseAuthUid = !!userData.firebaseAuthUid;

      if (!email) {
        report.errors.push(`User ${userId} has no email address`);
        continue;
      }

      // Count users with passwordHash
      if (hasPasswordHash) {
        report.usersWithPasswordHash++;
      }

      // Check if user has Firebase Auth account
      let firebaseAuthUid: string | null = null;
      if (hasFirebaseAuthUid) {
        firebaseAuthUid = userData.firebaseAuthUid;
        // Verify the Firebase Auth account actually exists
        try {
          await auth.getUser(firebaseAuthUid);
          report.usersAlreadyMigrated++;
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            // firebaseAuthUid points to non-existent account
            report.usersNeedingMigration++;
            report.usersNeedingMigrationList.push({
              userId,
              email,
              hasPasswordHash,
              hasFirebaseAuthUid: false, // Invalid UID
              firebaseAuthUid: undefined,
            });
          }
        }
      } else {
        // Check if Firebase Auth account exists by email
        try {
          firebaseAuthUid = await checkFirebaseAuthUser(email);
          if (firebaseAuthUid) {
            // User has Firebase Auth account but not linked in Firestore
            report.usersNeedingMigration++;
            report.usersNeedingMigrationList.push({
              userId,
              email,
              hasPasswordHash,
              hasFirebaseAuthUid: false,
              firebaseAuthUid,
            });
          } else {
            // No Firebase Auth account at all
            report.usersWithoutFirebaseAuth++;
            if (hasPasswordHash) {
              // User has passwordHash but no Firebase Auth - needs migration
              report.usersNeedingMigration++;
              report.usersNeedingMigrationList.push({
                userId,
                email,
                hasPasswordHash: true,
                hasFirebaseAuthUid: false,
              });
            }
          }
        } catch (error: any) {
          report.errors.push(`Error checking Firebase Auth for ${email}: ${error.message}`);
        }
      }

      // Count users with both (legacy state)
      if (hasPasswordHash && hasFirebaseAuthUid) {
        report.usersWithBoth++;
      }
    }

    return report;
  } catch (error: any) {
    report.errors.push(`Fatal error: ${error.message}`);
    return report;
  }
}

async function sendPasswordResetEmails(users: MigrationReport['usersNeedingMigrationList']) {
  console.log('\n📧 Sending password reset emails...\n');
  
  // Note: This would need to call your forgot-password API endpoint
  // For now, we'll just log what would be sent
  for (const user of users) {
    if (user.email) {
      console.log(`  Would send reset email to: ${user.email}`);
      // In production, you would call:
      // await fetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: user.email }) });
    }
  }
}

function printReport(report: MigrationReport) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION REPORT');
  console.log('='.repeat(60) + '\n');

  console.log(`Total Users: ${report.totalUsers}`);
  console.log(`Users with passwordHash: ${report.usersWithPasswordHash}`);
  console.log(`Users without Firebase Auth: ${report.usersWithoutFirebaseAuth}`);
  console.log(`Users needing migration: ${report.usersNeedingMigration}`);
  console.log(`Users already migrated: ${report.usersAlreadyMigrated}`);
  console.log(`Users with both passwordHash and firebaseAuthUid: ${report.usersWithBoth}`);

  if (report.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${report.errors.length}`);
    report.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  if (report.usersNeedingMigrationList.length > 0) {
    console.log(`\n👥 Users Needing Migration (${report.usersNeedingMigrationList.length}):`);
    console.log('-'.repeat(60));
    report.usersNeedingMigrationList.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.email} (${user.userId})`);
      console.log(`   - Has passwordHash: ${user.hasPasswordHash ? 'Yes' : 'No'}`);
      console.log(`   - Has firebaseAuthUid: ${user.hasFirebaseAuthUid ? 'Yes' : 'No'}`);
      if (user.firebaseAuthUid) {
        console.log(`   - Firebase Auth UID: ${user.firebaseAuthUid}`);
      }
      console.log(`   - Action: User needs to reset password to create Firebase Auth account`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const sendResetEmails = args.includes('--send-reset-emails');

  if (dryRun) {
    console.log('🔍 Running in DRY-RUN mode (no changes will be made)\n');
  }

  try {
    const report = await generateMigrationReport(dryRun, sendResetEmails);
    printReport(report);

    if (sendResetEmails && !dryRun && report.usersNeedingMigrationList.length > 0) {
      await sendPasswordResetEmails(report.usersNeedingMigrationList);
    } else if (sendResetEmails && dryRun) {
      console.log('\n⚠️  Cannot send emails in dry-run mode');
    }

    // Exit with error code if there are users needing migration
    if (report.usersNeedingMigration > 0) {
      console.log('⚠️  Some users need migration. See report above.');
      process.exit(1);
    } else {
      console.log('✅ All users are properly migrated!');
      process.exit(0);
    }
  } catch (error: any) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateMigrationReport, type MigrationReport };
