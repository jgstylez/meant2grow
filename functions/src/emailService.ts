import { MailtrapClient } from "mailtrap";
import { User, Organization, Role, Match, Goal } from "./types";

// Email service configuration interface
export interface EmailServiceConfig {
  apiToken: string;
  useSandbox: boolean;
  inboxId?: number;
  fromEmail: string;
  replyToEmail: string;
  appUrl: string;
}

// Initialize Mailtrap client with configuration
const getMailtrapClient = (config: EmailServiceConfig) => {
  if (!config.apiToken) {
    console.warn("MAILTRAP_API_TOKEN not set. Email sending will be disabled.");
    return null;
  }

  return new MailtrapClient({
    token: config.apiToken,
    sandbox: config.useSandbox,
    testInboxId: config.inboxId, // Only used in sandbox mode
  });
};

// Email configuration factory
const getEmailConfig = (config: EmailServiceConfig) => ({
  from: {
    name: "Meant2Grow",
    email: config.fromEmail,
  },
  replyTo: config.replyToEmail,
});

// Helper function to send email safely
const createSendEmail = (config: EmailServiceConfig) => {
  const client = getMailtrapClient(config);
  const emailConfig = getEmailConfig(config);

  return async (options: {
    to: { email: string; name?: string }[];
    subject: string;
    html: string;
    text: string;
    category?: string;
  }) => {
    if (!client) {
      console.log("Email service not configured. Would send:", options.subject);
      return;
    }

    try {
      await client.send({
        from: emailConfig.from,
        reply_to: { email: emailConfig.replyTo },
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        category: options.category || "Transactional",
      });
      console.log(`Email sent successfully: ${options.subject}`);
    } catch (error) {
      console.error("Failed to send email:", error);
      // Don't throw - email failures shouldn't break the app
    }
  };
};

// Email Templates factory - creates templates with appUrl baked in
const createTemplates = (appUrl: string) => ({
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
              <a href="${appUrl}" 
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

Get started: ${appUrl}

Need help? Reply to this email or visit our support center.
    `.trim(),
  }),

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
              <a href="${appUrl}" 
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

Complete your profile: ${appUrl}

Questions? Reply to this email and we'll be happy to help.
    `.trim(),
  }),

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
              <a href="${appUrl}" 
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

Go to Dashboard: ${appUrl}

If this wasn't you, please contact support immediately.
    `.trim(),
  }),

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
                <a href="${appUrl}/chat" 
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

Start Conversation: ${appUrl}/chat

Remember: Great mentorship relationships start with open communication and mutual respect.
      `.trim(),
    };
  },

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
              <a href="${appUrl}/goals" 
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

View Your Goals: ${appUrl}/goals

Ready for your next challenge? Set a new goal and keep growing!
    `.trim(),
  }),

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
              <a href="${process.env.VITE_APP_URL || 'https://meant2grow.com'}/settings/billing" 
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

Upgrade Now: ${appUrl}/settings/billing

Questions about pricing? Reply to this email and we'll be happy to help.
    `.trim(),
  }),

  meetingReminder: (user: User, event: { title: string; date: string; startTime: string; duration: string; googleMeetLink?: string; participants?: string[] }, hoursUntil: number) => {
    const eventDate = new Date(`${event.date}T${event.startTime}`);
    const formattedDate = eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const timeUntil = hoursUntil === 24 ? '24 hours' : hoursUntil === 1 ? '1 hour' : `${hoursUntil} hours`;
    
    return {
      subject: `Meeting Reminder: ${event.title} in ${timeUntil}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Meeting Reminder</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0;">Meeting Reminder</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${user.name},</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                This is a reminder that you have a meeting scheduled:
              </p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">${event.title}</h2>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Date:</strong> ${formattedDate}</p>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Time:</strong> ${formattedTime}</p>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Duration:</strong> ${event.duration}</p>
                ${event.googleMeetLink ? `
                  <div style="margin: 20px 0;">
                    <a href="${event.googleMeetLink}" 
                       style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                      Join Meeting
                    </a>
                  </div>
                ` : ''}
              </div>
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                This meeting starts in ${timeUntil}. We'll send you another reminder 1 hour before the meeting.
              </p>
              <div style="margin: 30px 0;">
                <a href="${appUrl}/calendar" 
                   style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  View Calendar
                </a>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Meeting Reminder: ${event.title} in ${timeUntil}

Hi ${user.name},

This is a reminder that you have a meeting scheduled:

${event.title}
Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${event.duration}
${event.googleMeetLink ? `Join: ${event.googleMeetLink}` : ''}

This meeting starts in ${timeUntil}. We'll send you another reminder 1 hour before the meeting.

View Calendar: ${appUrl}/calendar
      `.trim(),
    };
  },
});

// Factory function to create email service with configuration
export const createEmailService = (config: EmailServiceConfig) => {
  const sendEmail = createSendEmail(config);
  const templates = createTemplates(config.appUrl);

  return {
    sendWelcomeAdmin: async (user: User, organization: Organization) => {
      const template = templates.welcomeAdmin(user, organization);
      await sendEmail({
        to: [{ email: user.email, name: user.name }],
        ...template,
        category: "Welcome",
      });
    },

    sendWelcomeParticipant: async (user: User, organization: Organization, role: Role) => {
      const template = templates.welcomeParticipant(user, organization, role);
      await sendEmail({
        to: [{ email: user.email, name: user.name }],
        ...template,
        category: "Welcome",
      });
    },

    sendWelcomeBack: async (user: User, organization: Organization) => {
      const template = templates.welcomeBack(user, organization);
      await sendEmail({
        to: [{ email: user.email, name: user.name }],
        ...template,
        category: "Login",
      });
    },

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

    sendGoalCompleted: async (user: User, goal: Goal) => {
      const template = templates.goalCompleted(user, goal);
      await sendEmail({
        to: [{ email: user.email, name: user.name }],
        ...template,
        category: "Goal",
      });
    },

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

    sendMeetingReminder: async (
      user: User,
      event: { title: string; date: string; startTime: string; duration: string; googleMeetLink?: string; participants?: string[] },
      hoursUntil: number
    ) => {
      const template = templates.meetingReminder(user, event, hoursUntil);
      await sendEmail({
        to: [{ email: user.email, name: user.name }],
        ...template,
        category: "Meeting",
      });
    },

    // Send custom email from admin to user(s)
    sendCustomEmail: async (
      recipients: { email: string; name?: string }[],
      subject: string,
      body: string,
      fromAdmin?: { name: string; email: string },
      isPlatformAdmin?: boolean
    ) => {
      // Convert plain text body to HTML
      const htmlBody = body
        .split('\n')
        .map((line) => `<p style="font-size: 16px; margin-bottom: 12px; line-height: 1.6;">${line || '<br/>'}</p>`)
        .join('');

      const footerMessage = isPlatformAdmin
        ? "This message was sent from a Meant2Grow platform operator."
        : "This message was sent from your organization's Meant2Grow admin.";

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0;">Message from Meant2Grow</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              ${fromAdmin ? `<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">From: <strong>${fromAdmin.name}</strong> (${fromAdmin.email})${isPlatformAdmin ? ' <span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">Platform Operator</span>' : ''}</p>` : ''}
              <div style="font-size: 16px; margin-bottom: 20px;">
                ${htmlBody}
              </div>
              <div style="margin: 30px 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280;">
                  ${footerMessage}
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      const text = `
${fromAdmin ? `From: ${fromAdmin.name} (${fromAdmin.email})${isPlatformAdmin ? ' [Platform Operator]' : ''}\n\n` : ''}${body}

---
${footerMessage}
      `.trim();

      await sendEmail({
        to: recipients,
        subject,
        html,
        text,
        category: "Admin",
      });
    },
  };
};

