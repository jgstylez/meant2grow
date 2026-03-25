/**
 * Script to fix user documents - creates documents at /users/{firebaseAuthUid}
 * for users who have firebaseAuthUid but don't have a document at that path
 * 
 * This fixes Firestore permission issues where rules check for /users/{request.auth.uid}
 * but the user document exists at /users/{originalFirestoreUserId}
 * 
 * Usage: npm run fix-user-documents
 */

import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../.env.local") });

// Initialize Firebase Admin (same pattern as other scripts)
if (getApps().length === 0) {
  const prodServiceAccountPath = resolve(
    __dirname,
    "../meant2grow-prod-0587fbfd09ba.json"
  );
  const devServiceAccountPath = resolve(
    __dirname,
    "../meant2grow-dev-dfcfbc9ebeaa.json"
  );
  
  let serviceAccountPath: string | null = null;
  let projectId = "meant2grow-dev";
  
  try {
    const firebasercPath = resolve(__dirname, "../.firebaserc");
    const firebasercContent = readFileSync(firebasercPath, "utf8");
    const firebaserc = JSON.parse(firebasercContent);
    if (firebaserc.projects && firebaserc.projects.default) {
      projectId = firebaserc.projects.default;
    }
  } catch {
    // Use default
  }
  
  if (projectId === "meant2grow-dev") {
    try {
      readFileSync(devServiceAccountPath, "utf8");
      serviceAccountPath = devServiceAccountPath;
    } catch {
      try {
        readFileSync(prodServiceAccountPath, "utf8");
        serviceAccountPath = prodServiceAccountPath;
        projectId = "meant2grow-prod";
      } catch {
        // Will use default credentials
      }
    }
  } else {
    try {
      readFileSync(prodServiceAccountPath, "utf8");
      serviceAccountPath = prodServiceAccountPath;
    } catch {
      try {
        readFileSync(devServiceAccountPath, "utf8");
        serviceAccountPath = devServiceAccountPath;
        projectId = "meant2grow-dev";
      } catch {
        // Will use default credentials
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
      console.log(`✅ Initialized Firebase Admin with service account`);
      console.log(`   Project: ${projectId}`);
    } catch {
      try {
        initializeApp({
          credential: applicationDefault(),
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId,
        });
        console.log(`✅ Initialized Firebase Admin with default credentials`);
      } catch {
        initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId,
        });
        console.log(`✅ Initialized Firebase Admin (using environment variables)`);
      }
    }
  } else {
    try {
      initializeApp({
        credential: applicationDefault(),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId || "meant2grow-dev",
      });
      console.log(`✅ Initialized Firebase Admin with default credentials`);
    } catch {
      initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || projectId || "meant2grow-dev",
      });
      console.log(`✅ Initialized Firebase Admin (using environment variables)`);
    }
  }
}

const db = getFirestore();

async function fixUserDocuments() {
  console.log(`🔧 Fixing user documents...\n`);

  try {
    // Get all users (we'll filter for those with firebaseAuthUid)
    const usersSnapshot = await db
      .collection("users")
      .get();

    if (usersSnapshot.empty) {
      console.log(`✅ No users found. Nothing to fix.`);
      return;
    }

    // Filter users who have firebaseAuthUid
    const usersWithAuthUid = usersSnapshot.docs.filter(
      doc => doc.data().firebaseAuthUid != null
    );

    if (usersWithAuthUid.length === 0) {
      console.log(`✅ No users found with firebaseAuthUid. Nothing to fix.`);
      return;
    }

    console.log(`📋 Found ${usersWithAuthUid.length} users with firebaseAuthUid (out of ${usersSnapshot.size} total)\n`);

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    for (const userDoc of usersWithAuthUid) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const firebaseAuthUid = userData.firebaseAuthUid;

      if (!firebaseAuthUid) {
        skipped++;
        continue;
      }

      try {
        // Check if document exists at /users/{firebaseAuthUid}
        const authUidDocRef = db.collection("users").doc(firebaseAuthUid);
        const authUidDoc = await authUidDocRef.get();

        if (!authUidDoc.exists) {
          // Create document at Firebase Auth UID path
          const userDataForAuthUid = {
            ...userData,
            id: firebaseAuthUid,
            firebaseAuthUid: firebaseAuthUid,
            originalFirestoreUserId: userId,
          };
          await authUidDocRef.set(userDataForAuthUid);
          console.log(`✅ Fixed: ${userData.email || userId} (${firebaseAuthUid})`);
          fixed++;
        } else {
          // Document exists, just update it to ensure it has the right fields
          const existingData = authUidDoc.data();
          await authUidDocRef.set({
            ...existingData,
            ...userData,
            id: firebaseAuthUid,
            firebaseAuthUid: firebaseAuthUid,
            originalFirestoreUserId: userId,
          }, { merge: true });
          console.log(`✅ Updated: ${userData.email || userId} (${firebaseAuthUid})`);
          fixed++;
        }
      } catch (error: any) {
        console.error(`❌ Error fixing ${userData.email || userId}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Fixed/Updated: ${fixed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);

  } catch (error: any) {
    console.error("❌ Failed to fix user documents:", error.message);
    process.exit(1);
  }
}

fixUserDocuments()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
