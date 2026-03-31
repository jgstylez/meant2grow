import { getFunctions, httpsCallable } from "firebase/functions";
import app from "./firebase";
import { getErrorMessage } from "../utils/errors";
import { User, Role } from "../types";

const functions = getFunctions(app, "us-central1");

function mapCallableError(e: unknown, fallback: string): Error {
  const err = e as { code?: string; message?: string; details?: unknown };
  const msg = err?.message || getErrorMessage(e);
  if (err?.code === "functions/invalid-argument" && err.details != null) {
    return new Error(String(err.details));
  }
  if (err?.code === "functions/permission-denied") {
    return new Error(msg || "Permission denied");
  }
  if (err?.code === "functions/unauthenticated") {
    return new Error("Sign in required");
  }
  if (err?.code === "functions/not-found") {
    return new Error(msg || "Not found");
  }
  return new Error(msg || fallback);
}

type OperatorRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  avatar: string;
  title: string;
  company: string;
  skills: string[];
  bio: string;
  firebaseAuthUid?: string;
  createdAt: string;
};

function rowToUser(row: OperatorRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: Role.PLATFORM_OPERATOR,
    organizationId: row.organizationId || "platform",
    avatar: row.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name || "?")}&background=10b981&color=fff`,
    title: row.title || "Platform Operator",
    company: row.company || "Meant2Grow",
    skills: row.skills || [],
    bio: row.bio || "",
    createdAt: row.createdAt,
    firebaseAuthUid: row.firebaseAuthUid,
  };
}

export type CreatePlatformOperatorInput = {
  email: string;
  password: string;
  name: string;
};

export type CreatePlatformOperatorResult = {
  uid: string;
  email: string;
  name: string;
};

/**
 * Provisions Firebase Auth (email/password) and Firestore users/{uid} as PLATFORM_OPERATOR
 * via Cloud Function (Admin SDK). Safe to call while signed in as another operator.
 */
export async function createPlatformOperatorAccount(
  input: CreatePlatformOperatorInput
): Promise<CreatePlatformOperatorResult> {
  const createOp = httpsCallable(functions, "createPlatformOperatorAccount");

  try {
    const result = await createOp({
      email: input.email.trim(),
      password: input.password,
      name: input.name.trim(),
    });
    const data = result.data as CreatePlatformOperatorResult | undefined;
    if (!data?.uid || !data.email) {
      throw new Error("Invalid response from server");
    }
    return data;
  } catch (e: unknown) {
    throw mapCallableError(e, "Failed to create platform operator");
  }
}

/**
 * Lists platform operators via Admin SDK (works when Firestore rules deny collection-wide user reads).
 */
export async function listPlatformOperators(): Promise<User[]> {
  const fn = httpsCallable(functions, "listPlatformOperators");
  try {
    const result = await fn({});
    const data = result.data as { operators?: OperatorRow[] } | undefined;
    const rows = data?.operators;
    if (!Array.isArray(rows)) {
      throw new Error("Invalid response from server");
    }
    return rows.map(rowToUser);
  } catch (e: unknown) {
    throw mapCallableError(e, "Failed to load platform operators");
  }
}

export async function deletePlatformOperator(targetUserId: string): Promise<void> {
  const fn = httpsCallable(functions, "deletePlatformOperator");
  try {
    await fn({ targetUserId });
  } catch (e: unknown) {
    throw mapCallableError(e, "Failed to delete platform operator");
  }
}

export async function updatePlatformOperatorProfile(
  targetUserId: string,
  updates: { name?: string; email?: string }
): Promise<void> {
  const fn = httpsCallable(functions, "updatePlatformOperatorProfile");
  try {
    await fn({
      targetUserId,
      name: updates.name,
      email: updates.email,
    });
  } catch (e: unknown) {
    throw mapCallableError(e, "Failed to update platform operator");
  }
}
