import * as admin from "firebase-admin";

// Lazy initialization of Firestore to avoid initialization order issues
const getDb = () => {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
};

// Trial period in days (default: 14 days)
const TRIAL_PERIOD_DAYS = 14;

/**
 * Sets trial period for a new organization
 * This is independent of payment provider (works with Flowglad or any other)
 */
export const setTrialPeriod = async (organizationId: string) => {
  const db = getDb();
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_PERIOD_DAYS);

  await db.collection("organizations").doc(organizationId).update({
    trialEnd: trialEndDate.toISOString(),
    subscriptionStatus: "trialing",
  });

  return trialEndDate;
};

