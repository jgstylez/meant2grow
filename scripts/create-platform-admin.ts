/**
 * Script to create a platform admin user
 * Usage: npx ts-node scripts/create-platform-admin.ts <email> <name>
 * Example: npx ts-node scripts/create-platform-admin.ts admin@meant2grow.com "Platform Admin"
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
import { getErrorMessage, getErrorCode } from "../utils/errors";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../.env.local") });

// Initialize Firebase Admin
if (getApps().length === 0) {
  // Not initialized, so initialize it
  // Try to use service account key file if it exists
  const serviceAccountPath = resolve(
    __dirname,
    "../meant2grow-dev-dfcfbc9ebeaa.json"
  );
  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || "meant2grow-dev",
    });
    const serviceAccountEmail =
      serviceAccount.client_email || serviceAccount.clientEmail;
    console.log("✅ Initialized Firebase Admin with service account");
    console.log(`   Service Account: ${serviceAccountEmail}`);
  } catch (fileError) {
    // Fallback to default credentials (if running on GCP or with GOOGLE_APPLICATION_CREDENTIALS)
    try {
      initializeApp({
        credential: applicationDefault(),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || "meant2grow-dev",
      });
      console.log("✅ Initialized Firebase Admin with default credentials");
    } catch (defaultError) {
      // Last resort: initialize without credentials (will use environment variables)
      initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || "meant2grow-dev",
      });
      console.log(
        "✅ Initialized Firebase Admin (using environment variables)"
      );
    }
  }
}

const db = getFirestore();

async function createPlatformAdmin(email: string, name: string) {
  console.log(`🔐 Creating platform admin user...\n`);
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

      // Update to platform admin
      await existingUserDoc.ref.update({
        role: "PLATFORM_ADMIN",
        organizationId: "platform",
      });

      console.log(`\n✅ Updated user to PLATFORM_ADMIN role!`);
      return;
    }

    // Create new platform admin user
    // Note: Platform admins don't need an organizationId, but we'll use a placeholder
    // In production, you might want to create a special "Platform" organization
    const userRef = db.collection("users").doc();
    await userRef.set({
      email,
      name,
      role: "PLATFORM_ADMIN",
      organizationId: "platform", // Placeholder - platform admins can see all orgs
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&background=10b981&color=fff`,
      title: "Platform Administrator",
      company: "Meant2Grow",
      skills: [],
      bio: "Platform administrator for Meant2Grow",
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`\n✅ Platform admin user created successfully!`);
    console.log(`  User ID: ${userRef.id}`);
    console.log(`\n⚠️  Note: This user will need to sign in through the app.`);
    console.log(`  They should use their email (${email}) to authenticate.`);
  } catch (error: unknown) {
    console.error("❌ Failed to create platform admin:", error);
    const errorCode = getErrorCode(error);
    const errorMessage = getErrorMessage(error);

    if (errorCode === "7" || errorMessage.includes("PERMISSION_DENIED")) {
      console.error("\n🔒 Permission Denied Error");
      console.error(
        "The service account doesn't have permission to access Firestore."
      );
      console.error("\n📋 To fix this:");
      console.error("1. Go to Google Cloud Console IAM:");
      console.error(
        "   https://console.cloud.google.com/iam-admin/iam?project=meant2grow-dev"
      );
      console.error("\n2. Find the service account:");
      console.error(
        "   meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com"
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
    "❌ Usage: npx ts-node scripts/create-platform-admin.ts <email> <name>"
  );
  console.error(
    '   Example: npx ts-node scripts/create-platform-admin.ts admin@meant2grow.com "Platform Admin"'
  );
  process.exit(1);
}

const [email, ...nameParts] = args;
const name = nameParts.join(" ");

createPlatformAdmin(email, name)
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
