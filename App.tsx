import React, { useState, useEffect, lazy, Suspense } from "react";
import Layout from "./components/Layout";
import LandingPage from "./components/LandingPage";
import Authentication from "./components/Authentication";
import OrganizationSignup from "./components/OrganizationSignup";
import PublicPages from "./components/PublicPages";
import {
  Role,
  User,
  Match,
  MatchStatus,
  Goal,
  Rating,
  Resource,
  CalendarEvent,
  Notification,
  Invitation,
  ProgramSettings,
  BlogPost,
  DiscussionGuide,
  CareerTemplate,
  TrainingVideo,
} from "./types";
import { getBlogPosts } from "./services/database";
import { parseDurationToHours } from "./services/utils";
import { useOrganizationData } from "./hooks/useOrganizationData";
import {
  createMatch,
  updateMatch,
  createGoal,
  updateGoal,
  deleteGoal,
  createRating,
  updateRating,
  deleteRating,
  createResource,
  deleteResource,
  createCalendarEvent,
  getCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  createNotification,
  updateNotification,
  deleteNotification,
  createInvitation,
  updateInvitation,
  getUser,
  updateUser,
  incrementMentorHours,
  updateOrganization,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  createDiscussionGuide,
  updateDiscussionGuide,
  deleteDiscussionGuide,
  createCareerTemplate,
  updateCareerTemplate,
  deleteCareerTemplate,
  createTrainingVideo,
  updateTrainingVideo,
  deleteTrainingVideo,
  createChatMessage,
} from "./services/database";

// Lazy load heavy components for code splitting
const Dashboard = lazy(() => import("./components/Dashboard"));
const Participants = lazy(() => import("./components/Participants"));
const Matching = lazy(() => import("./components/Matching"));
const Goals = lazy(() => import("./components/Goals"));
const Resources = lazy(() => import("./components/Resources"));
const Chat = lazy(() => import("./components/Chat"));
const CalendarView = lazy(() => import("./components/CalendarView"));
const SettingsView = lazy(() => import("./components/SettingsView"));
const Referrals = lazy(() => import("./components/Referrals"));
const NotificationsView = lazy(() => import("./components/NotificationsView"));
const UserManagement = lazy(() => import("./components/UserManagement"));
const PlatformOperatorManagement = lazy(() => import("./components/PlatformOperatorManagement"));

// Keep these as regular imports (smaller, needed for initial render)
import OrganizationSetup from "./components/OrganizationSetup";
import ErrorBoundary from "./components/ErrorBoundary";
import MentorOnboarding from "./components/MentorOnboarding";
import MenteeOnboarding from "./components/MenteeOnboarding";
import PrivacyBanner from "./components/PrivacyBanner";
import { useToasts } from "./hooks/useToasts";
import { useOnboarding } from "./hooks/useOnboarding";
import { useBlogActions } from "./hooks/useBlogActions";
import { useGuideActions } from "./hooks/useGuideActions";
import { useTemplateActions } from "./hooks/useTemplateActions";
import { useVideoActions } from "./hooks/useVideoActions";
import { useOnboardingActions } from "./hooks/useOnboardingActions";
import { useGoalActions } from "./hooks/useGoalActions";
import { useFCM } from "./hooks/useFCM";
import { getErrorMessage, formatError } from "./utils/errors";
import { logger } from "./services/logger";
import { signInToFirebaseAuth, getIdToken, signOut as signOutGoogle } from "./services/googleAuth";

// Loading component for Suspense fallback
const LoadingSpinner: React.FC<{ message?: string }> = ({
  message = "Loading...",
}) => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
      <p className="text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  </div>
);

type PublicRoute =
  | "landing"
  | "auth"
  | "org-signup"
  | "pricing"
  | "legal"
  | "enterprise"
  | "features"
  | "how-it-works"
  | "blog"
  | "community"
  | "help"
  | "contact";

// Helper to compute initial auth state synchronously to prevent flash
const getInitialAuthState = () => {
  // Pure function: only reads from localStorage, never mutates
  // This ensures React's render phase remains pure
  const storedUserId = localStorage.getItem("userId");
  const storedOrgId = localStorage.getItem("organizationId");
  const lastPage = localStorage.getItem("lastPage");
  
  // Check URL params for org-signup route to determine initial route
  // Note: Auth clearing will happen in useEffect after mount, not here
  let initialPublicRoute: PublicRoute | "hidden" = "landing";
  
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get("invite");
    const orgCode = urlParams.get("orgCode");
    
    // If there's an invite token or orgCode, show org-signup page
    if (inviteToken || orgCode) {
      initialPublicRoute = "org-signup";
    }
  }

  const isAuthenticated = !!(storedUserId && storedOrgId);

  // Don't restore onboarding pages - let the onboarding logic handle those
  const isOnboardingPage =
    lastPage === "mentor-onboarding" ||
    lastPage === "mentee-onboarding" ||
    lastPage === "setup";

  return {
    userId: storedUserId,
    organizationId: storedOrgId,
    publicRoute: isAuthenticated
      ? ("hidden" as const)
      : initialPublicRoute,
    // Only restore lastPage if authenticated and it's not an onboarding page
    currentPage:
      isAuthenticated && lastPage && !isOnboardingPage ? lastPage : "dashboard",
  };
};

const App: React.FC = () => {
  // Compute initial state synchronously from localStorage to prevent flash
  const initialAuthState = React.useMemo(() => getInitialAuthState(), []);

  // Navigation State - initialized based on auth status to prevent landing page flash
  const [publicRoute, setPublicRoute] = useState<PublicRoute | "hidden">(
    initialAuthState.publicRoute
  );
  const [authInitialMode, setAuthInitialMode] = useState<
    "login" | "org-signup" | "participant-signup" | "choose"
  >("choose");
  const [currentPage, setCurrentPage] = useState(initialAuthState.currentPage);

  // Get userId and organizationId from localStorage (set during authentication)
  const [userId, setUserId] = useState<string | null>(initialAuthState.userId);
  const [organizationId, setOrganizationId] = useState<string | null>(
    initialAuthState.organizationId
  );

  // Load all organization data from Firestore
  const {
    currentUser: loadedUser,
    users,
    matches,
    goals,
    ratings,
    resources,
    calendarEvents,
    notifications: loadedNotifications,
    invitations,
    organization,
    programSettings,
    blogPosts: loadedBlogPosts,
    discussionGuides,
    careerTemplates,
    trainingVideos,
    loading: dataLoading,
    error: dataError,
    refresh: refreshData,
  } = useOrganizationData(userId, organizationId);

  // Local state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  
  // Impersonation state - track original operator for access control
  const [originalOperator, setOriginalOperator] = useState<User | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalOperatorLoading, setOriginalOperatorLoading] = useState(false);

  // Load published blog posts for public pages
  useEffect(() => {
    const loadBlogPosts = async () => {
      try {
        const posts = await getBlogPosts(true); // Only published posts
        setBlogPosts(posts);
      } catch (error) {
        logger.error("Error loading blog posts", error);
      }
    };
    loadBlogPosts();
  }, []);

  // Sync blog posts when data is loaded via organization hook
  useEffect(() => {
    if (loadedBlogPosts && loadedBlogPosts.length > 0) {
      setBlogPosts(loadedBlogPosts);
    }
  }, [loadedBlogPosts]);

  // Check impersonation status and load original operator if needed
  useEffect(() => {
    const impersonating = localStorage.getItem('isImpersonating') === 'true';
    const originalOperatorId = localStorage.getItem('originalOperatorId');
    setIsImpersonating(impersonating);
    
    if (impersonating && originalOperatorId) {
      // Set loading state before async operation
      setOriginalOperatorLoading(true);
      // Load original operator's data for access control
      getUser(originalOperatorId).then((operator) => {
        if (operator) {
          setOriginalOperator(operator);
        } else {
          logger.warn('Original operator not found');
          // If operator not found, exit impersonation for security
          localStorage.removeItem('isImpersonating');
          localStorage.removeItem('originalOperatorId');
          localStorage.removeItem('originalOrganizationId');
          setIsImpersonating(false);
        }
        setOriginalOperatorLoading(false);
      }).catch((error) => {
        logger.error('Error loading original operator', error);
        // On error, exit impersonation for security
        localStorage.removeItem('isImpersonating');
        localStorage.removeItem('originalOperatorId');
        localStorage.removeItem('originalOrganizationId');
        setIsImpersonating(false);
        setOriginalOperator(null);
        setOriginalOperatorLoading(false);
      });
    } else {
      setOriginalOperator(null);
      setOriginalOperatorLoading(false);
    }
  }, []);

  // Sync currentUser from loadedUser
  useEffect(() => {
    if (loadedUser) {
      setCurrentUser(loadedUser);
    }
  }, [loadedUser]);

  // Sync notifications from loadedNotifications
  useEffect(() => {
    if (loadedNotifications) {
      setNotifications(loadedNotifications);
    }
  }, [loadedNotifications]);

  // Note: Authentication state is now restored synchronously during initialization
  // via getInitialAuthState() to prevent flash of landing page on refresh

  // Handle invite/orgCode URL params and clear auth if needed
  // This runs once after mount to handle auth clearing (side effects belong in useEffect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get("invite");
    const orgCode = urlParams.get("orgCode");
    
    // If there's an invite token or orgCode, ensure we're on org-signup route
    if (inviteToken || orgCode) {
      // Check if impersonating - if so, exit impersonation gracefully first
      const impersonating = localStorage.getItem('isImpersonating') === 'true';
      if (impersonating) {
        // Exit impersonation: restore original operator's session
        const originalOperatorId = localStorage.getItem('originalOperatorId');
        const originalOrganizationId = localStorage.getItem('originalOrganizationId');
        
        if (originalOperatorId && originalOrganizationId) {
          // Restore original operator's session
          localStorage.setItem('userId', originalOperatorId);
          localStorage.setItem('organizationId', originalOrganizationId);
          // Clear impersonation state
          localStorage.removeItem('isImpersonating');
          localStorage.removeItem('originalOperatorId');
          localStorage.removeItem('originalOrganizationId');
          // Reload to reinitialize with original operator's context
          window.location.href = `${window.location.pathname}?${urlParams.toString()}`;
          return; // Exit early, reload will handle the rest
        } else {
          // If original operator data is missing, clear impersonation state
          localStorage.removeItem('isImpersonating');
          localStorage.removeItem('originalOperatorId');
          localStorage.removeItem('originalOrganizationId');
        }
      }
      
      // If user is authenticated but clicked invite link, clear auth and show signup
      // This allows them to sign up as a different user/role
      if (publicRoute === "hidden" && userId && organizationId) {
        // Clear localStorage (side effect - must be in useEffect, not render phase)
        localStorage.removeItem("authToken");
        localStorage.removeItem("organizationId");
        localStorage.removeItem("userId");
        // Clear React state
        setUserId(null);
        setOrganizationId(null);
        setCurrentUser(null);
      }
      // Ensure route is set to org-signup
      if (publicRoute !== "org-signup") {
        setPublicRoute("org-signup");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Restore Firebase Auth session on app load if Google ID token exists
  useEffect(() => {
    const restoreFirebaseAuth = async () => {
      const idToken = getIdToken();
      if (idToken && userId) {
        // User is authenticated and has a Google ID token
        // Sign in to Firebase Auth to enable Cloud Functions
        try {
          await signInToFirebaseAuth(idToken);
        } catch (error) {
          logger.warn('Failed to restore Firebase Auth session', error);
          // Don't block the app if Firebase Auth restoration fails
        }
      }
    };
    restoreFirebaseAuth();
  }, [userId]);

  // Save current page to localStorage when it changes (for page refresh persistence)
  // Don't save onboarding pages - let the onboarding logic handle those
  useEffect(() => {
    const isOnboardingPage =
      currentPage === "mentor-onboarding" ||
      currentPage === "mentee-onboarding" ||
      currentPage === "setup";

    if (publicRoute === "hidden" && currentPage && !isOnboardingPage) {
      localStorage.setItem("lastPage", currentPage);
    }
  }, [currentPage, publicRoute]);

  // Redirect old platform-admin route to new page (handle redirects outside render)
  useEffect(() => {
    if (currentPage.startsWith("settings")) {
      const tab = currentPage.split(":")[1];
      if (tab === 'platform-admin') {
        setCurrentPage('platform-operator-management');
      }
    }
  }, [currentPage]);

  // Hooks for state management and actions
  const { toasts, addToast, removeToast } = useToasts();
  const {
    getOnboardingComplete,
    setOnboardingComplete,
    markUserOnboardingComplete,
  } = useOnboarding();

  // Initialize Firebase Cloud Messaging for push notifications
  const fcm = useFCM(userId);

  // Handle navigation based on user state and onboarding status
  useEffect(() => {
    if (!loadedUser || publicRoute !== "hidden") return;

    const onboardingComplete = getOnboardingComplete();
    const needsOrgSetup = loadedUser.role === Role.ADMIN && !programSettings;
    const needsMentorOnboarding =
      loadedUser.role === Role.MENTOR &&
      loadedUser.id &&
      !onboardingComplete[loadedUser.id];
    const needsMenteeOnboarding =
      loadedUser.role === Role.MENTEE &&
      loadedUser.id &&
      !onboardingComplete[loadedUser.id];

    // Don't redirect if user is already on an onboarding page - let them complete it
    const isOnOnboardingPage =
      currentPage === "mentor-onboarding" ||
      currentPage === "mentee-onboarding" ||
      currentPage === "setup";

    // If user has completed onboarding but is still on onboarding page, redirect to dashboard
    if (
      isOnOnboardingPage &&
      !needsOrgSetup &&
      !needsMentorOnboarding &&
      !needsMenteeOnboarding
    ) {
      setCurrentPage("dashboard");
      return;
    }

    // If user needs onboarding but is not on the onboarding page, redirect them
    // Redirect regardless of current page to prevent bypassing onboarding via page refresh
    if (!isOnOnboardingPage) {
      if (needsOrgSetup) {
        setCurrentPage("setup");
      } else if (needsMentorOnboarding) {
        setCurrentPage("mentor-onboarding");
      } else if (needsMenteeOnboarding) {
        setCurrentPage("mentee-onboarding");
      }
    }
  }, [
    loadedUser,
    programSettings,
    publicRoute,
    currentPage,
    getOnboardingComplete,
  ]);

  // Action hooks
  const { handleAddBlogPost, handleUpdateBlogPost, handleDeleteBlogPost } =
    useBlogActions(addToast);
  const {
    handleAddDiscussionGuide,
    handleUpdateDiscussionGuide,
    handleDeleteDiscussionGuide,
  } = useGuideActions(addToast);
  const {
    handleAddCareerTemplate,
    handleUpdateCareerTemplate,
    handleDeleteCareerTemplate,
  } = useTemplateActions(addToast);
  const {
    handleAddTrainingVideo,
    handleUpdateTrainingVideo,
    handleDeleteTrainingVideo,
  } = useVideoActions(addToast);
  const {
    handleMentorOnboardingComplete: mentorComplete,
    handleMenteeOnboardingComplete: menteeComplete,
  } = useOnboardingActions(
    addToast,
    getOnboardingComplete,
    setOnboardingComplete,
    setCurrentPage
  );
  const { handleAddGoal, handleUpdateGoal } = useGoalActions(
    addToast,
    organizationId,
    currentUser,
    goals
  );

  const handleMentorOnboardingComplete = (data: any) => {
    if (currentUser && organizationId)
      mentorComplete(data, currentUser, organizationId);
  };

  const handleMenteeOnboardingComplete = (data: any) => {
    if (currentUser && organizationId)
      menteeComplete(data, currentUser, organizationId);
  };

  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      await updateNotification(id, { isRead: true });
    } catch (error: unknown) {
      logger.error("Error marking notification as read", error);
      await refreshData();
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      const unreadNotifications = notifications.filter((n) => !n.isRead);
      await Promise.all(
        unreadNotifications.map((n) =>
          updateNotification(n.id, { isRead: true })
        )
      );
    } catch (error: unknown) {
      logger.error("Error marking all notifications as read", error);
      await refreshData();
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await deleteNotification(id);
      addToast("Notification deleted", "info");
    } catch (error: unknown) {
      logger.error("Error deleting notification", error);
      await refreshData();
      addToast(
        getErrorMessage(error) || "Failed to delete notification",
        "error"
      );
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      if (!updatedUser.id) throw new Error("User ID is required");
      // Optimistically update local state
      setCurrentUser(updatedUser);
      // Extract only the changed fields for the database update
      const updates: Partial<User> = { ...updatedUser };
      await updateUser(updatedUser.id, updates);
      addToast("Profile updated successfully", "success");
    } catch (error: unknown) {
      logger.error("Error updating user", error);
      // On error, refresh from database to get correct state
      await refreshData();
      addToast(getErrorMessage(error) || "Failed to update profile", "error");
    }
  };

  const handleLogout = async () => {
    // Sign out from Firebase Auth
    try {
      await signOutGoogle();
    } catch (error) {
      logger.warn('Error signing out from Firebase Auth', error);
    }
    
    localStorage.removeItem("userId");
    localStorage.removeItem("organizationId");
    localStorage.removeItem("authToken");
    localStorage.removeItem("google_id_token");
    localStorage.removeItem("lastPage"); // Clear saved page on logout
    setUserId(null);
    setOrganizationId(null);
    setCurrentUser(null);
    setPublicRoute("landing");
    setCurrentPage("dashboard");
  };

  const handleLogin = async (
    isNewOrg?: boolean,
    isParticipant?: boolean,
    participantRole?: Role
  ) => {
    const storedUserId = localStorage.getItem("userId");
    const storedOrgId = localStorage.getItem("organizationId");

    if (storedUserId && storedOrgId) {
      setUserId(storedUserId);
      setOrganizationId(storedOrgId);
      setPublicRoute("hidden");
      await refreshData();

      if (isNewOrg) {
        setCurrentPage("setup");
      } else if (isParticipant && participantRole) {
        setCurrentPage(
          participantRole === Role.MENTOR
            ? "mentor-onboarding"
            : "mentee-onboarding"
        );
      } else {
        // Default to dashboard - useEffect will handle redirect based on onboarding status
        setCurrentPage("dashboard");
      }
    }
  };

  const handleSwitchUser = () => {
    if (!currentUser) return;
    const onboardingComplete = getOnboardingComplete();

    if (currentUser.role === Role.ADMIN) {
      const next = users.find((u) => u.role === Role.MENTOR);
      if (next) {
        setCurrentUser(next);
        localStorage.setItem("userId", next.id);
        addToast(`Switched to Mentor: ${next.name}`, "success");
        setCurrentPage(
          !onboardingComplete[next.id] ? "mentor-onboarding" : "dashboard"
        );
      }
    } else if (currentUser.role === Role.MENTOR) {
      const next = users.find((u) => u.role === Role.MENTEE);
      if (next) {
        setCurrentUser(next);
        localStorage.setItem("userId", next.id);
        addToast(`Switched to Mentee: ${next.name}`, "success");
        setCurrentPage(
          !onboardingComplete[next.id] ? "mentee-onboarding" : "dashboard"
        );
      }
    } else {
      const next = users.find((u) => u.role === Role.ADMIN);
      if (next) {
        setCurrentUser(next);
        localStorage.setItem("userId", next.id);
        addToast(`Switched to Admin: ${next.name}`, "success");
        setCurrentPage(!programSettings ? "setup" : "dashboard");
      }
    }
  };

  const handleCreateMatch = async (mentorId: string, menteeId: string) => {
    try {
      if (!organizationId) throw new Error("Organization ID is required");
      
      // Find mentor and mentee in users list
      const mentor = users.find((u) => u.id === mentorId);
      const mentee = users.find((u) => u.id === menteeId);
      
      // Validate users exist
      if (!mentor) throw new Error("Mentor not found");
      if (!mentee) throw new Error("Mentee not found");
      
      // Validate both users are from the same organization (security check)
      if (mentor.organizationId !== organizationId || mentee.organizationId !== organizationId) {
        throw new Error("Cannot create match: users must be from the same organization");
      }
      
      // Validate roles
      if (mentor.role !== Role.MENTOR) {
        throw new Error("Selected user is not a mentor");
      }
      if (mentee.role !== Role.MENTEE) {
        throw new Error("Selected user is not a mentee");
      }
      
      const newMatch: Match = {
        id: `temp-${Date.now()}`,
        organizationId,
        mentorId,
        menteeId,
        status: MatchStatus.ACTIVE,
        startDate: new Date().toISOString().split("T")[0],
      };
      await createMatch(newMatch);
      addToast("Match created successfully", "success");

      if (organizationId && mentor && mentee) {
        // Create initial welcoming message in the chat
        // For DMs, each user has their own chat view identified by the other user's ID
        // - Mentee views chat with chatId = mentorId
        // - Mentor views chat with chatId = menteeId
        // We need to create the message in both chat views so both users can see it
        const welcomeMessage = `Hi ${mentee.name}! 👋 I'm ${mentor.name}, ${mentor.title} at ${mentor.company}. ${mentor.skills && mentor.skills.length > 0 ? `I specialize in ${mentor.skills.slice(0, 3).join(", ")}.` : ""} I'm excited to be your mentor and help you on your journey! ${mentee.goals && mentee.goals.length > 0 ? `I see you're looking to grow in ${mentee.goals.slice(0, 2).join(" and ")}.` : ""} Let's get started!`;

        // Create message in mentor's chat view (chatId = menteeId)
        createChatMessage({
          organizationId,
          chatId: menteeId, // Mentor's view: chat with mentee
          chatType: 'dm',
          senderId: mentorId,
          text: welcomeMessage,
          type: 'text',
          timestamp: new Date().toISOString(),
        }).catch((err) =>
          logger.error("Error creating initial chat message for mentor view", err)
        );

        // Create message in mentee's chat view (chatId = mentorId)
        createChatMessage({
          organizationId,
          chatId: mentorId, // Mentee's view: chat with mentor
          chatType: 'dm',
          senderId: mentorId,
          text: welcomeMessage,
          type: 'text',
          timestamp: new Date().toISOString(),
        }).catch((err) =>
          logger.error("Error creating initial chat message for mentee view", err)
        );

        // Create notification for mentee with mentor introduction and chat link
        createNotification({
          organizationId,
          userId: menteeId,
          type: "match",
          title: "New Mentor Match",
          body: `You've been matched with ${mentor.name}, ${mentor.title} at ${mentor.company}. ${mentor.skills && mentor.skills.length > 0 ? `Specializes in ${mentor.skills.slice(0, 3).join(", ")}.` : ""} Reach out to start your mentorship journey!`,
          isRead: false,
          timestamp: new Date().toISOString(),
          chatId: mentorId, // Link to mentor's chat
        }).catch((err) =>
          logger.error("Error creating notification for mentee", err)
        );

        // Create notification for mentor with mentee introduction and chat link
        createNotification({
          organizationId,
          userId: mentorId,
          type: "match",
          title: "New Mentee Match",
          body: `You've been matched with ${mentee.name}, ${mentee.title} at ${mentee.company}. ${mentee.goals && mentee.goals.length > 0 ? `Looking to grow in: ${mentee.goals.slice(0, 3).join(", ")}.` : ""} Ready to guide them on their journey!`,
          isRead: false,
          timestamp: new Date().toISOString(),
          chatId: menteeId, // Link to mentee's chat
          }).catch((err) =>
            logger.error("Error creating notification for mentor", err)
          );
      }
    } catch (error: unknown) {
      logger.error("Error creating match", error);
      addToast(getErrorMessage(error) || "Failed to create match", "error");
    }
  };

  const handleAddEvent = async (
    event: Omit<CalendarEvent, "id" | "createdAt">
  ) => {
    try {
      if (!organizationId) throw new Error("Organization ID is required");
      if (!currentUser) throw new Error("User must be logged in");

      const eventId = await createCalendarEvent({ ...event, organizationId });

      try {
        const { createEventInAllCalendars } = await import(
          "./services/unifiedCalendarService"
        );
        const { createMeetLink } = await import("./services/meetApi");

        let meetLink: string | undefined;
        if (event.type === "Virtual") {
          const meetResponse = await createMeetLink(
            event.title,
            undefined,
            undefined
          );
          meetLink = meetResponse.meetLink;
        }

        const calendarEventIds = await createEventInAllCalendars(
          {
            ...event,
            id: eventId,
            createdAt: new Date().toISOString(),
          } as CalendarEvent,
          currentUser.id,
          meetLink
        );

        const updates: Partial<CalendarEvent> = { googleMeetLink: meetLink };
        if (calendarEventIds.google) {
          updates.googleCalendarEventId = calendarEventIds.google;
          updates.syncedToGoogle = true;
        }
        if (calendarEventIds.outlook) {
          updates.outlookCalendarEventId = calendarEventIds.outlook;
          updates.syncedToOutlook = true;
        }
        if (calendarEventIds.apple) {
          updates.appleCalendarEventId = calendarEventIds.apple;
          updates.syncedToApple = true;
        }

        await updateCalendarEvent(eventId, updates);
        } catch (syncError) {
          logger.error("Failed to sync to calendars", syncError);
        }

      // Update mentor's total hours committed if this event has a mentorId
      // Use atomic increment to prevent race conditions
      if (event.mentorId) {
        try {
          const hoursToAdd = parseDurationToHours(event.duration);
          await incrementMentorHours(event.mentorId, hoursToAdd);
        } catch (error) {
          logger.error("Error updating mentor hours", error);
          // Don't fail the event creation if hours update fails
        }
      }

      addToast("Event added to calendar", "success");
      const participants = event.participants || [];
      participants.forEach((participantId) => {
        if (participantId !== currentUser?.id) {
          // Parse date string (YYYY-MM-DD) as local date to avoid timezone issues
          // When parsing "2025-12-26", new Date() treats it as UTC midnight,
          // which causes .toLocaleDateString() to return wrong day for timezones west of UTC
          const dateParts = event.date.split("-");
          const eventDate =
            dateParts.length === 3
              ? new Date(
                  parseInt(dateParts[0]),
                  parseInt(dateParts[1]) - 1,
                  parseInt(dateParts[2])
                )
              : new Date(event.date);
          createNotification({
            organizationId,
            userId: participantId,
            type: "meeting",
            title: "New Meeting Scheduled",
            body: `${currentUser?.name || "Someone"} scheduled "${
              event.title
            }" on ${eventDate.toLocaleDateString()} at ${
              event.startTime
            }`,
            isRead: false,
            timestamp: new Date().toISOString(),
          }).catch((err) =>
            logger.error("Error creating meeting notification", err)
          );
        }
      });
    } catch (error: unknown) {
      logger.error("Error adding event", error);
      addToast(getErrorMessage(error) || "Failed to add event", "error");
    }
  };

  const handleUpdateEvent = async (
    eventId: string,
    updates: Partial<CalendarEvent>
  ) => {
    try {
      if (!organizationId) throw new Error("Organization ID is required");
      if (!currentUser) throw new Error("User must be logged in");

      // Get original event to calculate hour differences
      const originalEvent = await getCalendarEvent(eventId);
      
      // Update the event first to ensure consistency
      await updateCalendarEvent(eventId, updates);
      
      // Update mentor hours if duration or mentorId changed
      // Use atomic increments to prevent race conditions
      if (originalEvent && (updates.duration || updates.mentorId !== undefined)) {
        const oldMentorId = originalEvent.mentorId;
        const newMentorId = updates.mentorId !== undefined ? updates.mentorId : oldMentorId;
        const oldDuration = originalEvent.duration;
        const newDuration = updates.duration || oldDuration;
        const oldHours = parseDurationToHours(oldDuration);
        const newHours = parseDurationToHours(newDuration);

        // If mentorId changed, adjust both mentors' hours
        if (oldMentorId !== newMentorId) {
          // Subtract old hours from old mentor (atomic)
          if (oldMentorId) {
            try {
              await incrementMentorHours(oldMentorId, -oldHours);
            } catch (error) {
              logger.error("Error updating old mentor hours", error);
            }
          }
          // Add new hours to new mentor (atomic)
          if (newMentorId) {
            try {
              await incrementMentorHours(newMentorId, newHours);
            } catch (error) {
              logger.error("Error updating new mentor hours", error);
            }
          }
        } else if (oldMentorId && oldHours !== newHours) {
          // Same mentor, but duration changed - adjust hours (atomic)
          try {
            const hourDifference = newHours - oldHours;
            await incrementMentorHours(oldMentorId, hourDifference);
          } catch (error) {
            logger.error("Error updating mentor hours", error);
            // Don't fail the event update if hours update fails
          }
        }
      }

      addToast("Event updated successfully", "success");
      
      // Refresh calendar events to show updated data
      await refreshData();
    } catch (error: unknown) {
      logger.error("Error updating event", error);
      addToast(getErrorMessage(error) || "Failed to update event", "error");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      if (!organizationId) throw new Error("Organization ID is required");
      if (!currentUser) throw new Error("User must be logged in");

      // Get event before deleting to update mentor hours
      // Use atomic increment to prevent race conditions
      const event = await getCalendarEvent(eventId);
      
      if (event && event.mentorId) {
        try {
          const hoursToSubtract = parseDurationToHours(event.duration);
          await incrementMentorHours(event.mentorId, -hoursToSubtract);
        } catch (error) {
          logger.error("Error updating mentor hours on delete", error);
          // Don't fail the deletion if hours update fails
        }
      }

      await deleteCalendarEvent(eventId);
      addToast("Event deleted successfully", "success");
      
      // Refresh calendar events to show updated data
      await refreshData();
    } catch (error: unknown) {
      logger.error("Error deleting event", error);
      addToast(getErrorMessage(error) || "Failed to delete event", "error");
    }
  };

  const handleSendInvite = async (inviteData: any) => {
    try {
      if (!organizationId || !currentUser || !organization)
        throw new Error("Organization ID, user, and organization are required");

      const { getInvitation, getInvitationByEmail } = await import("./services/database");
      let invitationId: string;
      let createdInvitation: any;

      // If an invitation ID is provided, reuse that invitation
      if (inviteData.invitationId) {
        invitationId = inviteData.invitationId;
        createdInvitation = await getInvitation(invitationId);
        
        if (!createdInvitation) {
          throw new Error("Failed to retrieve existing invitation");
        }
      } else {
        // Check if there's already an existing invitation for this email
        const existingInvitation = await getInvitationByEmail(
          inviteData.email.toLowerCase(),
          organizationId
        );

        if (existingInvitation) {
          // Reuse existing invitation
          invitationId = existingInvitation.id;
          createdInvitation = existingInvitation;
        } else {
          // Create new invitation (this will auto-generate token and link)
          invitationId = await createInvitation({
            organizationId,
            name: inviteData.name || "Unknown",
            email: inviteData.email.toLowerCase(),
            role: inviteData.role,
            status: "Pending",
            sentDate: new Date().toISOString().split("T")[0],
            inviterId: currentUser.id,
          });

          // Get the created invitation to retrieve the link
          createdInvitation = await getInvitation(invitationId);

          if (!createdInvitation) {
            throw new Error("Failed to retrieve created invitation");
          }
        }
      }

      if (createdInvitation && createdInvitation.invitationLink) {
        // Note: Email sending should be done via Cloud Function
        // For now, the invitation link is created and can be shared manually
        // TODO: Create Cloud Function endpoint to send invitation emails
        console.log(
          "Invitation created with link:",
          createdInvitation.invitationLink
        );

        // Optionally copy link to clipboard for easy sharing
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(
              createdInvitation.invitationLink
            );
            addToast(`Invitation link copied to clipboard!`, "success");
          } catch (clipboardError) {
            logger.error("Failed to copy to clipboard", clipboardError);
          }
        }
      }

      addToast(`Invitation sent to ${inviteData.email}`, "success");
    } catch (error: unknown) {
      logger.error("Error sending invitation", error);
      addToast(getErrorMessage(error) || "Failed to send invitation", "error");
    }
  };

  const handleSetupComplete = async (settings: ProgramSettings) => {
    try {
      if (!organizationId) throw new Error("Organization ID is required");
      if (!currentUser?.id) throw new Error("User ID is required");

      const onboardingComplete = getOnboardingComplete();
      setOnboardingComplete({
        ...onboardingComplete,
        [currentUser.id]: true,
      });
      await updateOrganization(organizationId, { programSettings: settings });
      addToast("Program configured successfully!", "success");
      setCurrentPage("dashboard");
    } catch (error: unknown) {
      logger.error("Error saving program settings", error);
      addToast(
        getErrorMessage(error) || "Failed to save program settings",
        "error"
      );
    }
  };

  // Calculate userManagementTab outside of renderContent to avoid hook order issues
  const userManagementTab = React.useMemo(() => {
    if (currentPage.startsWith('user-management')) {
      return currentPage.includes(':') 
        ? (currentPage.split(':')[1] as 'users' | 'organizations')
        : 'users';
    }
    return 'users'; // Default value when not on user-management page
  }, [currentPage]);

  const renderContent = () => {
    switch (currentPage) {
      case "setup":
        return <OrganizationSetup onComplete={handleSetupComplete} initialSettings={programSettings} />;
      case "mentor-onboarding":
        return (
          <MentorOnboarding
            onComplete={handleMentorOnboardingComplete}
            programSettings={programSettings}
            currentUser={currentUser || undefined}
          />
        );
      case "mentee-onboarding":
        return (
          <MenteeOnboarding
            onComplete={handleMenteeOnboardingComplete}
            programSettings={programSettings}
            currentUser={currentUser || undefined}
          />
        );
      case "dashboard":
        if (!currentUser)
          return <LoadingSpinner message="Loading dashboard..." />;
        return (
          <Suspense
            fallback={<LoadingSpinner message="Loading dashboard..." />}
          >
            <ErrorBoundary title="Dashboard Error">
              <Dashboard
                user={currentUser}
                users={users}
                matches={matches}
                goals={goals}
                ratings={ratings}
                calendarEvents={calendarEvents}
                programSettings={programSettings}
                organizationCode={organization?.organizationCode}
                organization={organization}
                onApproveRating={async (id) => {
                  try {
                    await updateRating(id, { isApproved: true });
                    addToast("Rating approved", "success");
                  } catch (error: unknown) {
                    logger.error("Error approving rating", error);
                    addToast(
                      getErrorMessage(error) || "Failed to approve rating",
                      "error"
                    );
                  }
                }}
                onRejectRating={async (id) => {
                  try {
                    await deleteRating(id);
                    addToast("Rating rejected and removed", "success");
                  } catch (error: unknown) {
                    logger.error("Error rejecting rating", error);
                    addToast(
                      getErrorMessage(error) || "Failed to reject rating",
                      "error"
                    );
                  }
                }}
                onAddRating={async (r) => {
                  try {
                    if (!organizationId)
                      throw new Error("Organization ID is required");
                    await createRating({ ...r, organizationId });
                    addToast("Rating submitted for approval", "success");
                  } catch (error: unknown) {
                    logger.error("Error creating rating", error);
                    addToast(
                      getErrorMessage(error) || "Failed to submit rating",
                      "error"
                    );
                  }
                }}
                onNavigate={setCurrentPage}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case "participants":
        return (
          <Suspense
            fallback={<LoadingSpinner message="Loading participants..." />}
          >
            <ErrorBoundary title="Participants Error">
              <Participants
                users={users}
                matches={matches}
                onNavigate={setCurrentPage}
                currentUser={currentUser}
                organizationId={organizationId}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case "matching":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading matching..." />}>
            <ErrorBoundary title="Matching Error">
              <Matching
                users={users}
                matches={matches}
                onCreateMatch={handleCreateMatch}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case "my-goals":
        if (!currentUser) return <LoadingSpinner message="Loading goals..." />;
        return (
          <Suspense fallback={<LoadingSpinner message="Loading goals..." />}>
            <ErrorBoundary title="Goals Error">
              <Goals
                user={currentUser}
                goals={goals}
                matches={matches}
                onAddGoal={handleAddGoal}
                onUpdateGoal={handleUpdateGoal}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case "resources":
        if (!currentUser)
          return <LoadingSpinner message="Loading resources..." />;
        return (
          <Suspense
            fallback={<LoadingSpinner message="Loading resources..." />}
          >
            <ErrorBoundary title="Resources Error">
              <Resources
                user={currentUser}
                customResources={resources}
                onAddResource={async (r) => {
                  try {
                    if (!organizationId)
                      throw new Error("Organization ID is required");
                    await createResource({
                      ...r,
                      organizationId,
                      uploadedBy: currentUser.id,
                    });
                    addToast("Resource added to library", "success");
                  } catch (error: unknown) {
                    logger.error("Error adding resource", error);
                    addToast(
                      getErrorMessage(error) || "Failed to add resource",
                      "error"
                    );
                  }
                }}
                blogPosts={blogPosts}
                onAddBlogPost={handleAddBlogPost}
                onUpdateBlogPost={handleUpdateBlogPost}
                onDeleteBlogPost={handleDeleteBlogPost}
                discussionGuides={discussionGuides}
                onAddDiscussionGuide={handleAddDiscussionGuide}
                onUpdateDiscussionGuide={handleUpdateDiscussionGuide}
                onDeleteDiscussionGuide={handleDeleteDiscussionGuide}
                careerTemplates={careerTemplates}
                onAddCareerTemplate={handleAddCareerTemplate}
                onUpdateCareerTemplate={handleUpdateCareerTemplate}
                onDeleteCareerTemplate={handleDeleteCareerTemplate}
                trainingVideos={trainingVideos}
                onAddTrainingVideo={handleAddTrainingVideo}
                onUpdateTrainingVideo={handleUpdateTrainingVideo}
                onDeleteTrainingVideo={handleDeleteTrainingVideo}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case "chat":
      case "chat-mentors":
      case "chat-mentees":
        if (!currentUser || !organizationId)
          return <LoadingSpinner message="Loading messages..." />;
        // Handle chat page with optional chatId (format: "chat:userId" or "chat:groupId")
        let chatId: string | undefined;
        if (currentPage.startsWith("chat:")) {
          // Extract chatId from "chat:userId" format
          chatId = currentPage.split(":")[1];
        } else if (currentPage === "chat-mentors") {
          chatId = "g-mentors";
        } else if (currentPage === "chat-mentees") {
          chatId = "g-mentees";
        }
        return (
          <Suspense fallback={<LoadingSpinner message="Loading messages..." />}>
            <ErrorBoundary title="Messages Error">
              <Chat
                currentUser={currentUser}
                users={users}
                organizationId={organizationId}
                initialChatId={chatId}
                matches={matches}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case "calendar":
        if (!currentUser)
          return <LoadingSpinner message="Loading calendar..." />;
        return (
          <Suspense fallback={<LoadingSpinner message="Loading calendar..." />}>
            <ErrorBoundary title="Calendar Error">
              <CalendarView
                events={calendarEvents}
                currentUser={currentUser}
                onAddEvent={handleAddEvent}
                onUpdateEvent={handleUpdateEvent}
                onNavigate={setCurrentPage}
                users={users}
                matches={matches}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case "referrals":
        if (!currentUser)
          return <LoadingSpinner message="Loading referrals..." />;
        return (
          <Suspense
            fallback={<LoadingSpinner message="Loading referrals..." />}
          >
            <ErrorBoundary title="Referrals Error">
              <Referrals
                currentUser={currentUser}
                onNavigate={setCurrentPage}
                onSendInvite={handleSendInvite}
                existingInvitations={invitations}
                organizationCode={organization?.organizationCode}
                organizationId={organizationId || undefined}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case "notifications":
        return (
          <Suspense
            fallback={<LoadingSpinner message="Loading notifications..." />}
          >
            <ErrorBoundary title="Notifications Error">
              <NotificationsView
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onDismiss={dismissNotification}
                onDelete={handleDeleteNotification}
                onNavigate={setCurrentPage}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case "platform-operator-management":
        // Check platform admin access - handle both enum and string role representations
        // If impersonating, MUST use original operator's role for access control
        // originalOperator is guaranteed to be loaded at this point due to loading check above
        const userForPlatformOpCheck = isImpersonating ? originalOperator : currentUser;
        if (!userForPlatformOpCheck) {
          return <div className="p-8 text-center">Access denied.</div>;
        }
        const platformOpRoleStr = String(userForPlatformOpCheck.role);
        const isPlatformOp = userForPlatformOpCheck.role === Role.PLATFORM_ADMIN || 
                            platformOpRoleStr === "PLATFORM_ADMIN" || 
                            platformOpRoleStr === "PLATFORM_OPERATOR";
        if (!isPlatformOp) {
          return <div className="p-8 text-center">Access denied.</div>;
        }
        return (
          <Suspense
            fallback={<LoadingSpinner message="Loading platform operator management..." />}
          >
            <ErrorBoundary title="Platform Operator Management Error">
              <PlatformOperatorManagement currentUser={userForPlatformOpCheck} />
            </ErrorBoundary>
          </Suspense>
        );
      default:
        // Handle chat routes with userId (format: "chat:userId")
        if (currentPage.startsWith("chat:")) {
          if (!currentUser || !organizationId)
            return <LoadingSpinner message="Loading messages..." />;
          // Extract chatId from "chat:userId" format
          const chatId = currentPage.split(":")[1];
          return (
            <Suspense fallback={<LoadingSpinner message="Loading messages..." />}>
              <ErrorBoundary title="Messages Error">
                <Chat
                  currentUser={currentUser}
                  users={users}
                  organizationId={organizationId}
                  initialChatId={chatId}
                  matches={matches}
                />
              </ErrorBoundary>
            </Suspense>
          );
        }
        if (currentPage.startsWith("user-management")) {
          // Check platform admin access - handle both enum and string role representations
          // If impersonating, MUST use original operator's role for access control
          // originalOperator is guaranteed to be loaded at this point due to loading check above
          const userForAccessCheck = isImpersonating ? originalOperator : currentUser;
          if (!userForAccessCheck) {
            return <div className="p-8 text-center">Access denied.</div>;
          }
          const userMgmtRoleStr = String(userForAccessCheck.role);
          const isPlatformOpForMgmt = userForAccessCheck.role === Role.PLATFORM_ADMIN || 
                                     userMgmtRoleStr === "PLATFORM_ADMIN" || 
                                     userMgmtRoleStr === "PLATFORM_OPERATOR";
          if (!isPlatformOpForMgmt) {
            return <div className="p-8 text-center">Access denied.</div>;
          }
          // Use the memoized userManagementTab calculated at component level
          // Pass userForAccessCheck (originalOperator when impersonating) so component access control works correctly
          return (
            <Suspense
              fallback={<LoadingSpinner message="Loading user management..." />}
            >
              <ErrorBoundary title="User Management Error">
                <UserManagement
                  key={`user-mgmt-${userManagementTab}`}
                  currentUser={userForAccessCheck}
                  onNavigate={setCurrentPage}
                  initialTab={userManagementTab}
                />
              </ErrorBoundary>
            </Suspense>
          );
        }
        if (currentPage.startsWith("settings")) {
          const tab = currentPage.split(":")[1];
          // Redirect old platform-admin route to new page (handled via useEffect)
          if (tab === 'platform-admin') {
            return <LoadingSpinner message="Redirecting..." />;
          }
          return (
            <Suspense
              fallback={<LoadingSpinner message="Loading settings..." />}
            >
              <ErrorBoundary title="Settings Error">
                <SettingsView
                  user={currentUser}
                  onUpdateUser={handleUpdateUser}
                  initialTab={tab || "profile"}
                  organizationId={organizationId}
                  programSettings={programSettings}
                  matches={matches}
                  onUpdateOrganization={(orgId, updates) =>
                    updateOrganization(orgId, updates)
                  }
                />
              </ErrorBoundary>
            </Suspense>
          );
        }
        return <LoadingSpinner />;
    }
  };

  const handleNavigate = (page: string, tab?: string) => {
    setCurrentPage(tab ? `${page}:${tab}` : page);
  };

  const handlePublicNavigate = (page: string) => {
    const validPublicRoutes = [
      "landing",
      "auth",
      "org-signup",
      "pricing",
      "legal",
      "enterprise",
      "features",
      "how-it-works",
      "blog",
      "community",
      "help",
      "contact",
    ];
    setPublicRoute(
      validPublicRoutes.includes(page) ? (page as PublicRoute) : "landing"
    );
  };

  if (publicRoute !== "hidden") {
    const CommonLayout = ({ children }: { children: React.ReactNode }) => (
      <>
        {children}
        <PrivacyBanner onNavigate={handlePublicNavigate} />
      </>
    );

    if (publicRoute === "auth") {
      return (
        <CommonLayout>
          <Authentication
            onLogin={(isNewOrg, isParticipant, participantRole) => {
              const role =
                participantRole === "MENTOR"
                  ? Role.MENTOR
                  : participantRole === "MENTEE"
                  ? Role.MENTEE
                  : undefined;
              handleLogin(isNewOrg, isParticipant, role);
            }}
            onNavigate={handlePublicNavigate}
            initialMode={authInitialMode}
          />
        </CommonLayout>
      );
    }

    if (publicRoute === "org-signup") {
      return (
        <CommonLayout>
          <OrganizationSignup
            onLogin={(isNewOrg, isParticipant, participantRole) => {
              const role =
                participantRole === "MENTOR"
                  ? Role.MENTOR
                  : participantRole === "MENTEE"
                  ? Role.MENTEE
                  : undefined;
              handleLogin(isNewOrg, isParticipant, role);
            }}
            onNavigate={handlePublicNavigate}
          />
        </CommonLayout>
      );
    }

    if (publicRoute === "landing") {
      return (
        <CommonLayout>
          <LandingPage
            onSignup={() => {
              setAuthInitialMode("choose");
              setPublicRoute("auth");
            }}
            onLogin={() => {
              setAuthInitialMode("login");
              setPublicRoute("auth");
            }}
            onNavigate={handlePublicNavigate}
          />
        </CommonLayout>
      );
    }

    return (
      <CommonLayout>
        <PublicPages
          page={publicRoute}
          onNavigate={handlePublicNavigate}
          onSignup={() => {
            setAuthInitialMode("choose");
            setPublicRoute("auth");
          }}
          onLogin={() => {
            setAuthInitialMode("login");
            setPublicRoute("auth");
          }}
          blogPosts={blogPosts.filter((p) => p.published)}
        />
      </CommonLayout>
    );
  }

  // Block rendering until originalOperator is loaded when impersonating
  // This prevents access control checks from using the impersonated user's role
  if (isImpersonating && originalOperatorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">
            Verifying access permissions...
          </p>
        </div>
      </div>
    );
  }

  // If impersonating but originalOperator failed to load or is missing, deny access
  if (isImpersonating && !originalOperator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-600 dark:text-red-400 mb-4 text-lg font-semibold">
            Access Verification Failed
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Unable to verify your access permissions. Please log out and try again.
          </p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-600 dark:text-red-400 mb-4 text-lg font-semibold">
            Error Loading Data
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{dataError}</p>
          <button
            onClick={() => refreshData()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-slate-600 dark:text-slate-400 mb-4">
            Please log in to continue
          </div>
          <button
            onClick={() => {
              setAuthInitialMode("login");
              setPublicRoute("auth");
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Layout
        currentUser={currentUser}
        originalOperator={isImpersonating ? originalOperator : null}
        users={users}
        currentPage={currentPage.split(":")[0]}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDismiss={dismissNotification}
        toasts={toasts}
        removeToast={removeToast}
        programSettings={programSettings}
      >
        {renderContent()}
      </Layout>
      <PrivacyBanner />
    </>
  );
};

export default App;
