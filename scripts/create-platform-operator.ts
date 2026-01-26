/**
 * Script to create a platform operator user
 * 
 * Note: "Platform Operator" is the preferred terminology. The role value stored in the 
 * database is `PLATFORM_ADMIN` for technical reasons, but we refer to these users as 
 * "Platform Operators" to distinguish them from organization administrators.
 * 
 * Usage: npm run create:platform-operator <email> <name>
 * Example: npm run create:platform-operator operator@meant2grow.com "Jane Doe"
 */

import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
// Error handling utilities (inlined to avoid ES module import issues)
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

function getErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  return undefined;
}
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

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
  // Not initialized, so initialize it
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
      // Use detected projectId, not env var (env var might be wrong)
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
      // Fallback to default credentials (if running on GCP or with GOOGLE_APPLICATION_CREDENTIALS)
      try {
        initializeApp({
          credential: applicationDefault(),
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId,
        });
        console.log("✅ Initialized Firebase Admin with default credentials");
      } catch (defaultError) {
        // Last resort: initialize without credentials (will use environment variables)
        initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId,
        });
        console.log(
          "✅ Initialized Firebase Admin (using environment variables)"
        );
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
      // Last resort: initialize without credentials (will use environment variables)
      initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId || "meant2grow-dev",
      });
      console.log(
        "✅ Initialized Firebase Admin (using environment variables)"
      );
    }
  }
}

const db = getFirestore();

// Get the actual project ID from the initialized app
function getProjectId(): string {
  // Use the detected project ID from initialization
  return detectedProjectId;
}

async function createPlatformOperator(email: string, name: string) {
  console.log(`🔐 Creating platform operator user...\n`);
  console.log(`  Email: ${email}`);
  console.log(`  Name: ${name}\n`);

  try {
    // Check if user already exists
    const usersSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (!usersSnapshot.empty) {
      const existingUserDoc = usersSnapshot.docs[0];
      const existingUser = existingUserDoc.data();
      console.log(`⚠️  User with email ${email} already exists!`);
      console.log(`  Current role: ${existingUser.role}`);
      console.log(`  Current organizationId: ${existingUser.organizationId}`);

      // Update to platform operator (role stored as PLATFORM_ADMIN in database)
      await existingUserDoc.ref.update({
        role: "PLATFORM_ADMIN",
        organizationId: "platform",
      });

      console.log(`\n✅ Updated user to Platform Operator role!`);
      console.log(`   Note: Role is stored as PLATFORM_ADMIN in the database.`);
      return;
    }

    // Create new platform operator user
    // Note: Platform operators use organizationId "platform" to distinguish them
    // from organization administrators who belong to specific organizations
    const userRef = db.collection("users").doc();
    await userRef.set({
      email,
      name,
      role: "PLATFORM_ADMIN", // Database role value (technical)
      organizationId: "platform", // Distinguishes from organization administrators
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&background=10b981&color=fff`,
      title: "Platform Operator",
      company: "Meant2Grow",
      skills: [],
      bio: "Platform operator for Meant2Grow",
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`\n✅ Platform operator user created successfully!`);
    console.log(`  User ID: ${userRef.id}`);
    console.log(`\n⚠️  Note: This user will need to sign in through the app.`);
    console.log(`  They should use their email (${email}) to authenticate.`);
    console.log(`\n📝 Next step: Set a password for this platform operator:`);
    console.log(`   npm run set-platform-admin-password ${email} "<password>"`);
  } catch (error: unknown) {
    console.error("❌ Failed to create platform operator:", error);
    const errorCode = getErrorCode(error);
    const errorMessage = getErrorMessage(error);

    if (errorCode === "7" || errorMessage.includes("PERMISSION_DENIED")) {
      console.error("\n🔒 Permission Denied Error");
      console.error(
        "The service account doesn't have permission to access Firestore."
      );
      console.error("\n📋 To fix this:");
      const currentProject = getProjectId();
      console.error("1. Go to Google Cloud Console IAM:");
      console.error(
        `   https://console.cloud.google.com/iam-admin/iam?project=${currentProject}`
      );
      console.error("\n2. Find the service account:");
      console.error(
        `   meant2grow-meet-service@${currentProject}.iam.gserviceaccount.com`
      );
      console.error("\n3. Click the pencil icon (Edit)");
      console.error("\n4. Click 'ADD ANOTHER ROLE'");
      console.error("\n5. Add one of these roles:");
      console.error("   - Cloud Datastore User (recommended)");
      console.error("   - Firebase Admin SDK Administrator Service Agent");
      console.error("   - Editor (full access, less secure)");
      console.error("\n6. Click 'SAVE'");
      console.error("\n7. Wait a few seconds for permissions to propagate");
      console.error("\n8. Run this script again");
    }

    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error(
    "❌ Usage: npm run create:platform-operator <email> <name>"
  );
  console.error(
    '   Example: npm run create:platform-operator operator@meant2grow.com "Jane Doe"'
  );
  console.error("\n📝 Note: Platform Operators manage platform-wide content.");
  console.error("   Organization Administrators manage content within their organization.");
  console.error("\n🌍 Environment: Defaults to sandbox (meant2grow-dev).");
  console.error("   To use production, run: firebase use production");
  console.error("   Then run this script again.");
  process.exit(1);
}

const [email, ...nameParts] = args;
const name = nameParts.join(" ");

createPlatformOperator(email, name)
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
