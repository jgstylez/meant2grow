export enum Role {
  ADMIN = "ORGANIZATION_ADMIN",
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
  MENTOR = "MENTOR",
  MENTEE = "MENTEE",
}

export enum MatchStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  REJECTED = "REJECTED",
}

export interface Organization {
  id: string;
  name: string;
  domain?: string; // For domain-based SSO
  logo: string | null;
  accentColor: string;
  programSettings: ProgramSettings;
  createdAt: string;
  subscriptionTier: "free" | "starter" | "professional" | "business" | "enterprise";
  organizationCode: string; // Unique code for participants to join

  // Billing/Subscription fields (Flowglad)
  flowgladCustomerId?: string;
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  billingInterval?: 'monthly' | 'yearly';
  trialEnd?: string; // ISO date string - when free trial ends
}

export type Mood = 'Happy' | 'Neutral' | 'Stressed' | 'Excited' | 'Tired' | 'Motivated' | 'Anxious' | 'Grateful';

export interface User {
  id: string;
  organizationId: string; // CRITICAL: Links user to organization
  name: string;
  email: string;
  role: Role;
  avatar: string;
  title: string;
  company: string;
  skills: string[];
  goals?: string[]; // Mostly for mentees
  bio: string;
  experience?: string;
  mood?: Mood; // User's current mood
  googleId?: string; // For OAuth linking
  goalsPublic?: boolean; // Whether goals are visible to others (default: true)
  acceptingNewMentees?: boolean; // Whether mentor is accepting new mentees (default: true)
  maxMentees?: number; // Maximum number of mentees a mentor can have
  linkedinUrl?: string; // LinkedIn profile URL
  createdAt: string;
}

export interface Match {
  id: string;
  organizationId: string; // Isolated per organization
  mentorId: string;
  menteeId: string;
  status: MatchStatus;
  startDate: string;
  notes?: string;
}

export interface Goal {
  id: string;
  organizationId: string; // Isolated per organization
  userId: string;
  title: string;
  description: string;
  progress: number; // 0-100
  status: "Not Started" | "In Progress" | "Completed";
  dueDate: string;
}

export interface Milestone {
  id: string;
  goalId: string;
  organizationId: string; // For organization isolation
  title: string;
  description?: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  createdBy: string; // userId who created it
  createdAt: string;
  // Track who can see/edit (for collaboration)
  visibleToMentor: boolean;
  visibleToMentee: boolean;
}

export interface Rating {
  id: string;
  organizationId: string; // Isolated per organization
  fromUserId: string;
  toUserId: string;
  score: number; // 1-5
  comment: string;
  isApproved: boolean;
  date: string;
}

export interface Resource {
  id: string;
  organizationId: string; // Isolated per organization
  title: string;
  type: "Article" | "Book" | "Video" | "Course";
  url: string;
  description: string;
  fileUrl?: string; // Stored in Cloud Storage
  uploadedBy: string;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  excerpt: string;
  published: boolean;
  createdAt: string;
  // Platform-wide, no organizationId
}

export interface DiscussionGuide {
  id: string;
  title: string;
  readTime: string;
  description: string;
  content: string; // HTML content
  author: string;
  date: string;
  isPlatform: boolean; // true = platform-wide, false = organization-specific
  organizationId?: string; // Only present if isPlatform = false
  createdAt: string;
}

export interface CareerTemplate {
  id: string;
  title: string;
  type: string; // PDF, DOCX, etc.
  size: string;
  description: string;
  content: string; // HTML content for editing
  isPlatform: boolean; // true = platform-wide, false = organization-specific
  organizationId?: string; // Only present if isPlatform = false
  createdAt: string;
}

export interface TrainingVideo {
  id: string;
  title: string;
  duration: string;
  description: string;
  thumbnail: string;
  videoUrl?: string;
  transcript?: string;
  isPlatform: boolean; // true = platform-wide, false = organization-specific
  organizationId?: string; // Only present if isPlatform = false
  createdAt: string;
}

export interface Invitation {
  id: string;
  organizationId: string; // Isolated per organization
  email: string;
  name: string;
  role: Role;
  status: "Pending" | "Accepted" | "Expired";
  sentDate: string;
  inviterId: string;
  token: string; // Unique token for invitation link
  invitationLink?: string; // Full invitation URL
  expiresAt?: string; // Optional expiration date
}

export interface CalendarEvent {
  id: string;
  organizationId: string; // Isolated per organization
  title: string;
  date: string;
  startTime: string;
  duration: string;
  type: string;
  mentorId?: string;
  menteeId?: string;
  participants?: string[]; // Array of user IDs who are invited/participating
  googleMeetLink?: string; // Generated Meet link
  googleCalendarEventId?: string; // Google Calendar event ID for sync
  outlookCalendarEventId?: string; // Outlook Calendar event ID for sync
  appleCalendarEventId?: string; // Apple Calendar event ID for sync
  syncedToGoogle?: boolean; // Whether this event is synced to Google Calendar
  syncedToOutlook?: boolean; // Whether this event is synced to Outlook Calendar
  syncedToApple?: boolean; // Whether this event is synced to Apple Calendar
  createdAt: string;
}

export interface Notification {
  id: string;
  organizationId: string; // Isolated per organization
  userId: string;
  type: "message" | "meeting" | "goal" | "system" | "bridge";
  title: string;
  body: string;
  isRead: boolean;
  timestamp: string;
}

export interface BlockRecord {
  blockerId: string;
  blockedId: string;
}

export interface ReportRecord {
  reporterId: string;
  reportedId: string;
  reason: string;
  description: string;
  timestamp: string;
}

export interface ProgramSettings {
  programName: string;
  logo: string | null;
  accentColor: string;
  introText: string;
  fields: {
    id: string;
    label: string;
    description?: string;
    included: boolean;
    required: boolean;
    previewType: "text" | "pills" | "select" | "textarea";
    previewOptions?: string[];
    isCustom?: boolean;
  }[];
}

export interface ChatMessage {
  id: string;
  organizationId: string;
  chatId: string; // Either userId (for DM) or groupId (for group chat)
  chatType: 'dm' | 'group';
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  reactions?: Record<string, string[]>; // emoji -> userIds[]
  timestamp: string;
  createdAt: string;
  isRead?: boolean;
  readBy?: string[]; // userIds who have read this message
}

export interface ChatGroup {
  id: string;
  organizationId: string;
  name: string;
  avatar: string;
  type: 'group';
  members: string[]; // userIds
  createdBy: string;
  createdAt: string;
}
