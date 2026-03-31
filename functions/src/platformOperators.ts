import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

const RUNTIME = {
  region: "us-central1" as const,
  memory: "256MiB" as const,
  cpu: 0.08333333333333333,
  concurrency: 1,
  maxInstances: 10,
};

function validatePassword(password: string): { ok: true } | { ok: false; message: string } {
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters" };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { ok: false, message: "Password must contain at least one lowercase letter" };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { ok: false, message: "Password must contain at least one uppercase letter" };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { ok: false, message: "Password must contain at least one number" };
  }
  return { ok: true };
}

function isPlatformOperatorUserData(
  data: Record<string, unknown> | undefined
): boolean {
  if (!data) {
    return false;
  }
  const role = data.role;
  const orgId = data.organizationId;
  if (role === "PLATFORM_OPERATOR" || role === "PLATFORM_ADMIN") {
    return true;
  }
  if (orgId === "platform") {
    return true;
  }
  return false;
}

/**
 * Firestore rules use users/{request.auth.uid}. Legacy profiles may live only under a random doc id
 * with firebaseAuthUid set — match that here so callables work for the same users who can open this UI.
 */
async function assertCallerIsPlatformOperator(callerUid: string): Promise<void> {
  const direct = await db.collection("users").doc(callerUid).get();
  if (direct.exists && isPlatformOperatorUserData(direct.data())) {
    return;
  }

  const linkedSnap = await db
    .collection("users")
    .where("firebaseAuthUid", "==", callerUid)
    .limit(25)
    .get();

  for (const d of linkedSnap.docs) {
    if (isPlatformOperatorUserData(d.data())) {
      return;
    }
  }

  throw new functions.HttpsError(
    "permission-denied",
    "Only platform operators can use this action"
  );
}

function timestampToIso(value: unknown): string {
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return new Date().toISOString();
}

function assertNotDeletingSelf(
  callerUid: string,
  targetUserId: string,
  targetData: Record<string, unknown>
): void {
  if (targetUserId === callerUid) {
    throw new functions.HttpsError("invalid-argument", "You cannot delete your own account");
  }
  const linked = targetData.firebaseAuthUid;
  if (typeof linked === "string" && linked === callerUid) {
    throw new functions.HttpsError("invalid-argument", "You cannot delete your own account");
  }
}

/**
 * Creates or updates a Firebase Auth email/password account and canonical Firestore user at
 * users/{uid} with PLATFORM_OPERATOR. Does not sign the admin out (uses Admin SDK).
 * Merges duplicate Firestore profiles that share the same email into users/{authUid}.
 */
export const createPlatformOperatorAccount = functions.onCall(RUNTIME, async (request) => {
  if (!request.auth?.uid) {
    throw new functions.HttpsError("unauthenticated", "Sign in required");
  }

  await assertCallerIsPlatformOperator(request.auth.uid);

  const rawEmail = request.data?.email;
  const password = request.data?.password;
  const rawName = request.data?.name;

  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    throw new functions.HttpsError("invalid-argument", "Email is required");
  }
  if (typeof password !== "string" || !password) {
    throw new functions.HttpsError("invalid-argument", "Password is required");
  }

  const pw = validatePassword(password);
  if (!pw.ok) {
    throw new functions.HttpsError("invalid-argument", pw.message);
  }

  const email = rawEmail.trim().toLowerCase();
  const name =
    typeof rawName === "string" && rawName.trim()
      ? rawName.trim()
      : "Platform Operator";

  const auth = admin.auth();
  let firebaseAuthUid: string;

  try {
    const existing = await auth.getUserByEmail(email);
    firebaseAuthUid = existing.uid;
    await auth.updateUser(firebaseAuthUid, { password });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "auth/user-not-found") {
      const created = await auth.createUser({
        email,
        password,
        emailVerified: false,
      });
      firebaseAuthUid = created.uid;
    } else {
      console.error("createPlatformOperatorAccount auth error", e);
      const msg =
        code === "auth/email-already-exists"
          ? "This email is already registered"
          : "Failed to create or update authentication account";
      throw new functions.HttpsError("internal", msg);
    }
  }

  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=10b981&color=fff`;

  const baseFields: Record<string, unknown> = {
    email,
    name,
    role: "PLATFORM_OPERATOR",
    organizationId: "platform",
    firebaseAuthUid,
    avatar,
    title: "Platform Operator",
    company: "Meant2Grow",
    skills: [],
    bio: "Platform operator for Meant2Grow",
    passwordUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const canonicalRef = db.collection("users").doc(firebaseAuthUid);
  const byEmailSnap = await db.collection("users").where("email", "==", email).get();

  if (byEmailSnap.empty) {
    await canonicalRef.set(
      {
        ...baseFields,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    let merged: Record<string, unknown> = {};
    for (const d of byEmailSnap.docs) {
      const data = d.data();
      const { id: _dropId, ...rest } = data as Record<string, unknown> & { id?: string };
      merged = { ...merged, ...rest };
    }
    await canonicalRef.set(
      {
        ...merged,
        ...baseFields,
        createdAt: merged.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    for (const d of byEmailSnap.docs) {
      if (d.id !== firebaseAuthUid) {
        try {
          await d.ref.delete();
        } catch (delErr) {
          console.warn("createPlatformOperatorAccount: could not delete duplicate user doc", {
            docId: d.id,
            error: delErr,
          });
        }
      }
    }
  }

  return { uid: firebaseAuthUid, email, name };
});

export const listPlatformOperators = functions.onCall(RUNTIME, async (request) => {
  if (!request.auth?.uid) {
    throw new functions.HttpsError("unauthenticated", "Sign in required");
  }

  await assertCallerIsPlatformOperator(request.auth.uid);

  const byId = new Map<string, admin.firestore.QueryDocumentSnapshot>();

  const [roleSnap, orgSnap] = await Promise.all([
    db.collection("users").where("role", "in", ["PLATFORM_OPERATOR", "PLATFORM_ADMIN"]).get(),
    db.collection("users").where("organizationId", "==", "platform").get(),
  ]);

  for (const d of roleSnap.docs) {
    byId.set(d.id, d);
  }
  for (const d of orgSnap.docs) {
    byId.set(d.id, d);
  }

  const operators = Array.from(byId.values())
    .filter((snap) => isPlatformOperatorUserData(snap.data() as Record<string, unknown>))
    .map((snap) => {
      const data = snap.data()!;
      const raw = data as Record<string, unknown>;
      return {
        id: snap.id,
        email: typeof raw.email === "string" ? raw.email : "",
        name: typeof raw.name === "string" ? raw.name : "",
        role: typeof raw.role === "string" ? raw.role : "PLATFORM_OPERATOR",
        organizationId: typeof raw.organizationId === "string" ? raw.organizationId : "platform",
        avatar: typeof raw.avatar === "string" ? raw.avatar : "",
        title: typeof raw.title === "string" ? raw.title : "",
        company: typeof raw.company === "string" ? raw.company : "Meant2Grow",
        skills: Array.isArray(raw.skills) ? raw.skills : [],
        bio: typeof raw.bio === "string" ? raw.bio : "",
        firebaseAuthUid: typeof raw.firebaseAuthUid === "string" ? raw.firebaseAuthUid : undefined,
        createdAt: timestampToIso(raw.createdAt),
      };
    });

  operators.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });

  return { operators };
});

export const deletePlatformOperator = functions.onCall(RUNTIME, async (request) => {
  if (!request.auth?.uid) {
    throw new functions.HttpsError("unauthenticated", "Sign in required");
  }

  await assertCallerIsPlatformOperator(request.auth.uid);

  const targetUserId = request.data?.targetUserId;
  if (typeof targetUserId !== "string" || !targetUserId.trim()) {
    throw new functions.HttpsError("invalid-argument", "targetUserId is required");
  }

  const ref = db.collection("users").doc(targetUserId.trim());
  const target = await ref.get();
  if (!target.exists) {
    throw new functions.HttpsError("not-found", "User not found");
  }

  const data = target.data() as Record<string, unknown>;
  if (!isPlatformOperatorUserData(data)) {
    throw new functions.HttpsError(
      "invalid-argument",
      "That profile is not a platform operator"
    );
  }

  assertNotDeletingSelf(request.auth.uid, targetUserId.trim(), data);

  await ref.delete();
  return { ok: true as const };
});

export const updatePlatformOperatorProfile = functions.onCall(RUNTIME, async (request) => {
  if (!request.auth?.uid) {
    throw new functions.HttpsError("unauthenticated", "Sign in required");
  }

  await assertCallerIsPlatformOperator(request.auth.uid);

  const targetUserId = request.data?.targetUserId;
  const rawName = request.data?.name;
  const rawEmail = request.data?.email;

  if (typeof targetUserId !== "string" || !targetUserId.trim()) {
    throw new functions.HttpsError("invalid-argument", "targetUserId is required");
  }

  const ref = db.collection("users").doc(targetUserId.trim());
  const target = await ref.get();
  if (!target.exists) {
    throw new functions.HttpsError("not-found", "User not found");
  }

  if (!isPlatformOperatorUserData(target.data() as Record<string, unknown>)) {
    throw new functions.HttpsError(
      "invalid-argument",
      "That profile is not a platform operator"
    );
  }

  const patch: Record<string, unknown> = {};
  if (typeof rawName === "string" && rawName.trim()) {
    patch.name = rawName.trim();
  }
  if (typeof rawEmail === "string" && rawEmail.trim()) {
    patch.email = rawEmail.trim().toLowerCase();
  }

  if (Object.keys(patch).length === 0) {
    throw new functions.HttpsError("invalid-argument", "Provide name and/or email to update");
  }

  await ref.update(patch);
  return { ok: true as const };
});
