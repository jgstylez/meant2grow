/**
 * Script to set passwords for all platform operators
 * Usage: npm run set-all-platform-operator-passwords [--password "DefaultPassword123"]
 * 
 * If no password is provided, generates a random secure password for each user.
 * 
 * Note: "Platform Operator" is the preferred terminology. The role value stored in the database is `PLATFORM_OPERATOR`.
 * 
 * This script:
 * 1. Finds all platform operator users in Firestore
 * 2. Creates or updates their Firebase Auth accounts with passwords
 * 3. Links the firebaseAuthUid to the Firestore user documents
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
import * as crypto from "crypto";

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

// Initialize Firebase Admin - try multiple credential methods
if (getApps().length === 0) {
  // Try service account files first (they exist)
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
  
  try {
    readFileSync(prodServiceAccountPath, "utf8");
    serviceAccountPath = prodServiceAccountPath;
    projectId = "meant2grow-prod";
  } catch {
    try {
      readFileSync(devServiceAccountPath, "utf8");
      serviceAccountPath = devServiceAccountPath;
      projectId = "meant2grow-dev";
    } catch {
      // No service account file
    }
  }
  
  if (serviceAccountPath) {
    try {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
      initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId,
      });
      console.log(`✅ Initialized Firebase Admin with service account (${projectId})`);
      console.log(`⚠️  Note: If you get permission errors, the service account needs Firebase Admin permissions.`);
    } catch (fileError) {
      console.error("❌ Failed to initialize Firebase Admin with service account");
      // Try default credentials as fallback
      try {
        initializeApp({
          credential: applicationDefault(),
          projectId: projectId,
        });
        console.log(`✅ Initialized Firebase Admin with default credentials (${projectId})`);
      } catch (defaultError) {
        console.error("❌ Failed to initialize Firebase Admin");
        console.error("   Please ensure you have proper credentials configured");
        process.exit(1);
      }
    }
  } else {
    // Try default credentials
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 
                      process.env.FIREBASE_PROJECT_ID || 
                      "meant2grow-prod";
    try {
      initializeApp({
        credential: applicationDefault(),
        projectId: projectId,
      });
      console.log(`✅ Initialized Firebase Admin with default credentials (${projectId})`);
    } catch (defaultError) {
      console.error("❌ No credentials found. Please ensure:");
      console.error("   1. Service account JSON file exists in project root, OR");
      console.error("   2. Default credentials are configured: gcloud auth application-default login");
      process.exit(1);
    }
  }
}

const db = getFirestore();
const auth = getAuth();

// Generate a secure random password
function generateSecurePassword(): string {
  const length = 16;
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const all = lowercase + uppercase + numbers;
  
  // Ensure at least one of each required character type
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

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

async function setPasswordForPlatformOperator(
  userId: string,
  email: string,
  name: string,
  password: string
): Promise<{ success: boolean; firebaseAuthUid?: string; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if Firebase Auth account already exists
    let firebaseAuthUid: string;
    let firebaseUser;

    try {
      if (await db.collection("users").doc(userId).get().then(doc => doc.data()?.firebaseAuthUid)) {
        const existingUid = (await db.collection("users").doc(userId).get()).data()?.firebaseAuthUid;
        firebaseUser = await auth.getUser(existingUid);
        firebaseAuthUid = firebaseUser.uid;
        
        // Update password
        await auth.updateUser(firebaseAuthUid, {
          password: password,
          emailVerified: firebaseUser.emailVerified,
        });
      } else {
        // Try to find Firebase Auth account by email
        try {
          firebaseUser = await auth.getUserByEmail(normalizedEmail);
          firebaseAuthUid = firebaseUser.uid;
          
          // Update password
          await auth.updateUser(firebaseAuthUid, {
            password: password,
          });
        } catch (emailError: any) {
          // User doesn't exist in Firebase Auth - create new account
          if (emailError.code === 'auth/user-not-found') {
            firebaseUser = await auth.createUser({
              email: normalizedEmail,
              password: password,
              emailVerified: false,
            });
            firebaseAuthUid = firebaseUser.uid;
          } else {
            throw emailError;
          }
        }
      }

      // Update Firestore user document with firebaseAuthUid
      await db.collection("users").doc(userId).update({
        firebaseAuthUid: firebaseAuthUid,
      });

      return { success: true, firebaseAuthUid };
    } catch (authError: any) {
      return { 
        success: false, 
        error: `Firebase Auth error: ${authError.message}` 
      };
    }
  } catch (error: unknown) {
    return { 
      success: false, 
      error: getErrorMessage(error) 
    };
  }
}

async function setAllPlatformAdminPasswords(defaultPassword?: string) {
  console.log(`🔐 Setting passwords for all platform operators...\n`);

  try {
    // Find all platform operator users
    // Note: Role is stored as PLATFORM_OPERATOR in database (legacy: PLATFORM_ADMIN)
    // Query for both roles since Firestore doesn't support OR queries
    const [operatorSnapshot, adminSnapshot] = await Promise.all([
      db.collection("users").where("role", "==", "PLATFORM_OPERATOR").get(),
      db.collection("users").where("role", "==", "PLATFORM_ADMIN").get(),
    ]);

    // Combine results and deduplicate by document ID
    const allUsers = new Map();
    operatorSnapshot.docs.forEach(doc => allUsers.set(doc.id, doc));
    adminSnapshot.docs.forEach(doc => allUsers.set(doc.id, doc));

    if (allUsers.size === 0) {
      console.log("ℹ️  No platform operators found in Firestore.");
      return;
    }

    console.log(`Found ${allUsers.size} platform operator(s):\n`);

    const results: Array<{
      email: string;
      name: string;
      success: boolean;
      password?: string;
      firebaseAuthUid?: string;
      error?: string;
    }> = [];

    // Process each platform operator
    for (const userDoc of Array.from(allUsers.values())) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const email = userData.email;
      const name = userData.name || "Platform Operator";

      if (!email) {
        console.log(`⚠️  Skipping user ${userId} - no email address`);
        continue;
      }

      // Generate or use provided password
      const password = defaultPassword || generateSecurePassword();

      // Validate password if provided
      if (defaultPassword) {
        const validation = validatePassword(password);
        if (!validation.valid) {
          console.error(`❌ Invalid password for ${email}: ${validation.error}`);
          results.push({
            email,
            name,
            success: false,
            error: validation.error,
          });
          continue;
        }
      }

      console.log(`Processing: ${email} (${name})...`);

      const result = await setPasswordForPlatformOperator(userId, email, name, password);

      if (result.success) {
        console.log(`  ✅ Success! Firebase Auth UID: ${result.firebaseAuthUid}`);
        results.push({
          email,
          name,
          success: true,
          password: password, // Include password in results
          firebaseAuthUid: result.firebaseAuthUid,
        });
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
        results.push({
          email,
          name,
          success: false,
          error: result.error,
        });
      }
    }

    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${'='.repeat(60)}\n`);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}\n`);

    if (successful.length > 0) {
      console.log(`✅ Successfully set passwords for:`);
      successful.forEach((r, index) => {
        console.log(`\n${index + 1}. ${r.email} (${r.name})`);
        console.log(`   Password: ${r.password}`);
        console.log(`   Firebase Auth UID: ${r.firebaseAuthUid}`);
      });
    }

    if (failed.length > 0) {
      console.log(`\n❌ Failed to set passwords for:`);
      failed.forEach((r, index) => {
        console.log(`\n${index + 1}. ${r.email} (${r.name})`);
        console.log(`   Error: ${r.error}`);
      });
    }

    // Save passwords to a file for reference
    if (successful.length > 0) {
      const fs = await import('fs');
      const passwordsFile = resolve(__dirname, '../platform-operator-passwords.txt');
      const content = successful.map(r => 
        `${r.email} | ${r.password} | ${r.firebaseAuthUid}`
      ).join('\n');
      
      fs.writeFileSync(passwordsFile, 
        `Platform Operator Passwords\n` +
        `Generated: ${new Date().toISOString()}\n` +
        `${'='.repeat(60)}\n\n` +
        `Email | Password | Firebase Auth UID\n` +
        `${'-'.repeat(60)}\n` +
        content + '\n'
      );
      
      console.log(`\n💾 Passwords saved to: platform-operator-passwords.txt`);
      console.log(`   ⚠️  Keep this file secure and delete it after use!`);
    }

  } catch (error: unknown) {
    console.error("❌ Failed to set platform operator passwords:", getErrorMessage(error));
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const passwordArgIndex = args.indexOf('--password');
const defaultPassword = passwordArgIndex >= 0 && args[passwordArgIndex + 1] 
  ? args[passwordArgIndex + 1] 
  : undefined;

if (defaultPassword) {
  const validation = validatePassword(defaultPassword);
  if (!validation.valid) {
    console.error(`❌ Invalid password: ${validation.error}`);
    console.error("\n⚠️  Password requirements:");
    console.error("   - At least 8 characters long");
    console.error("   - Contains at least one lowercase letter");
    console.error("   - Contains at least one uppercase letter");
    console.error("   - Contains at least one number");
    process.exit(1);
  }
}

setAllPlatformAdminPasswords(defaultPassword)
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
