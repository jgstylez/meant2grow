/**
 * Script to link an existing Firebase Auth account to a Firestore user document
 * Usage: npm run link-firebase-auth-account <email>
 * Example: npm run link-firebase-auth-account support@meant2grow.com
 * 
 * This script:
 * 1. Finds the Firestore user by email
 * 2. Finds the Firebase Auth account by email
 * 3. Links them by updating the firebaseAuthUid field in Firestore
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
    console.log(`📋 Detected Firebase CLI active project: ${activeProject}`);
  }
  
  // Try dev (sandbox) service account first (default)
  if (projectId === "meant2grow-dev" || !activeProject) {
    try {
      readFileSync(devServiceAccountPath, "utf8");
      serviceAccountPath = devServiceAccountPath;
      projectId = "meant2grow-dev";
    } catch {
      // Dev service account doesn't exist, try production
      try {
        readFileSync(prodServiceAccountPath, "utf8");
        serviceAccountPath = prodServiceAccountPath;
        projectId = "meant2grow-prod";
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
    } catch {
      // Production service account doesn't exist, fall back to dev
      try {
        readFileSync(devServiceAccountPath, "utf8");
        serviceAccountPath = devServiceAccountPath;
        projectId = "meant2grow-dev";
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
    } catch {
      // Fallback to default credentials
      try {
        initializeApp({
          credential: applicationDefault(),
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId,
        });
        console.log("✅ Initialized Firebase Admin with default credentials");
      } catch {
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
    } catch {
      initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId || "meant2grow-dev",
      });
      console.log("✅ Initialized Firebase Admin (using environment variables)");
    }
  }
}

const db = getFirestore();
const auth = getAuth();

async function linkFirebaseAuthAccount(email: string) {
  console.log(`🔗 Linking Firebase Auth account to Firestore user...\n`);
  console.log(`  Email: ${email}\n`);

  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Find Firestore user
    const usersSnapshot = await db
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error(`❌ User with email ${email} not found in Firestore.`);
      console.error(`   Please create the user first.`);
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    console.log(`✅ Found Firestore user:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Name: ${userData.name || "N/A"}`);
    console.log(`   Role: ${userData.role || "N/A"}`);
    console.log(`   Current firebaseAuthUid: ${userData.firebaseAuthUid || "Not set"}\n`);

    // Find Firebase Auth account
    let firebaseUser;
    try {
      firebaseUser = await auth.getUserByEmail(normalizedEmail);
      console.log(`✅ Found Firebase Auth account:`);
      console.log(`   Firebase Auth UID: ${firebaseUser.uid}`);
      console.log(`   Email Verified: ${firebaseUser.emailVerified}\n`);
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        console.error(`❌ Firebase Auth account not found for ${email}.`);
        console.error(`   The Firebase Auth account must exist before linking.`);
        console.error(`   You may need to create it first or check the email address.`);
        process.exit(1);
      } else {
        throw authError;
      }
    }

    // Check if already linked
    if (userData.firebaseAuthUid === firebaseUser.uid) {
      console.log(`✅ Accounts are already linked correctly!`);
      console.log(`   Firebase Auth UID matches Firestore user document.`);
      process.exit(0);
    }

    // Link the accounts
    await db.collection("users").doc(userId).update({
      firebaseAuthUid: firebaseUser.uid,
    });

    console.log(`\n✅ Successfully linked Firebase Auth account to Firestore user!`);
    console.log(`   Firestore User ID: ${userId}`);
    console.log(`   Firebase Auth UID: ${firebaseUser.uid}`);
    console.log(`   Email: ${normalizedEmail}`);
    console.log(`\n📝 The user can now sign in with their email and password.`);

  } catch (error: unknown) {
    console.error("❌ Failed to link Firebase Auth account:", getErrorMessage(error));
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error("❌ Usage: npm run link-firebase-auth-account <email>");
  console.error('   Example: npm run link-firebase-auth-account support@meant2grow.com');
  console.error("\n🌍 Environment: Defaults to sandbox (meant2grow-dev).");
  console.error("   To use production, run: firebase use production");
  console.error("   Then run this script again.");
  process.exit(1);
}

const [email] = args;

linkFirebaseAuthAccount(email)
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
