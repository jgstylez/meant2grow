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

/**
 * Legacy invitations used random Firestore document IDs with the token stored in a field.
 * After tightening Firestore rules, unauthenticated clients cannot run collection queries.
 * This callable uses the Admin SDK to resolve an invitation by token for older links only
 * (new invitations use the token as the document ID and are read via getDoc).
 */
export const lookupInvitationByToken = functions.onCall(RUNTIME, async (request) => {
  const token = request.data?.token;
  if (typeof token !== "string" || token.length < 20) {
    return { invitation: null };
  }

  try {
    const snap = await db
      .collection("invitations")
      .where("token", "==", token)
      .where("status", "==", "Pending")
      .limit(1)
      .get();

    if (snap.empty) {
      return { invitation: null };
    }

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    if (data.expiresAt) {
      const exp = data.expiresAt.toDate
        ? data.expiresAt.toDate()
        : new Date(data.expiresAt as string);
      if (exp < new Date()) {
        await docSnap.ref.update({ status: "Expired" });
        return { invitation: null };
      }
    }

    const sentDate = data.sentDate?.toDate
      ? data.sentDate.toDate().toISOString()
      : typeof data.sentDate === "string"
        ? data.sentDate
        : new Date().toISOString();
    const expiresAt = data.expiresAt?.toDate
      ? data.expiresAt.toDate().toISOString()
      : typeof data.expiresAt === "string"
        ? data.expiresAt
        : undefined;

    return {
      invitation: {
        id: docSnap.id,
        organizationId: data.organizationId,
        name: data.name,
        email: typeof data.email === "string" ? data.email.toLowerCase() : data.email,
        role: data.role,
        status: data.status,
        token: data.token,
        invitationLink: data.invitationLink,
        sentDate,
        expiresAt,
        inviterId: data.inviterId,
      },
    };
  } catch (err: unknown) {
    console.error("lookupInvitationByToken failed", err);
    throw new functions.HttpsError("internal", "Failed to look up invitation");
  }
});
