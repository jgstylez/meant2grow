import * as functions from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString, defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import * as crypto from "crypto";
import { Role, User, Organization, Match, Goal } from "./types";
import { createEmailService } from "./emailService";
import { setTrialPeriod } from "./organizationUtils";
import { getErrorMessage, getErrorCode, formatError } from "./utils/errors";
import { mintParticipantToken, videosdkCreateRoom } from "./videoSdk";
import { checkVideoCallSessionRateLimit } from "./videoCallRateLimit";
import { agentDebugLog } from "./agentDebugLog";

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Detect environment from Firebase project ID
const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || admin.app().options.projectId || '';
const isProduction = projectId.includes('prod') || projectId === 'meant2grow-prod';
// const isSandbox = projectId.includes('dev') || projectId === 'meant2grow-dev' || !isProduction;

// Define environment parameters (migrated from deprecated functions.config())
const serviceAccountEmail = defineString("GOOGLE_SERVICE_ACCOUNT_EMAIL", {
  description: "Google Service Account Email for Meet API",
});

const serviceAccountKey = defineSecret("GOOGLE_SERVICE_ACCOUNT_KEY");

const videoSdkApiKey = defineString("VIDEO_SDK_API_KEY", {
  description: "VideoSDK API key (dashboard)",
  default: "",
});

const videoSdkSecret = defineSecret("VIDEO_SDK_SECRET");

// Email provider: "resend" (default) or "mailersend".
const emailProvider = defineString("EMAIL_PROVIDER", {
  description: "Email provider: resend (default) or mailersend",
  default: "resend",
});

const resendApiKey = defineString("RESEND_API_KEY", {
  description: "Resend API key (re_...); primary when EMAIL_PROVIDER=resend",
  default: "",
});

// MailerSend: required when EMAIL_PROVIDER=mailersend; optional fallback when using Resend
const mailerSendApiToken = defineString("MAILERSEND_API_TOKEN", {
  description:
    "MailerSend API token (required for mailersend-only mode; optional backup with Resend)",
  default: "",
});

// Shared email config (used by both providers)
const emailFrom = defineString("MAILERSEND_FROM_EMAIL", {
  description: "From email (must be verified in your provider)",
  default: "noreply@meant2grow.com",
});

const emailReplyTo = defineString("MAILERSEND_REPLY_TO_EMAIL", {
  description: "Reply-to email",
  default: "support@meant2grow.com",
});

const appUrl = defineString("VITE_APP_URL", {
  description: "Application URL for email links",
  default: isProduction ? "https://meant2grow.com" : "https://sandbox.meant2grow.com",
});

/**
 * Gen-2 HTTPS defaults use 1 vCPU each; many functions in one region can hit
 * "Quota exceeded for total allowable CPU per project per region" on smaller GCP projects.
 * Fractional CPU requires concurrency 1 (see firebase-functions GlobalOptions).
 */
const LIGHT_HTTP_RUNTIME = {
  memory: "256MiB" as const,
  cpu: 0.08333333333333333,
  concurrency: 1,
  maxInstances: 10,
};

const BACKGROUND_V2_RUNTIME = {
  region: "us-central1" as const,
  ...LIGHT_HTTP_RUNTIME,
};

// Helper function to get email service instance with current config values
const getEmailService = () => {
  const raw = (emailProvider.value() || "resend").toLowerCase();
  if (raw === "mailtrap") {
    console.warn(
      '⚠️ EMAIL_PROVIDER=mailtrap is removed; use "resend" (default) or "mailersend". Using MailerSend for this deploy.'
    );
  }
  const mode: "resend" | "mailersend" =
    raw === "mailersend" || raw === "mailtrap" ? "mailersend" : "resend";
  const resendKey = (resendApiKey.value() || "").trim();
  const mailersendKey = (mailerSendApiToken.value() || "").trim();
  const fromEmail = emailFrom.value();
  const replyToEmail = emailReplyTo.value();
  const appUrlValue = appUrl.value();

  let providerName: "resend" | "mailersend";
  let apiToken: string;
  let backupMailersendApiToken: string | undefined;

  if (mode === "mailersend") {
    providerName = "mailersend";
    apiToken = mailersendKey;
    backupMailersendApiToken = undefined;
  } else if (resendKey) {
    providerName = "resend";
    apiToken = resendKey;
    backupMailersendApiToken = mailersendKey || undefined;
  } else if (mailersendKey) {
    console.warn(
      "⚠️ RESEND_API_KEY not set; sending via MailerSend only (set RESEND_API_KEY to use Resend as primary)."
    );
    providerName = "mailersend";
    apiToken = mailersendKey;
    backupMailersendApiToken = undefined;
  } else {
    providerName = "resend";
    apiToken = "";
    backupMailersendApiToken = undefined;
  }

  if (!apiToken) {
    console.warn(
      "⚠️ No email API token configured (RESEND_API_KEY or MAILERSEND_API_TOKEN). Email sending will fail."
    );
  }
  if (!fromEmail) {
    console.warn("⚠️ From email not configured. Email sending may fail.");
  }
  if (!appUrlValue) {
    console.warn("⚠️ VITE_APP_URL not configured. Email links may be incorrect.");
  }

  console.log("📧 Email service configuration:", {
    provider: providerName,
    hasMailersendBackup: !!backupMailersendApiToken,
    hasApiToken: !!apiToken,
    apiTokenLength: apiToken?.length || 0,
    fromEmail: fromEmail || "NOT SET",
    replyToEmail: replyToEmail || "NOT SET",
    appUrl: appUrlValue || "NOT SET",
  });

  return createEmailService({
    provider: providerName,
    apiToken: apiToken || "",
    backupMailersendApiToken,
    fromEmail: fromEmail || "",
    replyToEmail: replyToEmail || "support@meant2grow.com",
    appUrl: appUrlValue || "https://meant2grow.com",
  });
};

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
        organizationCode, // Deprecated - kept for backward compatibility
        invitationToken, // New: invitation token for joining via invite
        isNewOrg,
        orgName,
        role: requestedRole,
        // Explicitly reject impersonation-related parameters to prevent confusion with invitation tokens
        isImpersonating,
        originalOperatorId,
        originalOrganizationId,
        impersonateUserId,
      } = req.body;

      // Security: Explicitly reject any impersonation-related parameters
      // Impersonation is a client-side feature only and should never be sent to backend
      if (isImpersonating || originalOperatorId || originalOrganizationId || impersonateUserId) {
        res.status(400).json({ 
          error: "Impersonation parameters are not allowed in authentication requests. Impersonation is a client-side feature only." 
        });
        return;
      }

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

      // If joining existing organization via invitation token (preferred)
      if (invitationToken) {
        // Security: Ensure invitation tokens are ONLY used for actual invitations
        // Reject if token format looks suspicious (e.g., user IDs that might be confused with impersonation)
        if (invitationToken.length < 20) {
          res.status(400).json({ 
            error: "Invalid invitation token format. Invitation tokens must be at least 20 characters long." 
          });
          return;
        }

        // Look up invitation by token
        const invitationSnapshot = await db
          .collection("invitations")
          .where("token", "==", invitationToken)
          .where("status", "==", "Pending")
          .limit(1)
          .get();

        if (invitationSnapshot.empty) {
          res.status(404).json({ error: "Invalid or expired invitation" });
          return;
        }

        const invitationDoc = invitationSnapshot.docs[0];
        const invitationData = invitationDoc.data();

        // Check expiration
        if (invitationData.expiresAt) {
          const expiresAt = invitationData.expiresAt.toDate();
          if (expiresAt < new Date()) {
            await invitationDoc.ref.update({ status: "Expired" });
            res.status(400).json({ error: "Invitation has expired" });
            return;
          }
        }

        // Verify email matches invitation
        if (invitationData.email && invitationData.email.toLowerCase() !== email.toLowerCase()) {
          res.status(400).json({ 
            error: `This invitation is for ${invitationData.email}. Please sign in with that email address.` 
          });
          return;
        }

        const organizationId = invitationData.organizationId;
        const invitationRole = invitationData.role || requestedRole || Role.MENTEE;

        // Get organization
        const orgDoc = await db.collection("organizations").doc(organizationId).get();
        if (!orgDoc.exists) {
          res.status(404).json({ error: "Organization not found" });
          return;
        }

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

          // Mark invitation as accepted
          await invitationDoc.ref.update({ status: "Accepted" });

          // Send welcome back email (don't await - send async)
          getEmailService().sendWelcomeBack(userResponse, orgResponse).catch((err) => {
            console.error("Failed to send welcome back email:", err);
          });

          res.json({
            user: userResponse,
            organizationId,
            token: "mock-token",
          });
          return;
        } else {
          // Create new user with role from invitation
          const userRole = invitationRole;
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

          // Mark invitation as accepted
          await invitationDoc.ref.update({ status: "Accepted" });

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

      // Legacy: If joining existing organization via organization code (deprecated)
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
          getEmailService().sendWelcomeBack(userResponse, orgResponse).catch((err) => {
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
        .json({ error: "Either invitationToken, organizationCode, or isNewOrg must be provided" });
    } catch (error: unknown) {
      console.error("Auth error:", formatError(error));
      res
        .status(500)
        .json({ error: "Internal server error", message: getErrorMessage(error) });
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
    } catch (error: unknown) {
      console.error("Error creating Meet link:", formatError(error));

      // If Meet API fails, return a fallback link format
      const errorCode = getErrorCode(error);
      const errorMessage = getErrorMessage(error);
      if (errorCode === "ENOTFOUND" || errorMessage.includes("meet")) {
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
        message: errorMessage,
      });
    }
  }
);

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,128}$/;
const PARTICIPANT_TOKEN_TTL = 7200;

// In-app video (VideoSDK): mint room + participant token; requires Firebase ID token.
// invoker must be public so browser CORS preflight (OPTIONS) reaches the function; auth is enforced via ID token below.
export const videoCallSession = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
    invoker: "public",
    secrets: [videoSdkSecret],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized", message: "Sign in required for video calls." });
        return;
      }
      const idToken = authHeader.slice(7);
      if (!idToken || idToken === "simulated-token") {
        res.status(401).json({ error: "Unauthorized", message: "Sign in required for video calls." });
        return;
      }

      let uid: string;
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        uid = decoded.uid;
      } catch {
        res.status(401).json({ error: "Unauthorized", message: "Invalid session. Please sign in again." });
        return;
      }

      const rate = checkVideoCallSessionRateLimit(uid);
      if (!rate.ok) {
        logger.warn("videoCallSession.rate_limited", {
          uid,
          retryAfterSec: rate.retryAfterSec,
        });
        res.status(429).json({
          error: "Too many requests",
          message: "Too many video session requests. Please wait a moment and try again.",
          retryAfterSec: rate.retryAfterSec,
        });
        return;
      }

      const apiKey = videoSdkApiKey.value();
      const secret = videoSdkSecret.value();
      if (!apiKey || !secret) {
        console.error("VideoSDK credentials missing");
        res.status(500).json({ error: "Video service not configured" });
        return;
      }

      const body = (req.body || {}) as { meetingId?: string };
      let roomId: string;

      if (body.meetingId && typeof body.meetingId === "string") {
        const trimmed = body.meetingId.trim();
        if (!ROOM_ID_PATTERN.test(trimmed)) {
          res.status(400).json({ error: "Invalid meeting id" });
          return;
        }
        roomId = trimmed;
      } else {
        roomId = await videosdkCreateRoom(apiKey, secret);
      }

      const token = mintParticipantToken(
        apiKey,
        secret,
        roomId,
        uid,
        PARTICIPANT_TOKEN_TTL
      );

      const createdNewRoom = !body.meetingId || typeof body.meetingId !== "string";
      logger.info("videoCallSession.token_minted", {
        uid,
        roomId,
        createdNewRoom,
        participantId: uid,
      });

      res.json({
        meetingId: roomId,
        token,
        participantId: uid,
      });
    } catch (error: unknown) {
      console.error("videoCallSession error:", formatError(error));
      res.status(500).json({
        error: "Video call failed",
        message: getErrorMessage(error),
      });
    }
  }
);

// Admin email endpoint - allows admins to send emails to mentors/mentees
export const sendAdminEmail = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
    ...LIGHT_HTTP_RUNTIME,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { recipients, subject, body, fromAdmin, adminUserId, organizationId } = req.body;

      // Validate required fields
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        res.status(400).json({ error: "Recipients array is required" });
        return;
      }

      if (!subject || !body) {
        res.status(400).json({ error: "Subject and body are required" });
        return;
      }

      // Verify admin permissions if adminUserId is provided
      let isPlatformOperator = false;
      if (adminUserId) {
        const adminDoc = await db.collection("users").doc(adminUserId).get();
        if (!adminDoc.exists) {
          res.status(403).json({ error: "Admin user not found" });
          return;
        }

        const adminData = adminDoc.data();
        const adminRole = adminData?.role;
        const adminOrgId = adminData?.organizationId;

        // Check if user is an admin and belongs to the organization
        const isAdmin = adminRole === Role.ADMIN || adminRole === "ORGANIZATION_ADMIN" || adminRole === "ADMIN";
        isPlatformOperator = adminRole === Role.PLATFORM_OPERATOR || adminRole === "PLATFORM_OPERATOR";

        if (!isAdmin && !isPlatformOperator) {
          res.status(403).json({ error: "Only admins can send emails" });
          return;
        }

        // For organization admins, verify they belong to the same organization (if organizationId is provided)
        if (!isPlatformOperator && organizationId && adminOrgId !== organizationId) {
          res.status(403).json({ error: "Unauthorized: Admin does not belong to this organization" });
          return;
        }

        // Verify all recipients belong to the same organization (for organization admins only)
        if (!isPlatformOperator && organizationId) {
          const recipientIds = recipients
            .map((r: any) => r.userId)
            .filter((id: string) => id);
          
          if (recipientIds.length > 0) {
            const recipientDocs = await Promise.all(
              recipientIds.map((id: string) => db.collection("users").doc(id).get())
            );
            
            const invalidRecipients = recipientDocs.filter(
              (doc) => !doc.exists || doc.data()?.organizationId !== organizationId
            );
            
            if (invalidRecipients.length > 0) {
              res.status(403).json({ error: "All recipients must belong to your organization" });
              return;
            }
          }
        }
      }

      // Send email to all recipients
      await getEmailService().sendCustomEmail(recipients, subject, body, fromAdmin, isPlatformOperator);

      res.json({ success: true, message: `Email sent to ${recipients.length} recipient(s)` });
    } catch (error: unknown) {
      console.error("Error sending admin email:", formatError(error));
      res.status(500).json({
        error: "Failed to send email",
        message: getErrorMessage(error),
      });
    }
  }
);

// Password reset email endpoint
export const sendPasswordResetEmail = functions.onRequest(
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
      const { email, resetUrl, userName } = req.body;

      if (!email || !resetUrl) {
        res.status(400).json({ error: "Email and reset URL are required" });
        return;
      }

      const emailService = getEmailService();
      
      try {
        await emailService.sendPasswordReset(email, resetUrl, userName || "User");
        console.log(`✅ Password reset email sent successfully to ${email}`);
        res.status(200).json({ message: "Password reset email sent successfully" });
      } catch (emailError: unknown) {
        // Log detailed error for debugging
        console.error(`❌ Error sending password reset email to ${email}:`, {
          email,
          resetUrl,
          error: formatError(emailError),
          errorDetails: emailError,
        });
        
        // Return error but don't fail the request - token is still created
        // User can manually use the reset URL if email fails
        res.status(200).json({ 
          message: "Password reset link created. If email delivery fails, contact support.",
          resetUrl: resetUrl, // Include reset URL in response for manual use
          warning: "Email delivery may have failed. Check logs for details.",
          error: getErrorMessage(emailError),
        });
      }
    } catch (error: unknown) {
      console.error("Error in sendPasswordResetEmail function:", error);
      res.status(500).json({ error: "Failed to process password reset request", message: formatError(error) });
    }
  }
);

// Forgot password endpoint - handles password reset requests
export const forgotPassword = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
    ...LIGHT_HTTP_RUNTIME,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      // Normalize email
      const normalizedEmail = email.trim().toLowerCase();

      // Check if user exists
      const usersRef = db.collection("users");
      const userQuery = await usersRef.where("email", "==", normalizedEmail).limit(1).get();

      if (userQuery.empty) {
        // Don't reveal if email exists - return success anyway for security
        res.status(200).json({ message: "If an account exists, a password reset link has been sent." });
        return;
      }

      const userDoc = userQuery.docs[0];
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userName = userData.name || "User";

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      // Store reset token in Firestore
      await db.collection("passwordResetTokens").doc(resetToken).set({
        userId,
        email: normalizedEmail,
        createdAt: admin.firestore.Timestamp.now(),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        used: false,
      });

      // Generate reset URL
      const resetAppUrl = process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://meant2grow.com";
      // Use query params - the app will detect the token and route to reset-password
      const resetUrl = `${resetAppUrl}/?reset-password&token=${resetToken}`;

      // Send password reset email via email service
      try {
        const emailService = getEmailService();
        await emailService.sendPasswordReset(normalizedEmail, resetUrl, userName);
        console.log(`✅ Password reset email sent successfully to ${normalizedEmail}`);
      } catch (emailError: unknown) {
        // Log detailed error for debugging
        const errorMessage = getErrorMessage(emailError);
        const errorCode = getErrorCode(emailError);
        console.error("❌ Failed to send password reset email:", {
          email: normalizedEmail,
          resetUrl,
          error: formatError(emailError),
          errorMessage,
          errorCode,
          errorDetails: emailError instanceof Error ? {
            message: emailError.message,
            stack: emailError.stack,
            name: emailError.name,
          } : emailError,
        });
        // Log reset URL for manual use if email fails
        console.log(`🔗 Password reset URL for ${normalizedEmail}: ${resetUrl}`);
        // Log email service configuration status
        console.log("📧 Email service configuration check:", {
          emailProvider: emailProvider.value(),
          hasResendKey: !!(resendApiKey.value() || "").trim(),
          hasMailersendToken: !!(mailerSendApiToken.value() || "").trim(),
          fromEmail: emailFrom.value(),
          replyToEmail: emailReplyTo.value(),
          appUrl: appUrl.value(),
        });
        // Don't fail the request - token is still created, user can use the URL
        // In production, you might want to alert admins about email failures
      }

      // Return success (don't reveal if email exists)
      res.status(200).json({ message: "If an account exists, a password reset link has been sent." });
    } catch (error: unknown) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Internal server error", message: formatError(error) });
    }
  }
);

// Reset password endpoint - handles password reset with token
export const resetPassword = functions.onRequest(
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
      const { token, password } = req.body;

      if (!token || typeof token !== "string") {
        res.status(400).json({ error: "Reset token is required" });
        return;
      }

      if (!password || typeof password !== "string") {
        res.status(400).json({ error: "Password is required" });
        return;
      }

      // Password validation
      function validatePassword(pwd: string): { valid: boolean; error?: string } {
        if (pwd.length < 8) {
          return { valid: false, error: "Password must be at least 8 characters long" };
        }
        if (!/(?=.*[a-z])/.test(pwd)) {
          return { valid: false, error: "Password must contain at least one lowercase letter" };
        }
        if (!/(?=.*[A-Z])/.test(pwd)) {
          return { valid: false, error: "Password must contain at least one uppercase letter" };
        }
        if (!/(?=.*\d)/.test(pwd)) {
          return { valid: false, error: "Password must contain at least one number" };
        }
        return { valid: true };
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        res.status(400).json({ error: passwordValidation.error });
        return;
      }

      // Get reset token from Firestore
      const tokenDoc = await db.collection("passwordResetTokens").doc(token).get();

      if (!tokenDoc.exists) {
        res.status(400).json({ error: "Invalid or expired reset token" });
        return;
      }

      const tokenData = tokenDoc.data();
      if (!tokenData) {
        res.status(400).json({ error: "Invalid reset token" });
        return;
      }

      // Check if token has been used
      if (tokenData.used === true) {
        res.status(400).json({ error: "This reset token has already been used" });
        return;
      }

      // Check if token has expired
      const expiresAt = tokenData.expiresAt?.toDate();
      if (!expiresAt || expiresAt < new Date()) {
        res.status(400).json({ error: "Reset token has expired. Please request a new one." });
        return;
      }

      const userId = tokenData.userId;
      if (!userId) {
        res.status(400).json({ error: "Invalid reset token" });
        return;
      }

      // Get user document
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        res.status(400).json({ error: "User not found" });
        return;
      }

      const userData = userDoc.data();
      const userEmail = userData?.email;

      if (!userEmail) {
        res.status(400).json({ error: "User email not found" });
        return;
      }

      const auth = admin.auth();

      // Create or update Firebase Auth account with new password
      let firebaseAuthUid: string;

      try {
        // Check if Firebase Auth account already exists
        let firebaseUser;
        try {
          if (userData?.firebaseAuthUid) {
            // User already has Firebase Auth account - update password
            firebaseUser = await auth.getUser(userData.firebaseAuthUid);
            firebaseAuthUid = firebaseUser.uid;

            // Update password
            await auth.updateUser(firebaseAuthUid, {
              password: password,
              emailVerified: firebaseUser.emailVerified, // Preserve email verification status
            });
          } else {
            // Try to find user by email
            try {
              firebaseUser = await auth.getUserByEmail(userEmail);
              firebaseAuthUid = firebaseUser.uid;

              // Update password
              await auth.updateUser(firebaseAuthUid, {
                password: password,
              });
            } catch {
              // User doesn't exist in Firebase Auth - create new account
              firebaseUser = await auth.createUser({
                email: userEmail,
                password: password,
                emailVerified: false, // User will need to verify email
              });
              firebaseAuthUid = firebaseUser.uid;
            }
          }
        } catch (authError: any) {
          console.error("Firebase Auth error:", authError);
          res.status(500).json({
            error: "Failed to update password in Firebase Auth",
            message: authError.message,
          });
          return;
        }

        // Update Firestore user document with firebaseAuthUid and remove passwordHash if it exists
        const updateData: any = {
          firebaseAuthUid,
          passwordUpdatedAt: admin.firestore.Timestamp.now(),
        };

        // Remove passwordHash field if it exists (migration cleanup)
        if (userData?.passwordHash) {
          updateData.passwordHash = admin.firestore.FieldValue.delete();
        }

        await db.collection("users").doc(userId).update(updateData);
      } catch (error: any) {
        console.error("Password reset error:", error);
        res.status(500).json({
          error: "Internal server error",
          message: formatError(error),
        });
        return;
      }

      // Mark token as used
      await db.collection("passwordResetTokens").doc(token).update({
        used: true,
        usedAt: admin.firestore.Timestamp.now(),
      });

      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error: unknown) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Internal server error", message: formatError(error) });
    }
  }
);

// Trigger when a new user is created
export const onUserCreated = onDocumentCreated(
  {
    document: "users/{userId}",
    ...BACKGROUND_V2_RUNTIME,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
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
      try {
        if (user.role === Role.ADMIN) {
          await getEmailService().sendWelcomeAdmin(user, organization);
          console.log(`✅ Welcome admin email sent to ${user.email}`);
        } else {
          await getEmailService().sendWelcomeParticipant(user, organization, user.role);
          console.log(`✅ Welcome participant email sent to ${user.email}`);
        }
      } catch (emailError: unknown) {
        // Log email errors but don't fail the user creation
        console.error(`❌ Failed to send welcome email to ${user.email}:`, formatError(emailError));
        // Continue - user creation should succeed even if email fails
      }
    } catch (error: unknown) {
      console.error("Error in onUserCreated trigger:", formatError(error));
    }
  }
);

// Firestore triggers for email notifications
// Trigger when a match is created
export const onMatchCreated = onDocumentCreated(
  {
    document: "matches/{matchId}",
    ...BACKGROUND_V2_RUNTIME,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
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
      getEmailService().sendMatchCreated(mentor, matchForEmail, mentor, mentee)
        .then(() => {
          console.log(`✅ Match created email sent to mentor: ${mentor.email}`);
        })
        .catch((err) => {
          console.error(`❌ Failed to send match email to mentor ${mentor.email}:`, formatError(err));
        });

      // Send to mentee
      getEmailService().sendMatchCreated(mentee, matchForEmail, mentor, mentee)
        .then(() => {
          console.log(`✅ Match created email sent to mentee: ${mentee.email}`);
        })
        .catch((err) => {
          console.error(`❌ Failed to send match email to mentee ${mentee.email}:`, formatError(err));
        });
    } catch (error: unknown) {
      console.error("Error in onMatchCreated trigger:", formatError(error));
    }
  }
);

// Trigger when a goal is updated to "Completed"
export const onGoalCompleted = onDocumentUpdated(
  {
    document: "goals/{goalId}",
    ...BACKGROUND_V2_RUNTIME,
  },
  async (event) => {
    try {
      const change = event.data;
      if (!change) return;
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
        getEmailService().sendGoalCompleted(user, goalForEmail)
          .then(() => {
            console.log(`✅ Goal completed email sent to ${user.email} for goal: ${goal.title}`);
          })
          .catch((err) => {
            console.error(`❌ Failed to send goal completed email to ${user.email}:`, formatError(err));
          });
      }
    } catch (error: unknown) {
      console.error("Error in onGoalCompleted trigger:", formatError(error));
    }
  }
);

// Note: Payment processing is now handled by Flowglad
// See /api/flowglad/checkout.ts, /api/flowglad/portal.ts, and /api/flowglad/webhook.ts

// Scheduled function to check for expiring trials and send reminder emails
export const checkExpiringTrials = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "America/New_York",
    ...BACKGROUND_V2_RUNTIME,
  },
  async (_event) => {
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
            getEmailService().sendTrialEnding(user, organization, daysRemaining)
              .then(() => {
                console.log(`✅ Trial ending email sent to ${user.email} for org ${orgDoc.id} (${daysRemaining} days remaining)`);
              })
              .catch((err) => {
                console.error(`❌ Failed to send trial ending email for org ${orgDoc.id}:`, formatError(err));
              });
          }
        }
      }

      console.log(`Checked ${orgsSnapshot.size} organizations for expiring trials`);
    } catch (error: unknown) {
      console.error("Error checking expiring trials:", formatError(error));
    }
  }
);

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
    } catch (error: unknown) {
      console.error("Calendar sync error:", formatError(error));
      res.status(500).json({
        error: "Failed to sync calendar",
        message: getErrorMessage(error),
      });
    }
  }
);

// Scheduled function to check for upcoming meetings and send reminders
export const checkMeetingReminders = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "America/New_York",
    ...BACKGROUND_V2_RUNTIME,
  },
  async (_event) => {
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
    } catch (error: unknown) {
      console.error("Error checking meeting reminders:", formatError(error));
    }
  }
);

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
    } catch (error: unknown) {
      console.error("Outlook calendar sync error:", formatError(error));
      res.status(500).json({
        error: "Failed to sync Outlook calendar",
        message: getErrorMessage(error),
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
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${appUrl.value()}/auth/outlook/callback`;

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
    } catch (error: unknown) {
      console.error("Outlook auth error:", formatError(error));
      res.status(500).json({
        error: "Failed to authenticate with Outlook",
        message: getErrorMessage(error),
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
    } catch (error: unknown) {
      console.error("Apple calendar sync error:", formatError(error));
      res.status(500).json({
        error: "Failed to sync Apple calendar",
        message: getErrorMessage(error),
      });
    }
  }
);

// Helper function to send FCM push notification
async function sendFCMPushNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    type: string;
    chatId?: string;
    notificationId: string;
  }
): Promise<void> {
  try {
    // Get user document to retrieve FCM token
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`User ${userId} not found, skipping FCM notification`);
      return;
    }

    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;

    if (!fcmToken) {
      console.log(`No FCM token for user ${userId}, skipping push notification`);
      return;
    }

    // Prepare notification payload with platform-specific options
    // Works for both iOS (Safari 16.4+) and Android (Chrome/Edge/Firefox)
    const message: any = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        type: notification.type,
        notificationId: notification.notificationId,
        ...(notification.chatId && { chatId: notification.chatId }),
      },
      token: fcmToken,
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          requireInteraction: false,
          silent: false,
        },
        fcmOptions: {
          link: notification.chatId 
            ? `/chat:${notification.chatId}` 
            : '/notifications',
        },
        headers: {
          Urgency: 'high', // High priority for better delivery
        },
      },
      // Android-specific options
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
          priority: 'high',
        },
      },
      // iOS-specific options (APNS)
      apns: {
        headers: {
          'apns-priority': '10', // High priority for iOS
        },
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Send FCM message
    await admin.messaging().send(message);
    console.log(`FCM push notification sent to user ${userId}`);
  } catch (error: unknown) {
    // Log error but don't throw - FCM failures shouldn't break notification creation
    console.error(`Error sending FCM push notification to user ${userId}:`, formatError(error));
    
    // If token is invalid, remove it from user document
    const errorCode = getErrorCode(error);
    if (errorCode === 'messaging/invalid-registration-token' || 
        errorCode === 'messaging/registration-token-not-registered') {
      try {
        await db.collection("users").doc(userId).update({
          fcmToken: admin.firestore.FieldValue.delete(),
          fcmTokenUpdatedAt: admin.firestore.FieldValue.delete(),
        });
        console.log(`Removed invalid FCM token for user ${userId}`);
      } catch (updateError) {
        console.error(`Error removing invalid FCM token:`, updateError);
      }
    }
  }
}

// Send invitation email endpoint
export const sendInvitationEmail = functions.onRequest(
  {
    cors: true,
    region: "us-central1",
    ...LIGHT_HTTP_RUNTIME,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { invitationId, invitationLink, recipientEmail, recipientName, organizationName, role, inviterName, personalNote } = req.body;

      // Validate required fields
      if (!invitationLink || !recipientEmail || !recipientName || !organizationName || !role) {
        res.status(400).json({ error: "Missing required fields: invitationLink, recipientEmail, recipientName, organizationName, role" });
        return;
      }

      // Validate role
      if (!Object.values(Role).includes(role)) {
        res.status(400).json({ error: "Invalid role" });
        return;
      }

      // #region agent log
      {
        const providerNameDiag = (emailProvider.value() || "resend") as string;
        const resTok = (resendApiKey.value() || "").trim();
        const msTok = (mailerSendApiToken.value() || "").trim();
        const primaryTok =
          providerNameDiag === "mailersend" ? msTok : resTok || msTok;
        agentDebugLog({
          location: "index.ts:sendInvitationEmail",
          message: "runtime email params snapshot",
          hypothesisId: "H1,H2,H3,H5",
          data: {
            gcpProject: process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? "",
            functionsEmulator: process.env.FUNCTIONS_EMULATOR === "true",
            cloudRunOrJob: !!(process.env.K_SERVICE || process.env.CLOUD_RUN_JOB),
            providerName: providerNameDiag,
            resendKeyLength: resTok.length,
            mailersendTokenLength: msTok.length,
            primaryTokenLength: primaryTok.length,
          },
        });
      }
      // #endregion

      // Send invitation email
      try {
        await getEmailService().sendInvitation(
          invitationLink,
          recipientEmail,
          recipientName,
          organizationName,
          role,
          inviterName,
          personalNote
        );
        
        console.log(`✅ Invitation email sent successfully to ${recipientEmail} for ${organizationName}`);

        // Update invitation status if invitationId is provided
        if (invitationId) {
          try {
            await db.collection("invitations").doc(invitationId).update({
              status: "Pending",
              sentDate: admin.firestore.Timestamp.now(),
            });
            console.log(`✅ Invitation status updated for ${invitationId}`);
          } catch (updateError) {
            // Log but don't fail - email was sent successfully
            console.error("❌ Error updating invitation status:", formatError(updateError));
          }
        }

        res.status(200).json({ success: true, message: "Invitation email sent successfully" });
      } catch (emailError: unknown) {
        console.error(`❌ Failed to send invitation email to ${recipientEmail}:`, formatError(emailError));
        throw emailError; // Re-throw to be caught by outer catch
      }
    } catch (error: unknown) {
      console.error("Error sending invitation email:", formatError(error));
      res.status(500).json({ 
        error: "Failed to send invitation email",
        message: getErrorMessage(error) || "Unknown error"
      });
    }
  }
);

// Firestore trigger: Send FCM push notification when a notification is created
export const onNotificationCreated = onDocumentCreated(
  {
    document: "notifications/{notificationId}",
    ...BACKGROUND_V2_RUNTIME,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    try {
      const notificationData = snap.data();
      const notificationId = snap.id;

      // Only send push notification if user has FCM token
      // The sendFCMPushNotification function will check for token existence
      await sendFCMPushNotification(
        notificationData.userId,
        {
          title: notificationData.title || 'New Notification',
          body: notificationData.body || '',
          type: notificationData.type || 'system',
          chatId: notificationData.chatId,
          notificationId,
        }
      );
    } catch (error: unknown) {
      console.error("Error in onNotificationCreated trigger:", formatError(error));
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
      getEmailService().sendMeetingReminder(
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
      )
        .then(() => {
          console.log(`✅ Meeting reminder email sent to ${user.email} for event: ${eventData.title} (${hoursUntil}h reminder)`);
        })
        .catch((err) => {
          console.error(`❌ Failed to send meeting reminder to ${user.email} (${userId}):`, formatError(err));
        });

      // Create in-app notification (FCM push will be sent automatically via onNotificationCreated trigger)
      await db.collection("notifications").add({
        organizationId: eventData.organizationId,
        userId,
        type: "meeting",
        title: `Meeting Reminder: ${eventData.title}`,
        body: `Your meeting "${eventData.title}" starts in ${hoursUntil === 24 ? '24 hours' : '1 hour'}.`,
        isRead: false,
        timestamp: admin.firestore.Timestamp.now(),
      });
      
      // Note: FCM push notification will be sent automatically by onNotificationCreated trigger
    } catch (error: unknown) {
      console.error(`Error sending reminder to user ${userId}:`, formatError(error));
    }
  }
}

// Export Gemini AI functions
export {
  getMatchSuggestions,
  getRecommendedResources,
  breakdownGoal,
  suggestMilestones,
} from "./gemini";

// Export TOTP 2FA functions
export { setupTotp, verifyTotpSetup, verifyTotpLogin, disableTotp } from "./totp";

// Invitation lookup for legacy token-based docs (random id)
export { lookupInvitationByToken } from "./invitations";

// Platform operator provisioning (Admin SDK; keeps creator signed in)
export {
  createPlatformOperatorAccount,
  listPlatformOperators,
  deletePlatformOperator,
  updatePlatformOperatorProfile,
} from "./platformOperators";

