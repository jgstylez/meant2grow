/**
 * Script to update email for platform operator
 * Usage: npm run update-platform-operator-email <old-email> <new-email>
 * Example: npm run update-platform-operator-email old@meant2grow.com new@meant2grow.com
 * 
 * Note: "Platform Operator" is the preferred terminology. The role value stored in the database is `PLATFORM_OPERATOR`.
 * 
 * This script:
 * 1. Finds the platform operator user by old email in Firestore
 * 2. Updates their email in Firestore
 * 3. Updates their email in Firebase Auth (if they have a Firebase Auth account)
 * 4. Handles conflicts if the new email already exists
 */

import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

// Error handling utilities
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../.env.local") });

// Store the detected project ID at module level
let detectedProjectId = "meant2grow-prod";

// Initialize Firebase Admin
if (getApps().length === 0) {
  // Try to use service account key file if it exists
  const prodServiceAccountPath = resolve(
    __dirname,
    "../meant2grow-prod-0587fbfd09ba.json"
  );
  const devServiceAccountPath = resolve(
    __dirname,
    "../meant2grow-dev-dfcfbc9ebeaa.json"
  );
  
  let serviceAccountPath: string | null = null;
  let projectId = "meant2grow-prod";
  
  // Check if production service account exists
  try {
    readFileSync(prodServiceAccountPath, "utf8");
    serviceAccountPath = prodServiceAccountPath;
    projectId = "meant2grow-prod";
    detectedProjectId = "meant2grow-prod";
  } catch {
    // Fall back to dev service account
    try {
      readFileSync(devServiceAccountPath, "utf8");
      serviceAccountPath = devServiceAccountPath;
      projectId = "meant2grow-dev";
      detectedProjectId = "meant2grow-dev";
    } catch {
      // Neither exists, will use default credentials
    }
  }
  
  if (serviceAccountPath) {
    try {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
      initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId,
      });
      const serviceAccountEmail =
        serviceAccount.client_email || serviceAccount.clientEmail;
      console.log("✅ Initialized Firebase Admin with service account");
      console.log(`   Service Account: ${serviceAccountEmail}`);
      console.log(`   Project: ${projectId}`);
    } catch (fileError) {
      // Fallback to default credentials
      try {
        initializeApp({
          credential: applicationDefault(),
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId,
        });
        console.log("✅ Initialized Firebase Admin with default credentials");
      } catch (defaultError) {
        initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId,
        });
        console.log("✅ Initialized Firebase Admin (using environment variables)");
      }
    }
  } else {
    // No service account file found, use default credentials
    try {
      initializeApp({
        credential: applicationDefault(),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || "meant2grow-prod",
      });
      console.log("✅ Initialized Firebase Admin with default credentials");
    } catch (defaultError) {
      initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || "meant2grow-prod",
      });
      console.log("✅ Initialized Firebase Admin (using environment variables)");
    }
  }
}

const db = getFirestore();
const auth = getAuth();

// Email validation
function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }
  return { valid: true };
}

async function updatePlatformOperatorEmail(oldEmail: string, newEmail: string) {
  console.log(`📧 Updating email for platform operator...\n`);
  console.log(`  Old Email: ${oldEmail}`);
  console.log(`  New Email: ${newEmail}\n`);

  // Validate emails
  const oldEmailValidation = validateEmail(oldEmail);
  if (!oldEmailValidation.valid) {
    console.error(`❌ Invalid old email format: ${oldEmailValidation.error}`);
    process.exit(1);
  }

  const newEmailValidation = validateEmail(newEmail);
  if (!newEmailValidation.valid) {
    console.error(`❌ Invalid new email format: ${newEmailValidation.error}`);
    process.exit(1);
  }

  // Normalize emails
  const normalizedOldEmail = oldEmail.trim().toLowerCase();
  const normalizedNewEmail = newEmail.trim().toLowerCase();

  if (normalizedOldEmail === normalizedNewEmail) {
    console.error(`❌ Old and new emails are the same.`);
    process.exit(1);
  }

  try {
    // Check if new email already exists in Firestore
    const newEmailCheckSnapshot = await db
      .collection("users")
      .where("email", "==", normalizedNewEmail)
      .limit(1)
      .get();

    if (!newEmailCheckSnapshot.empty) {
      const existingUser = newEmailCheckSnapshot.docs[0].data();
      console.error(`❌ Email ${normalizedNewEmail} already exists in Firestore.`);
      console.error(`   User ID: ${newEmailCheckSnapshot.docs[0].id}`);
      console.error(`   Name: ${existingUser.name || "N/A"}`);
      console.error(`   Role: ${existingUser.role || "N/A"}`);
      process.exit(1);
    }

    // Check if new email already exists in Firebase Auth
    try {
      const existingAuthUser = await auth.getUserByEmail(normalizedNewEmail);
      console.error(`❌ Email ${normalizedNewEmail} already exists in Firebase Auth.`);
      console.error(`   Firebase Auth UID: ${existingAuthUser.uid}`);
      process.exit(1);
    } catch (authError: any) {
      if (authError.code !== 'auth/user-not-found') {
        // Some other error occurred
        throw authError;
      }
      // User not found is expected - new email is available
    }

    // Find platform operator user in Firestore by old email
    const usersSnapshot = await db
      .collection("users")
      .where("email", "==", normalizedOldEmail)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error(`❌ User with email ${oldEmail} not found in Firestore.`);
      console.error(`   Please verify the old email address is correct.`);
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Verify user is a platform operator
    // Note: Role is stored as PLATFORM_OPERATOR in database (legacy: PLATFORM_ADMIN)
    const userRole = userData.role;
    const isPlatformOperator = userRole === "PLATFORM_OPERATOR" || userRole === "PLATFORM_ADMIN";
    
    if (!isPlatformOperator) {
      console.error(`❌ User ${oldEmail} is not a platform operator.`);
      console.error(`   Current role: ${userRole}`);
      console.error(`   Expected role: PLATFORM_OPERATOR or PLATFORM_ADMIN`);
      process.exit(1);
    }

    console.log(`✅ Found platform operator user:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Name: ${userData.name || "N/A"}`);
    console.log(`   Role: ${userRole}`);
    console.log(`   Organization ID: ${userData.organizationId || "N/A"}\n`);

    // Update email in Firestore
    console.log(`📝 Updating email in Firestore...`);
    await db.collection("users").doc(userId).update({
      email: normalizedNewEmail,
    });
    console.log(`✅ Updated email in Firestore`);

    // Update email in Firebase Auth if they have a Firebase Auth account
    if (userData.firebaseAuthUid) {
      console.log(`📝 Updating email in Firebase Auth...`);
      console.log(`   Firebase Auth UID: ${userData.firebaseAuthUid}`);
      
      try {
        const firebaseUser = await auth.getUser(userData.firebaseAuthUid);
        
        // Update email in Firebase Auth
        await auth.updateUser(userData.firebaseAuthUid, {
          email: normalizedNewEmail,
          emailVerified: false, // Reset email verification when email changes
        });
        
        console.log(`✅ Updated email in Firebase Auth`);
        console.log(`\n⚠️  Note: Email verification has been reset to false.`);
        console.log(`   The user will need to verify their new email address.`);
      } catch (authError: any) {
        console.error(`❌ Failed to update email in Firebase Auth:`, authError.message);
        console.error(`   The email was updated in Firestore, but Firebase Auth update failed.`);
        console.error(`   You may need to manually update Firebase Auth or create a new account.`);
        process.exit(1);
      }
    } else {
      // Try to find Firebase Auth account by old email
      try {
        const firebaseUser = await auth.getUserByEmail(normalizedOldEmail);
        console.log(`📝 Found Firebase Auth account by email, updating...`);
        console.log(`   Firebase Auth UID: ${firebaseUser.uid}`);
        
        // Update email in Firebase Auth
        await auth.updateUser(firebaseUser.uid, {
          email: normalizedNewEmail,
          emailVerified: false, // Reset email verification when email changes
        });
        
        // Update Firestore with firebaseAuthUid if it wasn't set
        await db.collection("users").doc(userId).update({
          firebaseAuthUid: firebaseUser.uid,
        });
        
        console.log(`✅ Updated email in Firebase Auth`);
        console.log(`✅ Linked Firebase Auth UID to Firestore user document`);
        console.log(`\n⚠️  Note: Email verification has been reset to false.`);
        console.log(`   The user will need to verify their new email address.`);
      } catch (emailError: any) {
        if (emailError.code === 'auth/user-not-found') {
          console.log(`ℹ️  No Firebase Auth account found for this user.`);
          console.log(`   Email was updated in Firestore only.`);
          console.log(`   If the user needs to sign in, they may need to use the password reset flow.`);
        } else {
          throw emailError;
        }
      }
    }

    console.log(`\n✅ Successfully updated email for platform operator!`);
    console.log(`   Old Email: ${normalizedOldEmail}`);
    console.log(`   New Email: ${normalizedNewEmail}`);
    console.log(`\n📝 The platform operator can now sign in with:`);
    console.log(`   Email: ${normalizedNewEmail}`);

  } catch (error: unknown) {
    console.error("❌ Failed to update platform operator email:", getErrorMessage(error));
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("❌ Usage: npm run update-platform-operator-email <old-email> <new-email>");
  console.error('   Example: npm run update-platform-operator-email old@meant2grow.com new@meant2grow.com');
  console.error("\n⚠️  This script will:");
  console.error("   - Update the email in Firestore");
  console.error("   - Update the email in Firebase Auth (if account exists)");
  console.error("   - Reset email verification status");
  console.error("   - Check for conflicts before making changes");
  process.exit(1);
}

const [oldEmail, newEmail] = args;

updatePlatformOperatorEmail(oldEmail, newEmail)
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
