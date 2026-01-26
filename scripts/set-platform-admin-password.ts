/**
 * Script to set password for platform administrator
 * Usage: npm run set-platform-admin-password <email> <password>
 * Example: npm run set-platform-admin-password admin@meant2grow.com "SecurePassword123"
 * 
 * This script:
 * 1. Finds the platform admin user by email
 * 2. Creates or updates their Firebase Auth account with the provided password
 * 3. Links the firebaseAuthUid to the Firestore user document
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
// Default to sandbox (dev) for safety - use 'firebase use production' before running for production
let detectedProjectId = "meant2grow-dev";

// Try to read Firebase CLI active project from .firebaserc
function getFirebaseActiveProject(): string | null {
  try {
    const firebasercPath = resolve(__dirname, "../.firebaserc");
    const firebasercContent = readFileSync(firebasercPath, "utf8");
    const firebaserc = JSON.parse(firebasercContent);
    
    // Check if there's a .firebase directory with active project info
    try {
      const firebaseActivePath = resolve(__dirname, "../.firebase/activeProjects");
      const activeProjects = JSON.parse(readFileSync(firebaseActivePath, "utf8"));
      if (activeProjects && activeProjects[process.cwd()]) {
        const activeProjectId = activeProjects[process.cwd()];
        // Map project ID to our known projects
        if (activeProjectId === "meant2grow-prod") return "meant2grow-prod";
        if (activeProjectId === "meant2grow-dev") return "meant2grow-dev";
      }
    } catch {
      // .firebase/activeProjects doesn't exist, use default from .firebaserc
    }
    
    // Use default project from .firebaserc
    if (firebaserc.projects && firebaserc.projects.default) {
      return firebaserc.projects.default;
    }
  } catch {
    // .firebaserc doesn't exist or can't be read
  }
  return null;
}

// Initialize Firebase Admin
if (getApps().length === 0) {
  // Try to use service account key file if it exists
  // Default to sandbox (dev) first, then fall back to production
  const prodServiceAccountPath = resolve(
    __dirname,
    "../meant2grow-prod-0587fbfd09ba.json"
  );
  const devServiceAccountPath = resolve(
    __dirname,
    "../meant2grow-dev-dfcfbc9ebeaa.json"
  );
  
  let serviceAccountPath: string | null = null;
  let projectId = "meant2grow-dev"; // Default to sandbox
  
  // Check Firebase CLI active project first
  const activeProject = getFirebaseActiveProject();
  if (activeProject) {
    projectId = activeProject;
    detectedProjectId = activeProject;
    console.log(`📋 Detected Firebase CLI active project: ${activeProject}`);
  }
  
  // Try dev (sandbox) service account first (default)
  if (projectId === "meant2grow-dev" || !activeProject) {
    try {
      readFileSync(devServiceAccountPath, "utf8");
      serviceAccountPath = devServiceAccountPath;
      projectId = "meant2grow-dev";
      detectedProjectId = "meant2grow-dev";
    } catch {
      // Dev service account doesn't exist, try production
      try {
        readFileSync(prodServiceAccountPath, "utf8");
        serviceAccountPath = prodServiceAccountPath;
        projectId = "meant2grow-prod";
        detectedProjectId = "meant2grow-prod";
      } catch {
        // Neither exists, will use default credentials
      }
    }
  } else {
    // Active project is production, try production service account
    try {
      readFileSync(prodServiceAccountPath, "utf8");
      serviceAccountPath = prodServiceAccountPath;
      projectId = "meant2grow-prod";
      detectedProjectId = "meant2grow-prod";
    } catch {
      // Production service account doesn't exist, fall back to dev
      try {
        readFileSync(devServiceAccountPath, "utf8");
        serviceAccountPath = devServiceAccountPath;
        projectId = "meant2grow-dev";
        detectedProjectId = "meant2grow-dev";
      } catch {
        // Neither exists, will use default credentials
      }
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
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId || "meant2grow-dev",
      });
      console.log("✅ Initialized Firebase Admin with default credentials");
    } catch (defaultError) {
      initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId || "meant2grow-dev",
      });
      console.log("✅ Initialized Firebase Admin (using environment variables)");
    }
  }
}

const db = getFirestore();
const auth = getAuth();

// Password validation
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  return { valid: true };
}

async function setPlatformAdminPassword(email: string, password: string) {
  console.log(`🔐 Setting password for platform administrator...\n`);
  console.log(`  Email: ${email}\n`);

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    console.error(`❌ Password validation failed: ${passwordValidation.error}`);
    process.exit(1);
  }

  try {
    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Find platform admin user in Firestore
    const usersSnapshot = await db
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error(`❌ User with email ${email} not found in Firestore.`);
      console.error(`   Please create the platform admin user first using:`);
      console.error(`   npm run create:platform-operator ${email} "Platform Operator"`);
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Verify user is a platform admin
    const userRole = userData.role;
    const isPlatformAdmin = userRole === "PLATFORM_ADMIN" || userRole === "PLATFORM_OPERATOR";
    
    if (!isPlatformAdmin) {
      console.error(`❌ User ${email} is not a platform administrator.`);
      console.error(`   Current role: ${userRole}`);
      console.error(`   Expected role: PLATFORM_ADMIN or PLATFORM_OPERATOR`);
      process.exit(1);
    }

    console.log(`✅ Found platform admin user:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Name: ${userData.name || "N/A"}`);
    console.log(`   Role: ${userRole}`);
    console.log(`   Organization ID: ${userData.organizationId || "N/A"}\n`);

    // Check if Firebase Auth account already exists
    let firebaseAuthUid: string;
    let firebaseUser;

    try {
      if (userData.firebaseAuthUid) {
        // User already has firebaseAuthUid - update password
        console.log(`   Found existing Firebase Auth UID: ${userData.firebaseAuthUid}`);
        firebaseUser = await auth.getUser(userData.firebaseAuthUid);
        firebaseAuthUid = firebaseUser.uid;
        
        // Update password
        await auth.updateUser(firebaseAuthUid, {
          password: password,
          emailVerified: firebaseUser.emailVerified, // Preserve email verification status
        });
        console.log(`✅ Updated password for existing Firebase Auth account`);
      } else {
        // Try to find Firebase Auth account by email
        try {
          firebaseUser = await auth.getUserByEmail(normalizedEmail);
          firebaseAuthUid = firebaseUser.uid;
          console.log(`   Found existing Firebase Auth account by email`);
          
          // Update password
          await auth.updateUser(firebaseAuthUid, {
            password: password,
          });
          console.log(`✅ Updated password for existing Firebase Auth account`);
        } catch (emailError: any) {
          // User doesn't exist in Firebase Auth - create new account
          if (emailError.code === 'auth/user-not-found') {
            console.log(`   No Firebase Auth account found - creating new one...`);
            firebaseUser = await auth.createUser({
              email: normalizedEmail,
              password: password,
              emailVerified: false, // User will need to verify email
            });
            firebaseAuthUid = firebaseUser.uid;
            console.log(`✅ Created new Firebase Auth account`);
          } else {
            throw emailError;
          }
        }
      }

      // Update Firestore user document with firebaseAuthUid
      await db.collection("users").doc(userId).update({
        firebaseAuthUid: firebaseAuthUid,
      });

      console.log(`\n✅ Successfully set password for platform administrator!`);
      console.log(`   Firebase Auth UID: ${firebaseAuthUid}`);
      console.log(`   Email: ${normalizedEmail}`);
      console.log(`\n📝 The platform administrator can now sign in with:`);
      console.log(`   Email: ${normalizedEmail}`);
      console.log(`   Password: [the password you provided]`);
      console.log(`\n⚠️  Note: Email verification is set to ${firebaseUser.emailVerified ? 'verified' : 'unverified'}.`);
      if (!firebaseUser.emailVerified) {
        console.log(`   The user may need to verify their email address.`);
      }

    } catch (authError: any) {
      console.error(`❌ Firebase Auth error:`, authError.message);
      if (authError.code === 'auth/email-already-exists') {
        console.error(`   An account with this email already exists in Firebase Auth.`);
        console.error(`   Try using the forgot password feature to reset it.`);
      }
      process.exit(1);
    }

  } catch (error: unknown) {
    console.error("❌ Failed to set platform admin password:", getErrorMessage(error));
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("❌ Usage: npm run set-platform-admin-password <email> <password>");
  console.error('   Example: npm run set-platform-admin-password admin@meant2grow.com "SecurePassword123"');
  console.error('   Example (with special chars): npm run set-platform-admin-password admin@meant2grow.com \'!SecurePassword123\'');
  console.error("\n⚠️  Password requirements:");
  console.error("   - At least 8 characters long");
  console.error("   - Contains at least one lowercase letter");
  console.error("   - Contains at least one uppercase letter");
  console.error("   - Contains at least one number");
  console.error("\n💡 Tip: If your password contains special characters (especially !), use single quotes to prevent shell expansion");
  console.error("\n🌍 Environment: Defaults to sandbox (meant2grow-dev).");
  console.error("   To use production, run: firebase use production");
  console.error("   Then run this script again.");
  process.exit(1);
}

const [email, password] = args;

setPlatformAdminPassword(email, password)
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
