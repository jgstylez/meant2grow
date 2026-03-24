import { auth } from "../services/firebase";
import { getUser } from "../services/database";
import type { User } from "../types";

/**
 * Prefer the Firestore document at users/{firebaseAuthUid} when it exists and matches the
 * signed-in Firebase user, so client session userId aligns with request.auth.uid in security rules.
 * Falls back to user.id for legacy accounts that only have a random document id.
 */
export async function resolveCanonicalFirestoreUserId(user: User): Promise<string> {
  const uid = user.firebaseAuthUid;
  if (!uid) {
    return user.id;
  }
  if (user.id === uid) {
    return user.id;
  }
  const current = auth.currentUser;
  if (!current || current.uid !== uid) {
    return user.id;
  }
  const canonicalDoc = await getUser(uid);
  if (canonicalDoc) {
    return uid;
  }
  return user.id;
}
