import Stripe from "stripe";
import * as admin from "firebase-admin";

// Lazy initialization of Firestore to avoid initialization order issues
const getDb = () => {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
};

// Initialize Stripe
const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn("STRIPE_SECRET_KEY not set. Stripe functionality will be disabled.");
    return null;
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-11-17.clover",
  });
};

const stripe = getStripeClient();

// Subscription pricing (you'll need to create these in Stripe Dashboard)
const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_ID_STARTER || "price_starter_monthly",
  professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL || "price_professional_monthly",
  business: process.env.STRIPE_PRICE_ID_BUSINESS || "price_business_monthly",
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || "price_enterprise_monthly",
};

// Trial period in days (default: 14 days)
const TRIAL_PERIOD_DAYS = 14;

export const stripeService = {
  // Create or retrieve Stripe customer for organization
  getOrCreateCustomer: async (organizationId: string, email: string, name: string) => {
    if (!stripe) {
      throw new Error("Stripe is not configured");
    }

    const db = getDb();
    // Check if organization already has a customer ID
    const orgDoc = await db.collection("organizations").doc(organizationId).get();
    if (!orgDoc.exists) {
      throw new Error("Organization not found");
    }

    const orgData = orgDoc.data();
    if (orgData?.stripeCustomerId) {
      // Retrieve existing customer
      const customer = await stripe.customers.retrieve(orgData.stripeCustomerId);
      return customer as Stripe.Customer;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organizationId,
      },
    });

    // Save customer ID to organization
    await orgDoc.ref.update({
      stripeCustomerId: customer.id,
    });

    return customer;
  },

  // Create checkout session for subscription upgrade
  createCheckoutSession: async (
    organizationId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ) => {
    if (!stripe) {
      throw new Error("Stripe is not configured");
    }

    const db = getDb();
    // Get organization and admin user
    const orgDoc = await db.collection("organizations").doc(organizationId).get();
    if (!orgDoc.exists) {
      throw new Error("Organization not found");
    }

    const orgData = orgDoc.data();
    
    // Get admin user for email
    const usersSnapshot = await db
      .collection("users")
      .where("organizationId", "==", organizationId)
      .where("role", "==", "ADMIN")
      .limit(1)
      .get();

    const adminUser = usersSnapshot.empty ? null : usersSnapshot.docs[0].data();
    const customerEmail = adminUser?.email || `admin@${orgData?.name?.toLowerCase().replace(/\s+/g, "")}.com`;

    // Get or create customer
    const customer = await stripeService.getOrCreateCustomer(
      organizationId,
      customerEmail,
      orgData?.name || "Organization"
    );

    // Determine if organization is on free trial
    const isOnTrial = orgData?.subscriptionTier === "free" && orgData?.trialEnd;
    const trialEnd = orgData?.trialEnd 
      ? Math.floor(new Date(orgData.trialEnd).getTime() / 1000)
      : undefined;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          organizationId,
        },
        // If already on trial, preserve trial end date
        ...(isOnTrial && trialEnd ? { trial_end: trialEnd } : {}),
      },
      allow_promotion_codes: true,
      metadata: {
        organizationId,
      },
    });

    return session;
  },

  // Create customer portal session for subscription management
  createPortalSession: async (organizationId: string, returnUrl: string) => {
    if (!stripe) {
      throw new Error("Stripe is not configured");
    }

    const db = getDb();
    const orgDoc = await db.collection("organizations").doc(organizationId).get();
    if (!orgDoc.exists || !orgDoc.data()?.stripeCustomerId) {
      throw new Error("Organization or Stripe customer not found");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: orgDoc.data()!.stripeCustomerId!,
      return_url: returnUrl,
    });

    return session;
  },

  // Update organization subscription status from Stripe webhook
  updateSubscriptionStatus: async (
    organizationId: string,
    subscription: Stripe.Subscription
  ) => {
    const db = getDb();
    const updates: any = {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
    };

    // Determine tier based on subscription items
    const priceId = subscription.items.data[0]?.price.id;
    if (priceId === PRICE_IDS.starter) {
      updates.subscriptionTier = "starter";
    } else if (priceId === PRICE_IDS.professional) {
      updates.subscriptionTier = "professional";
    } else if (priceId === PRICE_IDS.business) {
      updates.subscriptionTier = "business";
    } else if (priceId === PRICE_IDS.enterprise) {
      updates.subscriptionTier = "enterprise";
    }

    // Update trial end if applicable
    if (subscription.trial_end) {
      updates.trialEnd = new Date(subscription.trial_end * 1000).toISOString();
    }

    await db.collection("organizations").doc(organizationId).update(updates);
  },

  // Cancel subscription
  cancelSubscription: async (organizationId: string) => {
    if (!stripe) {
      throw new Error("Stripe is not configured");
    }

    const db = getDb();
    const orgDoc = await db.collection("organizations").doc(organizationId).get();
    if (!orgDoc.exists || !orgDoc.data()?.stripeSubscriptionId) {
      throw new Error("Organization or subscription not found");
    }

    await stripe.subscriptions.cancel(orgDoc.data()!.stripeSubscriptionId!);

    // Update organization
    await orgDoc.ref.update({
      subscriptionTier: "free",
      subscriptionStatus: "canceled",
      stripeSubscriptionId: admin.firestore.FieldValue.delete(),
    });
  },
};

// Helper function to set trial period for new organizations
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

