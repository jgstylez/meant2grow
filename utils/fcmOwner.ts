/**
 * Firestore user id under which FCM tokens and device records are stored.
 * When a platform operator impersonates another user, push tokens must remain
 * on the operator's account so notifications reach the real signed-in device.
 */
export function getFCMStorageUserId(params: {
  sessionUserId: string | null;
  isImpersonating: boolean;
  originalOperatorId: string | null | undefined;
}): string | null {
  if (!params.sessionUserId) return null;
  if (params.isImpersonating && params.originalOperatorId) {
    return params.originalOperatorId;
  }
  return params.sessionUserId;
}
