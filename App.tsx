import React, { useState, useEffect, lazy, Suspense } from "react";
import Layout from "./components/Layout";
import LandingPage from "./components/LandingPage";
import Authentication from "./components/Authentication";
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
import { useOrganizationData } from "./hooks/useOrganizationData";
import {
  createMatch,
  updateMatch,
  createGoal,
  updateGoal,
  deleteGoal,
  createRating,
  updateRating,
  createResource,
  deleteResource,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  createNotification,
  updateNotification,
  deleteNotification,
  createInvitation,
  updateInvitation,
  updateUser,
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
import { getErrorMessage } from "./utils/errors";

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
  | "pricing"
  | "legal"
  | "enterprise"
  | "features"
  | "how-it-works"
  | "blog"
  | "community"
  | "help"
  | "contact";

const App: React.FC = () => {
  // Navigation State
  const [publicRoute, setPublicRoute] = useState<PublicRoute | "hidden">(
    "landing"
  );
  const [authInitialMode, setAuthInitialMode] = useState<
    "login" | "org-signup" | "participant-signup" | "choose"
  >("choose");
  const [currentPage, setCurrentPage] = useState("dashboard");

  // Get userId and organizationId from localStorage (set during authentication)
  const [userId, setUserId] = useState<string | null>(
    localStorage.getItem("userId")
  );
  const [organizationId, setOrganizationId] = useState<string | null>(
    localStorage.getItem("organizationId")
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

  // Load published blog posts for public pages
  useEffect(() => {
    const loadBlogPosts = async () => {
      try {
        const posts = await getBlogPosts(true); // Only published posts
        setBlogPosts(posts);
      } catch (error) {
        console.error("Error loading blog posts:", error);
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

  // Hooks for state management and actions
  const { toasts, addToast, removeToast } = useToasts();
  const {
    getOnboardingComplete,
    setOnboardingComplete,
    markUserOnboardingComplete,
  } = useOnboarding();

  // Handle navigation based on user state and onboarding status
  useEffect(() => {
    if (!loadedUser || publicRoute !== "hidden") return;

    const onboardingComplete = getOnboardingComplete();
    const needsOrgSetup = loadedUser.role === Role.ADMIN && !programSettings;
    const needsMentorOnboarding =
      loadedUser.role === Role.MENTOR &&
      !onboardingComplete[loadedUser.id || ""];
    const needsMenteeOnboarding =
      loadedUser.role === Role.MENTEE &&
      !onboardingComplete[loadedUser.id || ""];

    // Only auto-navigate if we're on dashboard or a generic page
    if (currentPage === "dashboard" || !currentPage || currentPage === "") {
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
      console.error("Error marking notification as read:", error);
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
      console.error("Error marking all notifications as read:", error);
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
      console.error("Error deleting notification:", error);
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
      setCurrentUser(updatedUser);
      await updateUser(updatedUser.id, updatedUser);
      addToast("Profile updated successfully", "success");
    } catch (error: unknown) {
      console.error("Error updating user:", error);
      await refreshData();
      addToast(getErrorMessage(error) || "Failed to update profile", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("organizationId");
    localStorage.removeItem("authToken");
    localStorage.removeItem("google_id_token");
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

      const mentor = users.find((u) => u.id === mentorId);
      const mentee = users.find((u) => u.id === menteeId);

      if (organizationId) {
        createNotification({
          organizationId,
          userId: menteeId,
          type: "bridge",
          title: "New Mentor Match",
          body: mentor
            ? `You have been matched with ${mentor.name}!`
            : "You have been matched with a new mentor!",
          isRead: false,
          timestamp: new Date().toISOString(),
        }).catch((err) =>
          console.error("Error creating notification for mentee:", err)
        );

        createNotification({
          organizationId,
          userId: mentorId,
          type: "bridge",
          title: "New Mentee Match",
          body: mentee
            ? `You have been matched with ${mentee.name}!`
            : "You have been matched with a new mentee!",
          isRead: false,
          timestamp: new Date().toISOString(),
        }).catch((err) =>
          console.error("Error creating notification for mentor:", err)
        );
      }
    } catch (error: unknown) {
      console.error("Error creating match:", error);
      addToast(getErrorMessage(error) || "Failed to create match", "error");
    }
  };

  const handleAddEvent = async (
    event: Omit<CalendarEvent, "id" | "createdAt">
  ) => {
    try {
      if (!organizationId) throw new Error("Organization ID is required");
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
          currentUser!.id,
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
        console.error("Failed to sync to calendars:", syncError);
      }

      addToast("Event added to calendar", "success");
      const participants = event.participants || [];
      participants.forEach((participantId) => {
        if (participantId !== currentUser?.id) {
          createNotification({
            organizationId,
            userId: participantId,
            type: "meeting",
            title: "New Meeting Scheduled",
            body: `${currentUser?.name || "Someone"} scheduled "${
              event.title
            }" on ${new Date(event.date).toLocaleDateString()} at ${
              event.startTime
            }`,
            isRead: false,
            timestamp: new Date().toISOString(),
          }).catch((err) =>
            console.error("Error creating meeting notification:", err)
          );
        }
      });
    } catch (error: unknown) {
      console.error("Error adding event:", error);
      addToast(getErrorMessage(error) || "Failed to add event", "error");
    }
  };

  const handleSendInvite = async (inviteData: any) => {
    try {
      if (!organizationId || !currentUser)
        throw new Error("Organization ID and user are required");
      const newInvite: Omit<Invitation, "id"> = {
        organizationId,
        name: inviteData.name || "Unknown",
        email: inviteData.email,
        role: inviteData.role,
        status: "Pending",
        sentDate: new Date().toISOString().split("T")[0],
        inviterId: currentUser.id,
      };
      await createInvitation(newInvite);
      addToast(`Invitation sent to ${inviteData.email}`, "success");
    } catch (error: unknown) {
      console.error("Error sending invitation:", error);
      addToast(getErrorMessage(error) || "Failed to send invitation", "error");
    }
  };

  const handleSetupComplete = async (settings: ProgramSettings) => {
    try {
      if (!organizationId) throw new Error("Organization ID is required");
      const onboardingComplete = getOnboardingComplete();
      setOnboardingComplete({
        ...onboardingComplete,
        [currentUser?.id || ""]: true,
      });
      await updateOrganization(organizationId, { programSettings: settings });
      addToast("Program configured successfully!", "success");
      setCurrentPage("dashboard");
    } catch (error: unknown) {
      console.error("Error saving program settings:", error);
      addToast(
        getErrorMessage(error) || "Failed to save program settings",
        "error"
      );
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case "setup":
        return <OrganizationSetup onComplete={handleSetupComplete} />;
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
                onApproveRating={async (id) => {
                  try {
                    await updateRating(id, { isApproved: true });
                    addToast("Rating approved", "success");
                  } catch (error: unknown) {
                    console.error("Error approving rating:", error);
                    addToast(
                      getErrorMessage(error) || "Failed to approve rating",
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
                    console.error("Error creating rating:", error);
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
                    console.error("Error adding resource:", error);
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
        const chatId =
          currentPage === "chat-mentors"
            ? "g-mentors"
            : currentPage === "chat-mentees"
            ? "g-mentees"
            : undefined;
        return (
          <Suspense fallback={<LoadingSpinner message="Loading messages..." />}>
            <ErrorBoundary title="Messages Error">
              <Chat
                currentUser={currentUser}
                users={users}
                organizationId={organizationId}
                initialChatId={chatId}
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
                onNavigate={setCurrentPage}
                users={users}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case "referrals":
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
      case "user-management":
        if (!currentUser || currentUser.role !== Role.PLATFORM_ADMIN)
          return <div className="p-8 text-center">Access denied.</div>;
        return (
          <Suspense
            fallback={<LoadingSpinner message="Loading user management..." />}
          >
            <ErrorBoundary title="User Management Error">
              <UserManagement
                currentUser={currentUser}
                onNavigate={setCurrentPage}
              />
            </ErrorBoundary>
          </Suspense>
        );
      default:
        if (currentPage.startsWith("settings")) {
          const tab = currentPage.split(":")[1];
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
