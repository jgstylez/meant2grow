/**
 * TOTP (Google Authenticator) 2FA Cloud Functions
 * Uses otplib for RFC 6238 compliant TOTP generation and verification
 */
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { generateSecret, generateURI, verify } from "otplib";
import { getErrorMessage } from "./utils/errors";

const db = admin.firestore();
const auth = admin.auth();

const APP_NAME = "Meant2Grow";

/** Get Firestore user ID from Firebase Auth UID (handles dual doc structure) */
async function getFirestoreUserIdFromAuth(firebaseAuthUid: string): Promise<string | null> {
  // Check users/{firebaseAuthUid} first (auth UID doc)
  const authUidDoc = await db.collection("users").doc(firebaseAuthUid).get();
  if (authUidDoc.exists) {
    const data = authUidDoc.data() as { originalFirestoreUserId?: string } | undefined;
    if (data?.originalFirestoreUserId) return data.originalFirestoreUserId;
    return firebaseAuthUid; // Doc exists at auth UID, use it
  }

  // Query by firebaseAuthUid field
  const snapshot = await db
    .collection("users")
    .where("firebaseAuthUid", "==", firebaseAuthUid)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }
  return null;
}

/** Verify ID token and return firestore user ID and email */
async function verifyAuthAndGetUser(idToken: string): Promise<{
  firestoreUserId: string;
  firebaseAuthUid: string;
  email: string;
}> {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("ID token is required");
  }
  const decoded = await auth.verifyIdToken(idToken);
  const firebaseAuthUid = decoded.uid;
  const firestoreUserId = await getFirestoreUserIdFromAuth(firebaseAuthUid);
  if (!firestoreUserId) {
    throw new Error("User not found");
  }
  const userDoc = await db.collection("users").doc(firestoreUserId).get();
  const userData = userDoc.exists ? (userDoc.data() as { email?: string }) : {};
  const authUidDoc = await db.collection("users").doc(firebaseAuthUid).get();
  const authData = authUidDoc.exists ? (authUidDoc.data() as { email?: string }) : {};
  const email = (userData?.email || authData?.email || decoded.email || "").toString();
  return { firestoreUserId, firebaseAuthUid, email };
}

/** Update totpEnabled on all user docs (main + auth UID) */
async function setTotpEnabled(firestoreUserId: string, firebaseAuthUid: string, enabled: boolean) {
  const batch = db.batch();
  const mainRef = db.collection("users").doc(firestoreUserId);
  const authRef = db.collection("users").doc(firebaseAuthUid);

  const mainDoc = await mainRef.get();
  if (mainDoc.exists) {
    batch.update(mainRef, enabled ? { totpEnabled: true } : { totpEnabled: admin.firestore.FieldValue.delete() });
  }
  if (firebaseAuthUid !== firestoreUserId) {
    const authDoc = await authRef.get();
    if (authDoc.exists) {
      batch.update(authRef, enabled ? { totpEnabled: true } : { totpEnabled: admin.firestore.FieldValue.delete() });
    }
  }
  await batch.commit();
}

export const setupTotp = functions.onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    try {
      const { idToken } = req.body;
      const { firestoreUserId, email } = await verifyAuthAndGetUser(idToken);

      const userDoc = await db.collection("users").doc(firestoreUserId).get();
      const userData = userDoc.data() as { totpEnabled?: boolean } | undefined;
      if (userData?.totpEnabled) {
        res.status(400).json({ error: "Two-factor authentication is already enabled" });
        return;
      }

      const secret = generateSecret();
      const otpauthUri = generateURI({
        secret,
        label: email ? email.replace(/@/g, ":").slice(0, 64) : "user",
        issuer: APP_NAME,
      });

      await db.collection("totpSecrets").doc(firestoreUserId).set({
        secret,
        createdAt: admin.firestore.Timestamp.now(),
        verified: false,
      });

      res.json({ secret, otpauthUri });
    } catch (error: unknown) {
      console.error("setupTotp error:", getErrorMessage(error));
      res.status(500).json({ error: "Failed to setup two-factor authentication", message: getErrorMessage(error) });
    }
  }
);

export const verifyTotpSetup = functions.onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    try {
      const { idToken, code } = req.body;
      const { firestoreUserId, firebaseAuthUid } = await verifyAuthAndGetUser(idToken);

      if (!code || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
        res.status(400).json({ error: "Please enter a valid 6-digit code" });
        return;
      }

      const totpDoc = await db.collection("totpSecrets").doc(firestoreUserId).get();
      if (!totpDoc.exists) {
        res.status(400).json({ error: "Two-factor setup not started. Please begin setup first." });
        return;
      }
      const secret = (totpDoc.data() as { secret?: string } | undefined)?.secret;
      if (!secret) {
        res.status(400).json({ error: "Setup expired. Please try again." });
        return;
      }

      const isValid = await verify({ secret, token: code.trim() });
      if (!isValid) {
        res.status(400).json({ error: "Invalid code. Please try again." });
        return;
      }

      await db.collection("totpSecrets").doc(firestoreUserId).update({
        verified: true,
        verifiedAt: admin.firestore.Timestamp.now(),
      });

      await setTotpEnabled(firestoreUserId, firebaseAuthUid, true);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("verifyTotpSetup error:", getErrorMessage(error));
      res.status(500).json({ error: "Failed to enable two-factor authentication", message: getErrorMessage(error) });
    }
  }
);

export const verifyTotpLogin = functions.onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    try {
      const { code, idToken } = req.body;
      if (!code || !idToken) {
        res.status(400).json({ error: "Code and ID token are required" });
        return;
      }
      if (!/^\d{6}$/.test(String(code).trim())) {
        res.status(400).json({ error: "Please enter a valid 6-digit code" });
        return;
      }

      const { firestoreUserId } = await verifyAuthAndGetUser(idToken);

      const totpDoc = await db.collection("totpSecrets").doc(firestoreUserId).get();
      if (!totpDoc.exists) {
        res.status(400).json({ error: "Two-factor authentication is not set up for this account" });
        return;
      }
      const secret = (totpDoc.data() as { secret?: string } | undefined)?.secret;
      if (!secret) {
        res.status(400).json({ error: "Two-factor setup is invalid. Please contact support." });
        return;
      }

      const isValid = await verify({ secret, token: String(code).trim() });
      if (!isValid) {
        res.status(400).json({ error: "Invalid code. Please try again." });
        return;
      }
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("verifyTotpLogin error:", getErrorMessage(error));
      res.status(500).json({ error: "Verification failed", message: getErrorMessage(error) });
    }
  }
);

export const disableTotp = functions.onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    try {
      const { idToken, code } = req.body;
      const { firestoreUserId, firebaseAuthUid } = await verifyAuthAndGetUser(idToken);

      if (!code || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
        res.status(400).json({ error: "Please enter your current 6-digit code to disable 2FA" });
        return;
      }

      const totpDoc = await db.collection("totpSecrets").doc(firestoreUserId).get();
      if (!totpDoc.exists) {
        res.status(400).json({ error: "Two-factor authentication is not enabled" });
        return;
      }
      const secret = (totpDoc.data() as { secret?: string } | undefined)?.secret;
      const isValid = await verify({ secret: secret!, token: code.trim() });
      if (!isValid) {
        res.status(400).json({ error: "Invalid code. Please try again." });
        return;
      }

      await db.collection("totpSecrets").doc(firestoreUserId).delete();
      await setTotpEnabled(firestoreUserId, firebaseAuthUid, false);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("disableTotp error:", getErrorMessage(error));
      res.status(500).json({ error: "Failed to disable two-factor authentication", message: getErrorMessage(error) });
    }
  }
);
