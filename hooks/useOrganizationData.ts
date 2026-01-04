import { useState, useEffect, useCallback, useRef } from "react";
import {
  Role,
  User,
  Match,
  Goal,
  Rating,
  Resource,
  CalendarEvent,
  Notification,
  Invitation,
  Organization,
  ProgramSettings,
  BlogPost,
  DiscussionGuide,
  CareerTemplate,
  TrainingVideo,
} from "../types";
import {
  subscribeToUser,
  subscribeToOrganization,
  subscribeToUsersByOrganization,
  subscribeToMatchesByOrganization,
  subscribeToGoalsByOrganization,
  subscribeToRatingsByOrganization,
  subscribeToResourcesByOrganization,
  subscribeToCalendarEventsByOrganization,
  subscribeToNotificationsByUser,
  subscribeToInvitationsByOrganization,
  subscribeToBlogPosts,
  subscribeToDiscussionGuides,
  subscribeToCareerTemplates,
  subscribeToTrainingVideos,
  Unsubscribe,
} from "../services/database";

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

const cache = new SimpleCache();

interface UseOrganizationDataResult {
  // Data
  currentUser: User | null;
  users: User[];
  matches: Match[];
  goals: Goal[];
  ratings: Rating[];
  resources: Resource[];
  calendarEvents: CalendarEvent[];
  notifications: Notification[];
  invitations: Invitation[];
  organization: Organization | null;
  programSettings: ProgramSettings | null;
  blogPosts: BlogPost[];
  discussionGuides: DiscussionGuide[];
  careerTemplates: CareerTemplate[];
  trainingVideos: TrainingVideo[];

  // Loading states
  loading: boolean;
  error: string | null;

  // Refresh function
  refresh: () => Promise<void>;
}

export const useOrganizationData = (
  userId: string | null,
  organizationId: string | null
): UseOrganizationDataResult => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [programSettings, setProgramSettings] =
    useState<ProgramSettings | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [discussionGuides, setDiscussionGuides] = useState<DiscussionGuide[]>([]);
  const [careerTemplates, setCareerTemplates] = useState<CareerTemplate[]>([]);
  const [trainingVideos, setTrainingVideos] = useState<TrainingVideo[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // Store unsubscribe functions
  const unsubscribesRef = useRef<Unsubscribe[]>([]);

  // Cleanup function
  const cleanup = useCallback(() => {
    unsubscribesRef.current.forEach((unsub) => unsub());
    unsubscribesRef.current = [];
  }, []);

  // Setup real-time listeners
  useEffect(() => {
    if (!userId || !organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if this is a platform admin (organizationId === "platform" or role is PLATFORM_ADMIN)
      const isPlatformAdmin = organizationId === "platform";

      // Check cache first for initial load
      const cacheKey = `org-${organizationId}`;
      const cachedData = cache.get<any>(cacheKey);
      if (cachedData && refreshKey === 0) { // Only use cache if not explicitly refreshing
        // Use cached data for initial render
        setCurrentUser(cachedData.currentUser);
        setUsers(cachedData.users || []);
        setMatches(cachedData.matches || []);
        setGoals(cachedData.goals || []);
        setRatings(cachedData.ratings || []);
        setResources(cachedData.resources || []);
        setCalendarEvents(cachedData.calendarEvents || []);
        setNotifications(cachedData.notifications || []);
        setInvitations(cachedData.invitations || []);
        setOrganization(cachedData.organization);
        setProgramSettings(cachedData.programSettings);
        setBlogPosts(cachedData.blogPosts || []);
        setDiscussionGuides(cachedData.discussionGuides || []);
        setCareerTemplates(cachedData.careerTemplates || []);
        setTrainingVideos(cachedData.trainingVideos || []);
        setLoading(false);
      }

      // Subscribe to current user
      const unsubscribeUser = subscribeToUser(userId, (user) => {
        setCurrentUser(user);
        // Update cache
        const currentCache = cache.get<any>(cacheKey) || {};
        cache.set(
          cacheKey,
          { ...currentCache, currentUser: user },
          5 * 60 * 1000
        );

        // For platform admins, set loading to false once user is loaded
        // Also verify user role matches platform admin (check both enum and string values)
        const userRoleString = user?.role ? String(user.role) : "";
        const isUserPlatformAdmin = isPlatformAdmin || 
                                    user?.role === Role.PLATFORM_ADMIN || 
                                    userRoleString === "PLATFORM_ADMIN" || 
                                    userRoleString === "PLATFORM_OPERATOR";
        if (isUserPlatformAdmin) {
          setLoading(false);
          // Platform admins don't have organization data
          setOrganization(null);
          setProgramSettings(null);
          setUsers([]);
          setMatches([]);
          setGoals([]);
          setRatings([]);
          setResources([]);
          setCalendarEvents([]);
          setNotifications([]);
          setInvitations([]);
          setBlogPosts([]);
          setDiscussionGuides([]);
          setCareerTemplates([]);
          setTrainingVideos([]);
        }
      });
      unsubscribesRef.current.push(unsubscribeUser);

      // Skip organization-specific subscriptions for platform admins
      if (isPlatformAdmin) {
        // Platform admins don't have an organization, so set these to empty/null
        setOrganization(null);
        setProgramSettings(null);
        setUsers([]);
        setMatches([]);
        setGoals([]);
        setRatings([]);
        setResources([]);
        setCalendarEvents([]);
        setNotifications([]);
        setInvitations([]);
        setBlogPosts([]);
        setDiscussionGuides([]);
        setCareerTemplates([]);
        setTrainingVideos([]);
        // Return early to skip organization-scoped subscriptions
        // Platform admins use getAllX() functions in Dashboard component instead
        return;
      }

      // Subscribe to organization (only for non-platform admins)
      const unsubscribeOrg = subscribeToOrganization(organizationId, (org) => {
        setOrganization(org);
        if (org) {
          setProgramSettings(org.programSettings);
          // Update cache
          const currentCache = cache.get<any>(cacheKey) || {};
          cache.set(
            cacheKey,
            {
              ...currentCache,
              organization: org,
              programSettings: org.programSettings,
            },
            5 * 60 * 1000
          );
        }
      });
      unsubscribesRef.current.push(unsubscribeOrg);

      // Subscribe to users
      const unsubscribeUsers = subscribeToUsersByOrganization(
        organizationId,
        (orgUsers) => {
          setUsers(orgUsers);
          const currentCache = cache.get<any>(cacheKey) || {};
          cache.set(
            cacheKey,
            { ...currentCache, users: orgUsers },
            5 * 60 * 1000
          );
        }
      );
      unsubscribesRef.current.push(unsubscribeUsers);

      // Subscribe to matches
      const unsubscribeMatches = subscribeToMatchesByOrganization(
        organizationId,
        (orgMatches) => {
          setMatches(orgMatches);
          const currentCache = cache.get<any>(cacheKey) || {};
          cache.set(
            cacheKey,
            { ...currentCache, matches: orgMatches },
            5 * 60 * 1000
          );
        }
      );
      unsubscribesRef.current.push(unsubscribeMatches);

      // Subscribe to goals
      const unsubscribeGoals = subscribeToGoalsByOrganization(
        organizationId,
        (orgGoals) => {
          setGoals(orgGoals);
          const currentCache = cache.get<any>(cacheKey) || {};
          cache.set(
            cacheKey,
            { ...currentCache, goals: orgGoals },
            5 * 60 * 1000
          );
        }
      );
      unsubscribesRef.current.push(unsubscribeGoals);

      // Subscribe to ratings
      const unsubscribeRatings = subscribeToRatingsByOrganization(
        organizationId,
        (orgRatings) => {
          setRatings(orgRatings);
          const currentCache = cache.get<any>(cacheKey) || {};
          cache.set(
            cacheKey,
            { ...currentCache, ratings: orgRatings },
            5 * 60 * 1000
          );
        }
      );
      unsubscribesRef.current.push(unsubscribeRatings);

      // Subscribe to resources
      const unsubscribeResources = subscribeToResourcesByOrganization(
        organizationId,
        (orgResources) => {
          setResources(orgResources);
          const currentCache = cache.get<any>(cacheKey) || {};
          cache.set(
            cacheKey,
            { ...currentCache, resources: orgResources },
            5 * 60 * 1000
          );
        }
      );
      unsubscribesRef.current.push(unsubscribeResources);

      // Subscribe to calendar events
      const unsubscribeEvents = subscribeToCalendarEventsByOrganization(
        organizationId,
        (orgEvents) => {
          setCalendarEvents(orgEvents);
          const currentCache = cache.get<any>(cacheKey) || {};
          cache.set(
            cacheKey,
            { ...currentCache, calendarEvents: orgEvents },
            5 * 60 * 1000
          );
        }
      );
      unsubscribesRef.current.push(unsubscribeEvents);

      // Subscribe to notifications
      const unsubscribeNotifications = subscribeToNotificationsByUser(
        userId,
        organizationId,
        (userNotifications) => {
          setNotifications(userNotifications);
          const currentCache = cache.get<any>(cacheKey) || {};
          cache.set(
            cacheKey,
            { ...currentCache, notifications: userNotifications },
            5 * 60 * 1000
          );
        }
      );
      unsubscribesRef.current.push(unsubscribeNotifications);

      // Subscribe to invitations
      const unsubscribeInvitations = subscribeToInvitationsByOrganization(
        organizationId,
        (orgInvitations) => {
          setInvitations(orgInvitations);
          const currentCache = cache.get<any>(cacheKey) || {};
          cache.set(
            cacheKey,
            { ...currentCache, invitations: orgInvitations },
            5 * 60 * 1000
          );
        }
      );
      unsubscribesRef.current.push(unsubscribeInvitations);

      // Subscribe to blog posts
      const unsubscribeBlog = subscribeToBlogPosts((posts) => {
        setBlogPosts(posts);
        const currentCache = cache.get<any>(cacheKey) || {};
        cache.set(
          cacheKey,
          { ...currentCache, blogPosts: posts },
          5 * 60 * 1000
        );
      });
      unsubscribesRef.current.push(unsubscribeBlog);

      // Subscribe to discussion guides
      const unsubscribeGuides = subscribeToDiscussionGuides(organizationId, (guides) => {
        setDiscussionGuides(guides);
        const currentCache = cache.get<any>(cacheKey) || {};
        cache.set(
          cacheKey,
          { ...currentCache, discussionGuides: guides },
          5 * 60 * 1000
        );
      });
      unsubscribesRef.current.push(unsubscribeGuides);

      // Subscribe to career templates
      const unsubscribeTemplates = subscribeToCareerTemplates(organizationId, (templates) => {
        setCareerTemplates(templates);
        const currentCache = cache.get<any>(cacheKey) || {};
        cache.set(
          cacheKey,
          { ...currentCache, careerTemplates: templates },
          5 * 60 * 1000
        );
      });
      unsubscribesRef.current.push(unsubscribeTemplates);

      // Subscribe to training videos
      const unsubscribeVideos = subscribeToTrainingVideos(organizationId, (videos) => {
        setTrainingVideos(videos);
        const currentCache = cache.get<any>(cacheKey) || {};
        cache.set(
          cacheKey,
          { ...currentCache, trainingVideos: videos },
          5 * 60 * 1000
        );
      });
      unsubscribesRef.current.push(unsubscribeVideos);

      setLoading(false);
    } catch (err: unknown) {
      console.error("Error setting up real-time listeners:", err);
      setError(getErrorMessage(err) || "Failed to load data");
      setLoading(false);
    }

    // Cleanup on unmount or when dependencies change
    return cleanup;
  }, [userId, organizationId, cleanup, refreshKey]);

  // Refresh function - clears cache and forces reload
  const refresh = useCallback(async () => {
    if (organizationId) {
      cache.delete(`org-${organizationId}`);
    }
    // Increment version to trigger effect re-run
    setRefreshKey(prev => prev + 1);
  }, [organizationId]);

  return {
    currentUser,
    users,
    matches,
    goals,
    ratings,
    resources,
    calendarEvents,
    notifications,
    invitations,
    organization,
    programSettings,
    blogPosts,
    discussionGuides,
    careerTemplates,
    trainingVideos,
    loading,
    error,
    refresh,
  };
};
