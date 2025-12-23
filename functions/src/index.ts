import * as functions from "firebase-functions/v2/https";
import * as functionsV1 from "firebase-functions/v1";
import { defineString, defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import { Role, User, Organization, Match, Goal } from "./types";
import { emailService } from "./emailService";
import { stripeService, setTrialPeriod } from "./stripeService";
// ... (rest of imports)

// ...


import Stripe from "stripe";

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Define environment parameters (migrated from deprecated functions.config())
const serviceAccountEmail = defineString("GOOGLE_SERVICE_ACCOUNT_EMAIL", {
  description: "Google Service Account Email for Meet API",
});

const serviceAccountKey = defineSecret("GOOGLE_SERVICE_ACCOUNT_KEY");

// Helper function to generate organization code
const generateOrgCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Google OAuth Authentication Endpoint
export const authGoogle = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const {
        googleId,
        email,
        name,
        picture,
        organizationCode,
        isNewOrg,
        orgName,
        role: requestedRole,
      } = req.body;

      if (!googleId || !email || !name) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // If creating new organization
      if (isNewOrg && orgName) {
        const organizationCode = generateOrgCode();

        // Create organization
        const orgRef = db.collection("organizations").doc();
        await orgRef.set({
          name: orgName,
          domain: undefined,
          logo: null,
          accentColor: "#10b981",
          programSettings: {
            programName: orgName,
            logo: null,
            accentColor: "#10b981",
            introText: "Welcome to our mentorship program!",
            fields: [],
          },
          subscriptionTier: "free",
          organizationCode,
          createdAt: admin.firestore.Timestamp.now(),
        });

        const organizationId = orgRef.id;

        // Set trial period for new organization
        await setTrialPeriod(organizationId).catch((err) => {
          console.error("Failed to set trial period:", err);
          // Don't fail organization creation if trial setup fails
        });

        // Create admin user
        const userRef = db.collection("users").doc();
        await userRef.set({
          organizationId,
          name,
          email,
          role: requestedRole || Role.ADMIN, // Use requested role if provided (for custom admin onboarding)
          avatar:
            picture ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
          title: requestedRole === Role.ADMIN || !requestedRole ? "Administrator" : requestedRole,
          company: orgName,
          skills: [],
          bio: "",
          googleId,
          createdAt: admin.firestore.Timestamp.now(),
        });

        const userId = userRef.id;

        // Prepare response data
        const userData = {
          id: userId,
          organizationId,
          name,
          email,
          role: requestedRole || Role.ADMIN,
          avatar:
            picture ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
          title: requestedRole === Role.ADMIN || !requestedRole ? "Administrator" : requestedRole,
          company: orgName,
          skills: [],
          bio: "",
          googleId,
          createdAt: new Date().toISOString(),
        };

        // Note: Welcome email is now handled by onUserCreated trigger

        res.json({
          user: userData,
          organizationId,
          token: "mock-token", // In production, generate JWT token
        });
        return;
      }

      // If joining existing organization
      if (organizationCode) {
        const orgSnapshot = await db
          .collection("organizations")
          .where("organizationCode", "==", organizationCode.toUpperCase())
          .limit(1)
          .get();

        if (orgSnapshot.empty) {
          res.status(404).json({ error: "Organization not found" });
          return;
        }

        const orgDoc = orgSnapshot.docs[0];
        const organizationId = orgDoc.id;

        // Check if user already exists by Google ID
        let userSnapshot = await db
          .collection("users")
          .where("googleId", "==", googleId)
          .where("organizationId", "==", organizationId)
          .limit(1)
          .get();

        let userDoc = userSnapshot.empty ? null : userSnapshot.docs[0];

        // If not found by Google ID, check by email
        if (!userDoc) {
          userSnapshot = await db
            .collection("users")
            .where("email", "==", email)
            .where("organizationId", "==", organizationId)
            .limit(1)
            .get();
          userDoc = userSnapshot.empty ? null : userSnapshot.docs[0];
        }

        if (userDoc) {
          // Update existing user with Google ID if not set
          if (!userDoc.data().googleId) {
            await userDoc.ref.update({ googleId });
          }

          const userData = userDoc.data();
          const userResponse: User = {
            id: userDoc.id,
            ...(userData as Omit<User, 'id' | 'createdAt'>),
            createdAt:
              userData?.createdAt?.toDate().toISOString() ||
              new Date().toISOString(),
          };

          // Get organization data for welcome back email
          const orgData = orgDoc.data();
          const orgResponse: Organization = {
            id: orgDoc.id,
            ...(orgData as Omit<Organization, 'id' | 'createdAt'>),
            createdAt:
              orgData?.createdAt?.toDate().toISOString() ||
              new Date().toISOString(),
          };

          // Send welcome back email (don't await - send async)
          emailService.sendWelcomeBack(userResponse, orgResponse).catch((err) => {
            console.error("Failed to send welcome back email:", err);
          });

          res.json({
            user: userResponse,
            organizationId,
            token: "mock-token",
          });
          return;
        } else {
          // Create new user (role will be determined by requestedRole, default to MENTEE)
          const userRole = requestedRole || Role.MENTEE;
          const userRef = db.collection("users").doc();
          await userRef.set({
            organizationId,
            name,
            email,
            role: userRole,
            avatar:
              picture ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
            title: "",
            company: orgDoc.data()?.name || "",
            skills: [],
            bio: "",
            googleId,
            createdAt: admin.firestore.Timestamp.now(),
          });

          const userData = {
            id: userRef.id,
            organizationId,
            name,
            email,
            role: userRole,
            avatar:
              picture ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
            title: "",
            company: orgDoc.data()?.name || "",
            skills: [],
            bio: "",
            googleId,
            createdAt: new Date().toISOString(),
          };

          // Note: Welcome email is now handled by onUserCreated trigger

          res.json({
            user: userData,
            organizationId,
            token: "mock-token",
          });
          return;
        }
      }

      res
        .status(400)
        .json({ error: "Either organizationCode or isNewOrg must be provided" });
    } catch (error: any) {
      console.error("Auth error:", error);
      res
        .status(500)
        .json({ error: "Internal server error", message: error.message });
    }
  }
);

// Google Meet Link Creation Endpoint
export const createMeetLink = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
    secrets: [serviceAccountKey], // Reference the secret
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { endTime } = req.body;

      // Get service account credentials from params
      const email = serviceAccountEmail.value();
      const key = serviceAccountKey.value();

      if (!email || !key) {
        console.error("Missing service account credentials");
        res.status(500).json({ error: "Meet service not configured" });
        return;
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: email,
          private_key: key.replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/meetings.space.created"],
      });

      const meet = google.meet({
        version: "v2",
        auth: auth
      });

      // Create a new meeting space
      const meeting = await meet.spaces.create({
        requestBody: {
          config: {
            accessType: "OPEN",
            entryPointAccess: "CREATOR_APP",
          },
        },
      });

      if (!meeting.data.meetingUri) {
        throw new Error("Failed to create meeting");
      }

      // Extract meeting code from URI (format: https://meet.google.com/xxx-xxxx-xxx)
      const meetLink = meeting.data.meetingUri;
      const meetingCodeMatch = meetLink.match(/meet\.google\.com\/([a-z-]+)/);
      const meetingCode = meetingCodeMatch ? meetingCodeMatch[1] : undefined;

      res.json({
        meetLink,
        meetingCode,
        expiresAt: endTime || undefined,
      });
    } catch (error: any) {
      console.error("Error creating Meet link:", error);

      // If Meet API fails, return a fallback link format
      if (error.code === "ENOTFOUND" || error.message?.includes("meet")) {
        // Generate a temporary meeting code (for development)
        const tempCode = `temp-${Date.now().toString(36)}`;
        res.json({
          meetLink: `https://meet.google.com/${tempCode}`,
          meetingCode: tempCode,
          note: "Using temporary meeting link (Meet API not fully configured)",
        });
        return;
      }

      res.status(500).json({
        error: "Failed to create meeting",
        message: error.message,
      });
    }
  }
);

// Trigger when a new user is created
export const onUserCreated = functionsV1.firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    try {
      const userData = snap.data();
      const user: User = {
        id: snap.id,
        ...(userData as Omit<User, 'id'>),
      };

      // Get organization data
      const orgDoc = await db.collection("organizations").doc(user.organizationId).get();
      if (!orgDoc.exists) {
        console.error(`Organization ${user.organizationId} not found for new user ${user.id}`);
        return;
      }

      const orgData = orgDoc.data();
      const organization: Organization = {
        id: orgDoc.id,
        ...(orgData as Omit<Organization, 'id'>),
      };

      // Send welcome email based on role
      if (user.role === Role.ADMIN) {
        await emailService.sendWelcomeAdmin(user, organization);
      } else {
        await emailService.sendWelcomeParticipant(user, organization, user.role);
      }
    } catch (error: any) {
      console.error("Error in onUserCreated trigger:", error);
    }
  });

// Firestore triggers for email notifications
// Trigger when a match is created
export const onMatchCreated = functionsV1.firestore
  .document("matches/{matchId}")
  .onCreate(async (snap, context) => {
    try {
      const matchData = snap.data();
      const match: Match = {
        id: snap.id,
        ...(matchData as Omit<Match, 'id'>),
      };

      // Get mentor and mentee user data
      const mentorDoc = await db.collection("users").doc(match.mentorId).get();
      const menteeDoc = await db.collection("users").doc(match.menteeId).get();
      const orgDoc = await db.collection("organizations").doc(match.organizationId).get();

      if (!mentorDoc.exists || !menteeDoc.exists || !orgDoc.exists) {
        console.error("Missing user or organization data for match email");
        return;
      }

      const mentorData = mentorDoc.data();
      const menteeData = menteeDoc.data();
      // const orgData = orgDoc.data(); // Unused

      const mentor: User = {
        id: mentorDoc.id,
        ...(mentorData as Omit<User, 'id' | 'createdAt'>),
        createdAt: mentorData?.createdAt?.toDate().toISOString() || new Date().toISOString(),
      };

      const mentee: User = {
        id: menteeDoc.id,
        ...(menteeData as Omit<User, 'id' | 'createdAt'>),
        createdAt: menteeData?.createdAt?.toDate().toISOString() || new Date().toISOString(),
      };

      // Send email to both mentor and mentee
      const matchForEmail: Match = {
        id: match.id,
        organizationId: match.organizationId,
        mentorId: match.mentorId,
        menteeId: match.menteeId,
        status: match.status,
        startDate: match.startDate,
      };

      // Send to mentor
      emailService.sendMatchCreated(mentor, matchForEmail, mentor, mentee).catch((err) => {
        console.error("Failed to send match email to mentor:", err);
      });

      // Send to mentee
      emailService.sendMatchCreated(mentee, matchForEmail, mentor, mentee).catch((err) => {
        console.error("Failed to send match email to mentee:", err);
      });
    } catch (error: any) {
      console.error("Error in onMatchCreated trigger:", error);
    }
  });

// Trigger when a goal is updated to "Completed"
export const onGoalCompleted = functionsV1.firestore
  .document("goals/{goalId}")
  .onUpdate(async (change, context) => {
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();

      // Only send email if status changed to "Completed"
      if (beforeData.status !== "Completed" && afterData.status === "Completed") {
        const goal: Goal = {
          id: change.after.id,
          ...(afterData as Omit<Goal, "id">),
        };

        // Get user data
        const userDoc = await db.collection("users").doc(goal.userId).get();

        if (!userDoc.exists) {
          console.error("User not found for goal completion email");
          return;
        }

        const userData = userDoc.data();
        if (!userData) return;

        const user: User = {
          id: userDoc.id,
          ...(userData as Omit<User, 'id'>),
          // Ensure createdAt is a string
          createdAt: userData.createdAt instanceof admin.firestore.Timestamp
            ? userData.createdAt.toDate().toISOString()
            : typeof userData.createdAt === 'string'
              ? userData.createdAt
              : new Date().toISOString(),
        } as User;

        const goalForEmail = {
          id: goal.id,
          userId: goal.userId,
          organizationId: goal.organizationId,
          title: goal.title,
          description: goal.description,
          progress: goal.progress,
          status: goal.status,
          dueDate: goal.dueDate,
        };

        // Send goal completed email
        emailService.sendGoalCompleted(user, goalForEmail).catch((err) => {
          console.error("Failed to send goal completed email:", err);
        });
      }
    } catch (error: any) {
      console.error("Error in onGoalCompleted trigger:", error);
    }
  });

// Stripe Checkout Session Creation Endpoint
export const createCheckoutSession = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { organizationId, tier } = req.body;

      if (!organizationId || !tier) {
        res.status(400).json({ error: "Missing required fields: organizationId and tier" });
        return;
      }

      if (tier !== "starter" && tier !== "professional" && tier !== "business" && tier !== "enterprise") {
        res.status(400).json({ error: "Invalid tier. Must be 'starter', 'professional', 'business', or 'enterprise'" });
        return;
      }

      let priceId: string;
      if (tier === "starter") {
        priceId = process.env.STRIPE_PRICE_ID_STARTER || "price_starter_monthly";
      } else if (tier === "professional") {
        priceId = process.env.STRIPE_PRICE_ID_PROFESSIONAL || "price_professional_monthly";
      } else if (tier === "business") {
        priceId = process.env.STRIPE_PRICE_ID_BUSINESS || "price_business_monthly";
      } else {
        priceId = process.env.STRIPE_PRICE_ID_ENTERPRISE || "price_enterprise_monthly";
      }

      const appUrl = process.env.VITE_APP_URL || "https://meant2grow.com";
      const successUrl = `${appUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}&success=true`;
      const cancelUrl = `${appUrl}/settings/billing?canceled=true`;

      const session = await stripeService.createCheckoutSession(
        organizationId,
        priceId,
        successUrl,
        cancelUrl
      );

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session", message: error.message });
    }
  }
);

// Stripe Customer Portal Session Creation Endpoint
export const createPortalSession = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { organizationId } = req.body;

      if (!organizationId) {
        res.status(400).json({ error: "Missing required field: organizationId" });
        return;
      }

      const appUrl = process.env.VITE_APP_URL || "https://meant2grow.com";
      const returnUrl = `${appUrl}/settings/billing`;

      const session = await stripeService.createPortalSession(organizationId, returnUrl);

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to create portal session", message: error.message });
    }
  }
);

// Stripe Webhook Handler
// Note: This endpoint must receive raw body for signature verification
export const stripeWebhook = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
  },
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not set");
      res.status(500).json({ error: "Webhook secret not configured" });
      return;
    }

    let event: Stripe.Event;

    try {
      // Get raw body for signature verification
      // In Firebase Functions v2, req.body is already a Buffer for binary content
      const body = typeof req.body === "string" ? Buffer.from(req.body) : req.body;

      // Verify webhook signature
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2025-11-17.clover",
      });

      event = stripe.webhooks.constructEvent(
        body,
        sig as string,
        webhookSecret
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      // Handle different event types
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const organizationId = session.metadata?.organizationId;

          if (organizationId && session.subscription) {
            // Retrieve subscription to update organization
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
              apiVersion: "2025-11-17.clover",
            });
            const subscription = await stripe.subscriptions.retrieve(
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription.id
            );
            await stripeService.updateSubscriptionStatus(organizationId, subscription);
          }
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const organizationId = subscription.metadata?.organizationId;

          if (organizationId) {
            await stripeService.updateSubscriptionStatus(organizationId, subscription);
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const organizationId = subscription.metadata?.organizationId;

          if (organizationId) {
            // Update organization to free tier
            await db.collection("organizations").doc(organizationId).update({
              subscriptionTier: "free",
              subscriptionStatus: "canceled",
              stripeSubscriptionId: admin.firestore.FieldValue.delete(),
            });
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as any; // Cast to any to access subscription expansion
          const subscriptionId = invoice.subscription
            ? (typeof invoice.subscription === "string"
              ? invoice.subscription
              : (invoice.subscription as Stripe.Subscription).id)
            : null;

          if (subscriptionId) {
            // Find organization by subscription ID
            const orgsSnapshot = await db
              .collection("organizations")
              .where("stripeSubscriptionId", "==", subscriptionId)
              .limit(1)
              .get();

            if (!orgsSnapshot.empty) {
              const orgDoc = orgsSnapshot.docs[0];
              await orgDoc.ref.update({
                subscriptionStatus: "active",
              });
            }
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as any; // Cast to any to access subscription expansion
          const subscriptionId = invoice.subscription
            ? (typeof invoice.subscription === "string"
              ? invoice.subscription
              : (invoice.subscription as Stripe.Subscription).id)
            : null;

          if (subscriptionId) {
            // Find organization by subscription ID
            const orgsSnapshot = await db
              .collection("organizations")
              .where("stripeSubscriptionId", "==", subscriptionId)
              .limit(1)
              .get();

            if (!orgsSnapshot.empty) {
              const orgDoc = orgsSnapshot.docs[0];
              await orgDoc.ref.update({
                subscriptionStatus: "past_due",
              });
            }
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Webhook processing failed", message: error.message });
    }
  }
);

// Scheduled function to check for expiring trials and send reminder emails
export const checkExpiringTrials = functionsV1.pubsub
  .schedule("every 24 hours")
  .timeZone("America/New_York")
  .onRun(async (context) => {
    try {
      const now = new Date();

      // Find organizations with trials ending in 3 days
      const orgsSnapshot = await db
        .collection("organizations")
        .where("subscriptionTier", "==", "free")
        .where("subscriptionStatus", "==", "trialing")
        .get();

      for (const orgDoc of orgsSnapshot.docs) {
        const orgData = orgDoc.data();
        if (!orgData.trialEnd) continue;

        const trialEndDate = new Date(orgData.trialEnd);
        const daysRemaining = Math.ceil(
          (trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Send email if trial ends in 3 days or 1 day
        if (daysRemaining === 3 || daysRemaining === 1) {
          // Get admin user
          const usersSnapshot = await db
            .collection("users")
            .where("organizationId", "==", orgDoc.id)
            .where("role", "==", "ADMIN")
            .limit(1)
            .get();

          if (!usersSnapshot.empty) {
            const adminUser = usersSnapshot.docs[0].data();
            const user: User = {
              id: usersSnapshot.docs[0].id,
              ...(adminUser as Omit<User, 'id' | 'createdAt'>),
              createdAt: adminUser?.createdAt?.toDate().toISOString() || new Date().toISOString(),
            };

            const organization: Organization = {
              id: orgDoc.id,
              ...(orgData as Omit<Organization, 'id' | 'createdAt'>),
              createdAt: orgData?.createdAt?.toDate().toISOString() || new Date().toISOString(),
            };

            // Send trial ending email
            emailService.sendTrialEnding(user, organization, daysRemaining).catch((err) => {
              console.error(`Failed to send trial ending email for org ${orgDoc.id}:`, err);
            });
          }
        }
      }

      console.log(`Checked ${orgsSnapshot.size} organizations for expiring trials`);
    } catch (error: any) {
      console.error("Error checking expiring trials:", error);
    }
  });

// Google Calendar Sync Endpoint
export const syncCalendarEvent = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { action, event, eventId, accessToken, timeMin, timeMax } = req.body;

      if (!accessToken) {
        res.status(400).json({ error: "Access token required" });
        return;
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const calendar = google.calendar({ version: "v3", auth });

      switch (action) {
        case "create": {
          if (!event) {
            res.status(400).json({ error: "Event data required" });
            return;
          }

          const createdEvent = await calendar.events.insert({
            calendarId: "primary",
            requestBody: event,
            conferenceDataVersion: event.conferenceData ? 1 : 0,
          });

          res.json({ eventId: createdEvent.data.id });
          break;
        }

        case "update": {
          if (!event || !event.id) {
            res.status(400).json({ error: "Event data and ID required" });
            return;
          }

          await calendar.events.update({
            calendarId: "primary",
            eventId: event.id,
            requestBody: event,
            conferenceDataVersion: event.conferenceData ? 1 : 0,
          });

          res.json({ success: true });
          break;
        }

        case "delete": {
          if (!eventId) {
            res.status(400).json({ error: "Event ID required" });
            return;
          }

          await calendar.events.delete({
            calendarId: "primary",
            eventId,
          });

          res.json({ success: true });
          break;
        }

        case "list": {
          const response = await calendar.events.list({
            calendarId: "primary",
            timeMin: timeMin || new Date().toISOString(),
            timeMax: timeMax,
            maxResults: 100,
            singleEvents: true,
            orderBy: "startTime",
          });

          res.json({ events: response.data.items || [] });
          break;
        }

        default:
          res.status(400).json({ error: "Invalid action" });
      }
    } catch (error: any) {
      console.error("Calendar sync error:", error);
      res.status(500).json({
        error: "Failed to sync calendar",
        message: error.message,
      });
    }
  }
);

// Scheduled function to check for upcoming meetings and send reminders
export const checkMeetingReminders = functionsV1.pubsub
  .schedule("every 1 hours")
  .timeZone("America/New_York")
  .onRun(async (context) => {
    try {
      const now = new Date();
      // const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // Unused
      // const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Unused

      // Get all calendar events that start within the next 24 hours
      const eventsSnapshot = await db
        .collection("calendarEvents")
        .where("date", ">=", now.toISOString().split("T")[0])
        .get();

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const eventDate = new Date(`${eventData.date}T${eventData.startTime}`);

        // Skip if event is in the past
        if (eventDate < now) continue;

        // Calculate time until event
        const hoursUntil = Math.floor((eventDate.getTime() - now.getTime()) / (60 * 60 * 1000));

        // Check if reminders have already been sent
        const reminders24hSent = eventData.reminder24hSent || false;
        const reminders1hSent = eventData.reminder1hSent || false;

        // Send reminder if:
        // - 24 hours before (and we haven't sent it yet)
        // - 1 hour before (and we haven't sent it yet)
        if (hoursUntil <= 24 && hoursUntil > 23 && !reminders24hSent) {
          // 24-hour reminder
          await sendMeetingReminders(eventDoc.id, eventData, 24);
          // Mark as sent
          await eventDoc.ref.update({ reminder24hSent: true });
        } else if (hoursUntil <= 1 && hoursUntil > 0 && !reminders1hSent) {
          // 1-hour reminder
          await sendMeetingReminders(eventDoc.id, eventData, 1);
          // Mark as sent
          await eventDoc.ref.update({ reminder1hSent: true });
        }
      }

      console.log(`Checked ${eventsSnapshot.size} events for reminders`);
    } catch (error: any) {
      console.error("Error checking meeting reminders:", error);
    }
  });

// Microsoft Outlook Calendar Sync Endpoint
export const syncOutlookCalendar = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { action, event, eventId, accessToken, startDateTime, endDateTime } = req.body;

      if (!accessToken) {
        res.status(400).json({ error: "Access token required" });
        return;
      }

      const graphUrl = "https://graph.microsoft.com/v1.0";

      switch (action) {
        case "create": {
          if (!event) {
            res.status(400).json({ error: "Event data required" });
            return;
          }

          const response = await fetch(`${graphUrl}/me/calendar/events`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "Failed to create Outlook event");
          }

          const createdEvent = await response.json();
          res.json({ eventId: createdEvent.id });
          break;
        }

        case "update": {
          if (!event || !event.id) {
            res.status(400).json({ error: "Event data and ID required" });
            return;
          }

          const response = await fetch(`${graphUrl}/me/calendar/events/${event.id}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "Failed to update Outlook event");
          }

          res.json({ success: true });
          break;
        }

        case "delete": {
          if (!eventId) {
            res.status(400).json({ error: "Event ID required" });
            return;
          }

          const response = await fetch(`${graphUrl}/me/calendar/events/${eventId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!response.ok && response.status !== 404) {
            const error = await response.json();
            throw new Error(error.error?.message || "Failed to delete Outlook event");
          }

          res.json({ success: true });
          break;
        }

        case "list": {
          const filter = `start/dateTime ge '${startDateTime}'${endDateTime ? ` and end/dateTime le '${endDateTime}'` : ''}`;
          const response = await fetch(
            `${graphUrl}/me/calendar/events?$filter=${encodeURIComponent(filter)}&$orderby=start/dateTime&$top=100`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "Failed to list Outlook events");
          }

          const data = await response.json();
          res.json({ events: data.value || [] });
          break;
        }

        default:
          res.status(400).json({ error: "Invalid action" });
      }
    } catch (error: any) {
      console.error("Outlook calendar sync error:", error);
      res.status(500).json({
        error: "Failed to sync Outlook calendar",
        message: error.message,
      });
    }
  }
);

// Microsoft Outlook OAuth Token Exchange
export const outlookAuth = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { code } = req.body;

      if (!code) {
        res.status(400).json({ error: "Authorization code required" });
        return;
      }

      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.VITE_APP_URL || 'https://meant2grow.com'}/auth/outlook/callback`;

      if (!clientId || !clientSecret) {
        res.status(500).json({ error: "Microsoft OAuth not configured" });
        return;
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.error_description || "Failed to exchange token");
      }

      const tokens = await tokenResponse.json();

      res.json({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + (tokens.expires_in * 1000),
      });
    } catch (error: any) {
      console.error("Outlook auth error:", error);
      res.status(500).json({
        error: "Failed to authenticate with Outlook",
        message: error.message,
      });
    }
  }
);

// Apple Calendar Sync Endpoint (using CalDAV or third-party service)
export const syncAppleCalendar = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { action, event, eventId, credentials, startDateTime, endDateTime } = req.body;

      if (!credentials || !credentials.accessToken) {
        res.status(400).json({ error: "Credentials required" });
        return;
      }

      // Check if using third-party service
      const useThirdParty = process.env.USE_APPLE_CALENDAR_SERVICE === "true";
      const serviceUrl = process.env.APPLE_CALENDAR_SERVICE_URL;

      if (useThirdParty && serviceUrl) {
        // Use third-party unified API
        const response = await fetch(`${serviceUrl}/api/calendar`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            event,
            eventId,
            startDateTime,
            endDateTime,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to sync Apple calendar");
        }

        const data = await response.json();
        res.json(data);
        return;
      }

      // Otherwise, use CalDAV (requires CalDAV server implementation)
      // For now, return a helpful error message
      res.status(501).json({
        error: "Apple Calendar integration requires CalDAV server or third-party service",
        message: "Please configure USE_APPLE_CALENDAR_SERVICE and APPLE_CALENDAR_SERVICE_URL, or implement CalDAV server",
      });
    } catch (error: any) {
      console.error("Apple calendar sync error:", error);
      res.status(500).json({
        error: "Failed to sync Apple calendar",
        message: error.message,
      });
    }
  }
);

// Helper function to send reminders to all participants
async function sendMeetingReminders(
  eventId: string,
  eventData: any,
  hoursUntil: number
) {
  const participants = eventData.participants || [];

  // Include mentor and mentee if they exist
  const allParticipantIds = new Set<string>(participants);
  if (eventData.mentorId) allParticipantIds.add(eventData.mentorId);
  if (eventData.menteeId) allParticipantIds.add(eventData.menteeId);

  for (const userId of allParticipantIds) {
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();
      const user: User = {
        id: userDoc.id,
        ...(userData as Omit<User, 'id' | 'createdAt'>),
        createdAt: userData?.createdAt?.toDate().toISOString() || new Date().toISOString(),
      };

      // Send email reminder
      emailService.sendMeetingReminder(
        user,
        {
          title: eventData.title,
          date: eventData.date,
          startTime: eventData.startTime,
          duration: eventData.duration,
          googleMeetLink: eventData.googleMeetLink,
          participants: eventData.participants,
        },
        hoursUntil
      ).catch((err) => {
        console.error(`Failed to send meeting reminder to ${userId}:`, err);
      });

      // Create in-app notification
      await db.collection("notifications").add({
        organizationId: eventData.organizationId,
        userId,
        type: "meeting",
        title: `Meeting Reminder: ${eventData.title}`,
        body: `Your meeting "${eventData.title}" starts in ${hoursUntil === 24 ? '24 hours' : '1 hour'}.`,
        isRead: false,
        timestamp: admin.firestore.Timestamp.now(),
      });
    } catch (error: any) {
      console.error(`Error sending reminder to user ${userId}:`, error);
    }
  }
}

