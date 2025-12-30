// Don't import MailtrapClient at top level - use dynamic import instead
import { User, Organization, Role, Match, Goal } from "../types";
import { logger } from "./logger";

// Lazy initialization of Mailtrap client (only in server environments)
let client: any = null;
let clientPromise: Promise<any> | null = null;

const getMailtrapClient = async () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // In browser, don't initialize Mailtrap client
    // Email sending should go through Cloud Functions/API routes
    return null;
  }

  // If client already initialized, return it
  if (client !== null) {
    return client;
  }

  // If initialization is in progress, wait for it
  if (clientPromise) {
    return clientPromise;
  }

  // Start initialization
  clientPromise = (async () => {
    try {
      // Dynamic import - only loads in server environments
      const { MailtrapClient } = await import("mailtrap");
      
      const apiToken = import.meta.env.VITE_MAILTRAP_API_TOKEN;
      const useSandbox = import.meta.env.VITE_MAILTRAP_USE_SANDBOX === "true";
      const inboxId = import.meta.env.VITE_MAILTRAP_INBOX_ID
        ? Number(import.meta.env.VITE_MAILTRAP_INBOX_ID)
        : undefined;

      if (!apiToken) {
        logger.warn("MAILTRAP_API_TOKEN not set. Email sending will be disabled.");
        return null;
      }

      client = new MailtrapClient({
        token: apiToken,
        sandbox: useSandbox,
        testInboxId: inboxId, // Only used in sandbox mode
      });
      
      return client;
    } catch (error) {
      logger.error("Failed to initialize Mailtrap client", error);
      return null;
    } finally {
      clientPromise = null;
    }
  })();

  return clientPromise;
};

// Lazy getter for client (synchronous check, async initialization)
const getClient = () => {
  // In browser, always return null immediately
  if (typeof window !== 'undefined') {
    return null;
  }
  // In server, return the client (may be null if not initialized yet)
  return client;
};

// Email configuration
const EMAIL_CONFIG = {
  from: {
    name: "Meant2Grow",
    email: import.meta.env.VITE_MAILTRAP_FROM_EMAIL || "noreply@meant2grow.com",
  },
  replyTo: import.meta.env.VITE_MAILTRAP_REPLY_TO_EMAIL || "support@meant2grow.com",
};

// Helper function to send email safely
const sendEmail = async (options: {
  to: { email: string; name?: string }[];
  subject: string;
  html: string;
  text: string;
  category?: string;
}) => {
  // In browser environment, don't try to send emails directly
  if (typeof window !== 'undefined') {
    logger.info("Email service not available in browser. Use API routes for email sending.", { subject: options.subject });
    return;
  }

  // Get or initialize the client (async)
  const emailClient = await getMailtrapClient();
  
  if (!emailClient) {
    logger.info("Email service not configured. Would send:", { subject: options.subject });
    return;
  }

  try {
    await emailClient.send({
      from: EMAIL_CONFIG.from,
      reply_to: { email: EMAIL_CONFIG.replyTo },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      category: options.category || "Transactional",
    });
    logger.info("Email sent successfully", { subject: options.subject });
  } catch (error) {
    logger.error("Failed to send email", error);
    // Don't throw - email failures shouldn't break the app
  }
};

// Email Templates
const templates = {
  // Welcome email for new organization admin
  welcomeAdmin: (user: User, organization: Organization) => ({
    subject: `Welcome to Meant2Grow, ${user.name}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Meant2Grow</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Meant2Grow!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${user.name},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Congratulations on launching your mentorship program for <strong>${organization.name}</strong>!
            </p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Your organization code is: <strong style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 18px;">${organization.organizationCode}</strong>
            </p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Share this code with mentors and mentees to help them join your program.
            </p>
            <div style="margin: 30px 0;">
              <a href="${import.meta.env.VITE_APP_URL || 'https://meant2grow.com'}" 
                 style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Get Started
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Need help? Reply to this email or visit our support center.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to Meant2Grow, ${user.name}!

Congratulations on launching your mentorship program for ${organization.name}!

Your organization code is: ${organization.organizationCode}

Share this code with mentors and mentees to help them join your program.

Get started: ${import.meta.env.VITE_APP_URL || 'https://meant2grow.com'}

Need help? Reply to this email or visit our support center.
    `.trim(),
  }),

  // Welcome email for new participant (mentor or mentee)
  welcomeParticipant: (user: User, organization: Organization, role: Role) => ({
    subject: `Welcome to ${organization.name}'s Mentorship Program!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${organization.name}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to ${organization.name}!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${user.name},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Welcome to <strong>${organization.name}</strong>'s mentorship program! 
              You've joined as a <strong>${role === Role.MENTOR ? 'Mentor' : 'Mentee'}</strong>.
            </p>
            ${role === Role.MENTOR
        ? `<p style="font-size: 16px; margin-bottom: 20px;">
                   As a mentor, you'll be sharing your expertise and helping mentees grow in their careers. 
                   Your guidance makes a real difference!
                 </p>`
        : `<p style="font-size: 16px; margin-bottom: 20px;">
                   As a mentee, you're taking an important step in your professional development. 
                   Your mentor will help guide you toward achieving your goals.
                 </p>`
      }
            <div style="margin: 30px 0;">
              <a href="${import.meta.env.VITE_APP_URL || 'https://meant2grow.com'}" 
                 style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Complete Your Profile
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Questions? Reply to this email and we'll be happy to help.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to ${organization.name}'s Mentorship Program, ${user.name}!

You've joined as a ${role === Role.MENTOR ? 'Mentor' : 'Mentee'}.

${role === Role.MENTOR
        ? 'As a mentor, you\'ll be sharing your expertise and helping mentees grow in their careers.'
        : 'As a mentee, you\'re taking an important step in your professional development.'
      }

Complete your profile: ${import.meta.env.VITE_APP_URL || 'https://meant2grow.com'}

Questions? Reply to this email and we'll be happy to help.
    `.trim(),
  }),

  // Welcome back email for login
  welcomeBack: (user: User, organization: Organization) => ({
    subject: `Welcome back, ${user.name}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome Back</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${user.name},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              We noticed you just logged into your Meant2Grow account for <strong>${organization.name}</strong>.
            </p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Ready to continue your mentorship journey? Check out your dashboard to see:
            </p>
            <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px;">
              <li>Your active mentorship matches</li>
              <li>Upcoming meetings and goals</li>
              <li>New messages and notifications</li>
            </ul>
            <div style="margin: 30px 0;">
              <a href="${import.meta.env.VITE_APP_URL || 'https://meant2grow.com'}" 
                 style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Go to Dashboard
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              If this wasn't you, please contact support immediately.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome back, ${user.name}!

We noticed you just logged into your Meant2Grow account for ${organization.name}.

Ready to continue your mentorship journey? Check out your dashboard to see:
- Your active mentorship matches
- Upcoming meetings and goals
- New messages and notifications

Go to Dashboard: ${import.meta.env.VITE_APP_URL || 'https://meant2grow.com'}

If this wasn't you, please contact support immediately.
    `.trim(),
  }),

  // Match created email
  matchCreated: (user: User, match: Match, mentor: User, mentee: User) => {
    const isMentor = user.id === match.mentorId;
    const otherUser = isMentor ? mentee : mentor;
    
    // Build introduction details
    const otherUserIntro = `${otherUser.name}, ${otherUser.title} at ${otherUser.company}`;
    const skillsOrGoals = isMentor 
      ? (mentee.goals && mentee.goals.length > 0 ? mentee.goals.slice(0, 3).join(", ") : null)
      : (mentor.skills && mentor.skills.length > 0 ? mentor.skills.slice(0, 3).join(", ") : null);
    const bioSnippet = otherUser.bio && otherUser.bio.length > 0 
      ? (otherUser.bio.length > 120 ? otherUser.bio.substring(0, 120) + "..." : otherUser.bio)
      : null;

    return {
      subject: `New Mentorship Match: ${otherUser.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Mentorship Match</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0;">🎉 New Match!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${user.name},</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Great news! You've been matched with <strong>${otherUserIntro}</strong>.
              </p>
              
              ${isMentor
          ? `<div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                     <p style="font-size: 15px; margin: 0 0 10px 0; font-weight: 600; color: #111827;">About ${mentee.name}:</p>
                     ${skillsOrGoals ? `<p style="font-size: 14px; margin: 0 0 10px 0; color: #374151;"><strong>Goals:</strong> ${skillsOrGoals}</p>` : ''}
                     ${bioSnippet ? `<p style="font-size: 14px; margin: 0; color: #6b7280; font-style: italic;">"${bioSnippet}"</p>` : ''}
                   </div>
                   <p style="font-size: 16px; margin-bottom: 20px;">
                     ${mentee.name} is looking forward to learning from your expertise. Reach out to start building a meaningful mentorship relationship.
                   </p>`
          : `<div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                     <p style="font-size: 15px; margin: 0 0 10px 0; font-weight: 600; color: #111827;">About ${mentor.name}:</p>
                     ${skillsOrGoals ? `<p style="font-size: 14px; margin: 0 0 10px 0; color: #374151;"><strong>Specializes in:</strong> ${skillsOrGoals}</p>` : ''}
                     ${bioSnippet ? `<p style="font-size: 14px; margin: 0; color: #6b7280; font-style: italic;">"${bioSnippet}"</p>` : ''}
                   </div>
                   <p style="font-size: 16px; margin-bottom: 20px;">
                     ${mentor.name} is ready to guide you on your professional journey. Don't hesitate to reach out and introduce yourself!
                   </p>`
        }
              <div style="margin: 30px 0;">
                <a href="${import.meta.env.VITE_APP_URL || 'https://meant2grow.com'}/chat" 
                   style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Start Conversation
                </a>
              </div>
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Remember: Great mentorship relationships start with open communication and mutual respect.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
New Mentorship Match: ${otherUser.name}

Hi ${user.name},

Great news! You've been matched with ${otherUserIntro}.

${isMentor
          ? `About ${mentee.name}:
${skillsOrGoals ? `Goals: ${skillsOrGoals}` : ''}
${bioSnippet ? `"${bioSnippet}"` : ''}

${mentee.name} is looking forward to learning from your expertise. Reach out to start building a meaningful mentorship relationship.`
          : `About ${mentor.name}:
${skillsOrGoals ? `Specializes in: ${skillsOrGoals}` : ''}
${bioSnippet ? `"${bioSnippet}"` : ''}

${mentor.name} is ready to guide you on your professional journey. Don't hesitate to reach out and introduce yourself!`
        }

Start Conversation: ${import.meta.env.VITE_APP_URL || 'https://meant2grow.com'}/chat

Remember: Great mentorship relationships start with open communication and mutual respect.
      `.trim(),
    };
  },

  // Goal completed email
  goalCompleted: (user: User, goal: Goal) => ({
    subject: `🎉 Goal Completed: ${goal.title}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Goal Completed</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">🎉 Goal Achieved!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${user.name},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Congratulations! You've completed your goal:
            </p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin: 0 0 10px 0; color: #10b981;">${goal.title}</h2>
              <p style="margin: 0; color: #6b7280;">${goal.description}</p>
            </div>
            <p style="font-size: 16px; margin-bottom: 20px;">
              This is a significant milestone in your professional development journey. 
              Keep up the excellent work!
            </p>
            <div style="margin: 30px 0;">
              <a href="${import.meta.env.VITE_APP_URL || 'https://meant2grow.com'}/goals" 
                 style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View Your Goals
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Ready for your next challenge? Set a new goal and keep growing!
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
🎉 Goal Completed: ${goal.title}

Hi ${user.name},

Congratulations! You've completed your goal:

${goal.title}
${goal.description}

This is a significant milestone in your professional development journey. Keep up the excellent work!

View Your Goals: ${import.meta.env.VITE_APP_URL || 'https://meant2grow.com'}/goals

Ready for your next challenge? Set a new goal and keep growing!
    `.trim(),
  }),

  // Trial ending email (trial management via Flowglad)
  trialEnding: (user: User, organization: Organization, daysRemaining: number) => ({
    subject: `Your Free Trial Ends in ${daysRemaining} Days`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Trial Ending Soon</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Trial Ending Soon</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${user.name},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Your free trial for <strong>${organization.name}</strong> ends in <strong>${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}</strong>.
            </p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              To continue enjoying all the benefits of Meant2Grow, please upgrade to a paid plan.
            </p>
            <div style="margin: 30px 0;">
              <a href="${import.meta.env.VITE_APP_URL || 'https://meant2grow.com'}/settings/billing" 
                 style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Upgrade Now
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Questions about pricing? Reply to this email and we'll be happy to help.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Your Free Trial Ends in ${daysRemaining} Days

Hi ${user.name},

Your free trial for ${organization.name} ends in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}.

To continue enjoying all the benefits of Meant2Grow, please upgrade to a paid plan.

Upgrade Now: ${import.meta.env.VITE_APP_URL || 'https://meant2grow.com'}/settings/billing

Questions about pricing? Reply to this email and we'll be happy to help.
    `.trim(),
  }),
};

// Public API
export const emailService = {
  // Send welcome email to new organization admin
  sendWelcomeAdmin: async (user: User, organization: Organization) => {
    const template = templates.welcomeAdmin(user, organization);
    await sendEmail({
      to: [{ email: user.email, name: user.name }],
      ...template,
      category: "Welcome",
    });
  },

  // Send welcome email to new participant
  sendWelcomeParticipant: async (user: User, organization: Organization, role: Role) => {
    const template = templates.welcomeParticipant(user, organization, role);
    await sendEmail({
      to: [{ email: user.email, name: user.name }],
      ...template,
      category: "Welcome",
    });
  },

  // Send welcome back email on login
  sendWelcomeBack: async (user: User, organization: Organization) => {
    const template = templates.welcomeBack(user, organization);
    await sendEmail({
      to: [{ email: user.email, name: user.name }],
      ...template,
      category: "Login",
    });
  },

  // Send match created notification
  sendMatchCreated: async (
    user: User,
    match: Match,
    mentor: User,
    mentee: User
  ) => {
    const template = templates.matchCreated(user, match, mentor, mentee);
    await sendEmail({
      to: [{ email: user.email, name: user.name }],
      ...template,
      category: "Match",
    });
  },

  // Send goal completed notification
  sendGoalCompleted: async (user: User, goal: Goal) => {
    const template = templates.goalCompleted(user, goal);
    await sendEmail({
      to: [{ email: user.email, name: user.name }],
      ...template,
      category: "Goal",
    });
  },

  // Send trial ending notification
  sendTrialEnding: async (
    user: User,
    organization: Organization,
    daysRemaining: number
  ) => {
    const template = templates.trialEnding(user, organization, daysRemaining);
    await sendEmail({
      to: [{ email: user.email, name: user.name }],
      ...template,
      category: "Billing",
    });
  },

  // Send custom email from admin to user(s) - calls Cloud Function
  sendCustomEmail: async (
    recipients: { email: string; name?: string; userId?: string }[],
    subject: string,
    body: string,
    fromAdmin?: { name: string; email: string },
    adminUserId?: string,
    organizationId?: string
  ) => {
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-meant2grow-dev.cloudfunctions.net';
    const response = await fetch(`${functionsUrl}/sendAdminEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipients,
        subject,
        body,
        fromAdmin,
        adminUserId,
        organizationId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to send email' }));
      throw new Error(error.error || 'Failed to send email');
    }

    return response.json();
  },
};

// Standalone function for sending invitation emails (can be called from client)
export const sendInvitationEmail = async (
  invitee: { email: string; name: string },
  organization: Organization,
  invitationLink: string,
  role: Role,
  inviterName: string
) => {
  const roleText = role === Role.MENTOR ? "Mentor" : role === Role.MENTEE ? "Mentee" : role;
  const appUrl = import.meta.env.VITE_APP_URL || "https://meant2grow.com";
  
  const subject = `You've been invited to join ${organization.name} on Meant2Grow!`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to Meant2Grow</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${organization.accentColor || organization.programSettings?.accentColor || '#10b981'} 0%, ${organization.accentColor || organization.programSettings?.accentColor || '#059669'} 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          ${organization.logo || organization.programSettings?.logo ? `<img src="${organization.logo || organization.programSettings?.logo}" alt="${organization.name}" style="max-height: 60px; margin-bottom: 10px;" />` : ''}
          <h1 style="color: white; margin: 0;">You've been invited!</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${invitee.name},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>${inviterName}</strong> has invited you to join <strong>${organization.name}</strong>'s mentorship program as a <strong>${roleText}</strong>.
          </p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            Join us to connect with professionals, track your career goals, and advance your professional growth.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${invitationLink}" 
               style="display: inline-block; background: ${organization.accentColor || organization.programSettings?.accentColor || '#10b981'}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Or copy and paste this link into your browser:<br/>
            <a href="${invitationLink}" style="color: #10b981; word-break: break-all;">${invitationLink}</a>
          </p>
          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
            This invitation will expire in 30 days. If you have any questions, please contact your organization administrator.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #9ca3af;">
            This email was sent by Meant2Grow on behalf of ${organization.name}.<br/>
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  `.trim();
  
  const text = `
Hi ${invitee.name},

${inviterName} has invited you to join ${organization.name}'s mentorship program as a ${roleText}.

Join us to connect with professionals, track your career goals, and advance your professional growth.

Accept your invitation here: ${invitationLink}

This invitation will expire in 30 days. If you have any questions, please contact your organization administrator.

---
This email was sent by Meant2Grow on behalf of ${organization.name}.
If you didn't expect this invitation, you can safely ignore this email.
  `.trim();

  await sendEmail({
    to: [{ email: invitee.email, name: invitee.name }],
    subject,
    html,
    text,
    category: "Invitation",
  });
};

