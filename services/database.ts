import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  addDoc,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  QuerySnapshot,
  DocumentSnapshot,
  startAfter,
  QueryDocumentSnapshot,
  Unsubscribe,
  increment,
} from "firebase/firestore";

// Helper function to safely convert Firestore Timestamp to ISO string
const convertTimestamp = (value: any): string => {
  if (!value) {
    return new Date().toISOString();
  }
  // If it's already a string, return it
  if (typeof value === "string") {
    return value;
  }
  // If it's a Firestore Timestamp, convert it
  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  // If it's a Date object, convert it
  if (value instanceof Date) {
    return value.toISOString();
  }
  // Fallback to current date
  return new Date().toISOString();
};

// Export Unsubscribe type for use in hooks
export type { Unsubscribe };
import { db } from "./firebase";
import { logger } from "./logger";
import {
  User,
  Match,
  Goal,
  Milestone,
  Rating,
  Resource,
  CalendarEvent,
  Notification,
  Invitation,
  Organization,
  ProgramSettings,
  ChatMessage,
  ChatGroup,
  BlogPost,
  DiscussionGuide,
  CareerTemplate,
  TrainingVideo,
  PrivateMessageRequest,
} from "../types";
import { getErrorCode, getErrorMessage } from "../utils/errors";

// ==================== ORGANIZATION OPERATIONS ====================

export const createOrganization = async (
  orgData: Omit<Organization, "id" | "createdAt" | "organizationCode">
): Promise<string> => {
  const orgRef = doc(collection(db, "organizations"));
  const organizationCode = generateOrganizationCode();

  await setDoc(orgRef, {
    ...orgData,
    organizationCode,
    createdAt: Timestamp.now(),
  });

  return orgRef.id;
};

export const getOrganization = async (
  organizationId: string
): Promise<Organization | null> => {
  const orgRef = doc(db, "organizations", organizationId);
  const orgSnap = await getDoc(orgRef);

  if (!orgSnap.exists()) {
    return null;
  }

  return {
    id: orgSnap.id,
    ...orgSnap.data(),
    createdAt: convertTimestamp(orgSnap.data().createdAt),
  } as Organization;
};

export const getOrganizationByCode = async (
  code: string
): Promise<Organization | null> => {
  const q = query(
    collection(db, "organizations"),
    where("organizationCode", "==", code)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const orgDoc = snapshot.docs[0];
  return {
    id: orgDoc.id,
    ...orgDoc.data(),
    createdAt: convertTimestamp(orgDoc.data().createdAt),
  } as Organization;
};

export const updateOrganization = async (
  organizationId: string,
  updates: Partial<Organization>
): Promise<void> => {
  const orgRef = doc(db, "organizations", organizationId);
  await updateDoc(orgRef, updates);
};

export const getAllOrganizations = async (): Promise<Organization[]> => {
  try {
    // Try with orderBy first, but fallback to no orderBy if index missing
    let q = query(
      collection(db, "organizations"),
      orderBy("createdAt", "desc")
    );
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (error: unknown) {
      // If index missing, try without orderBy
      const errorCode = getErrorCode(error);
      const errorMessage = getErrorMessage(error);
      if (
        errorCode === "failed-precondition" ||
        errorMessage.includes("index")
      ) {
        console.warn(
          "Index missing for organizations createdAt, fetching without orderBy"
        );
        q = query(collection(db, "organizations"));
        snapshot = await getDocs(q);
        // Sort in memory
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertTimestamp(doc.data().createdAt),
        })) as Organization[];
        return docs.sort((a, b) => {
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return bDate - aDate; // Descending
        });
      } else {
        throw error;
      }
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
    })) as Organization[];
  } catch (error) {
    logger.error("Error in getAllOrganizations", error);
    throw error;
  }
};

export const deleteOrganization = async (
  organizationId: string
): Promise<void> => {
  const orgRef = doc(db, "organizations", organizationId);
  await deleteDoc(orgRef);
};

// ==================== USER OPERATIONS ====================

export const createUser = async (
  userData: Omit<User, "id" | "createdAt">
): Promise<string> => {
  const userRef = doc(collection(db, "users"));
  await setDoc(userRef, {
    ...userData,
    createdAt: Timestamp.now(),
  });
  return userRef.id;
};

export const getUser = async (userId: string): Promise<User | null> => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  const userData = userSnap.data();
  return {
    id: userSnap.id,
    ...userData,
    createdAt: convertTimestamp(userData.createdAt),
  } as User;
};

export const getUserByEmail = async (
  email: string,
  organizationId: string
): Promise<User | null> => {
  const q = query(
    collection(db, "users"),
    where("email", "==", email),
    where("organizationId", "==", organizationId)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();
  return {
    id: userDoc.id,
    ...userData,
    createdAt: convertTimestamp(userData.createdAt),
  } as User;
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const q = query(
    collection(db, "users"),
    where("email", "==", email),
    firestoreLimit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();
  return {
    id: userDoc.id,
    ...userData,
    createdAt: convertTimestamp(userData.createdAt),
  } as User;
};

export const getUserByGoogleId = async (
  googleId: string,
  organizationId: string
): Promise<User | null> => {
  const q = query(
    collection(db, "users"),
    where("googleId", "==", googleId),
    where("organizationId", "==", organizationId)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const userDoc = snapshot.docs[0];
  return {
    id: userDoc.id,
    ...userDoc.data(),
    createdAt: convertTimestamp(userDoc.data().createdAt),
  } as User;
};

export const getUsersByOrganization = async (
  organizationId: string
): Promise<User[]> => {
  const q = query(
    collection(db, "users"),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as User[];
};

export const updateUser = async (
  userId: string,
  updates: Partial<User>
): Promise<void> => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, updates);
};

/**
 * Atomically increment or decrement a mentor's totalHoursCommitted.
 * Uses Firestore's increment() operation to prevent race conditions.
 * @param userId - The mentor's user ID
 * @param hoursDelta - The number of hours to add (positive) or subtract (negative)
 */
export const incrementMentorHours = async (
  userId: string,
  hoursDelta: number
): Promise<void> => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    totalHoursCommitted: increment(hoursDelta),
  });
};

export const deleteUser = async (userId: string): Promise<void> => {
  const userRef = doc(db, "users", userId);
  await deleteDoc(userRef);
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    // Try with orderBy first, but fallback to no orderBy if index missing
    let q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (error: unknown) {
      // If index missing, try without orderBy
      const errorCode = getErrorCode(error);
      const errorMessage = getErrorMessage(error);
      if (
        errorCode === "failed-precondition" ||
        errorMessage.includes("index")
      ) {
        console.warn(
          "Index missing for users createdAt, fetching without orderBy"
        );
        q = query(collection(db, "users"));
        snapshot = await getDocs(q);
        // Sort in memory
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertTimestamp(doc.data().createdAt),
        })) as User[];
        return docs.sort((a, b) => {
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return bDate - aDate; // Descending
        });
      } else {
        throw error;
      }
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
    })) as User[];
  } catch (error) {
    logger.error("Error in getAllUsers", error);
    throw error;
  }
};

// ==================== MATCH OPERATIONS ====================

export const createMatch = async (
  matchData: Omit<Match, "id">
): Promise<string> => {
  const matchRef = doc(collection(db, "matches"));
  await setDoc(matchRef, matchData);
  return matchRef.id;
};

export const getMatchesByOrganization = async (
  organizationId: string
): Promise<Match[]> => {
  const q = query(
    collection(db, "matches"),
    where("organizationId", "==", organizationId),
    orderBy("startDate", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Match[];
};

export const getMatchesByUser = async (
  userId: string,
  organizationId: string
): Promise<Match[]> => {
  const q = query(
    collection(db, "matches"),
    where("organizationId", "==", organizationId),
    where("mentorId", "==", userId)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Match[];
};

export const updateMatch = async (
  matchId: string,
  updates: Partial<Match>
): Promise<void> => {
  const matchRef = doc(db, "matches", matchId);
  await updateDoc(matchRef, updates);
};

// Get all matches across all organizations (for platform admin)
export const getAllMatches = async (): Promise<Match[]> => {
  try {
    let q = query(collection(db, "matches"), orderBy("startDate", "desc"));
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (error: unknown) {
      // If index missing, try without orderBy
      const errorCode = getErrorCode(error);
      const errorMessage = getErrorMessage(error);
      if (
        errorCode === "failed-precondition" ||
        errorMessage.includes("index")
      ) {
        console.warn(
          "Index missing for matches startDate, fetching without orderBy"
        );
        q = query(collection(db, "matches"));
        snapshot = await getDocs(q);
        // Sort in memory
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Match[];
        return docs.sort((a, b) => {
          const aDate = new Date(a.startDate).getTime();
          const bDate = new Date(b.startDate).getTime();
          return bDate - aDate; // Descending
        });
      } else {
        throw error;
      }
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Match[];
  } catch (error) {
    logger.error("Error in getAllMatches", error);
    throw error;
  }
};

// ==================== GOAL OPERATIONS ====================

export const createGoal = async (
  goalData: Omit<Goal, "id">
): Promise<string> => {
  const goalRef = doc(collection(db, "goals"));
  await setDoc(goalRef, goalData);
  return goalRef.id;
};

export const getGoalsByOrganization = async (
  organizationId: string
): Promise<Goal[]> => {
  const q = query(
    collection(db, "goals"),
    where("organizationId", "==", organizationId),
    orderBy("dueDate", "asc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Goal[];
};

export const getGoalsByUser = async (
  userId: string,
  organizationId: string
): Promise<Goal[]> => {
  const q = query(
    collection(db, "goals"),
    where("organizationId", "==", organizationId),
    where("userId", "==", userId),
    orderBy("dueDate", "asc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Goal[];
};

export const updateGoal = async (
  goalId: string,
  updates: Partial<Goal>
): Promise<void> => {
  const goalRef = doc(db, "goals", goalId);
  await updateDoc(goalRef, updates);
};

export const deleteGoal = async (goalId: string): Promise<void> => {
  const goalRef = doc(db, "goals", goalId);
  await deleteDoc(goalRef);
};

// Get all goals across all organizations (for platform admin)
export const getAllGoals = async (): Promise<Goal[]> => {
  try {
    let q = query(collection(db, "goals"), orderBy("dueDate", "asc"));
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (error: unknown) {
      // If index missing, try without orderBy
      const errorCode = getErrorCode(error);
      const errorMessage = getErrorMessage(error);
      if (
        errorCode === "failed-precondition" ||
        errorMessage.includes("index")
      ) {
        console.warn(
          "Index missing for goals dueDate, fetching without orderBy"
        );
        q = query(collection(db, "goals"));
        snapshot = await getDocs(q);
        // Sort in memory
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Goal[];
        return docs.sort((a, b) => {
          const aDate = new Date(a.dueDate).getTime();
          const bDate = new Date(b.dueDate).getTime();
          return aDate - bDate; // Ascending
        });
      } else {
        throw error;
      }
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Goal[];
  } catch (error) {
    logger.error("Error in getAllGoals", error);
    throw error;
  }
};

// ==================== MILESTONE OPERATIONS ====================

export const createMilestone = async (
  milestoneData: Omit<Milestone, "id">
): Promise<string> => {
  const milestoneRef = doc(collection(db, "milestones"));
  await setDoc(milestoneRef, milestoneData);
  return milestoneRef.id;
};

export const getMilestonesByGoal = async (
  goalId: string
): Promise<Milestone[]> => {
  const q = query(
    collection(db, "milestones"),
    where("goalId", "==", goalId),
    orderBy("dueDate", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Milestone[];
};

export const updateMilestone = async (
  milestoneId: string,
  updates: Partial<Milestone>
): Promise<void> => {
  const milestoneRef = doc(db, "milestones", milestoneId);
  await updateDoc(milestoneRef, updates);
};

export const deleteMilestone = async (milestoneId: string): Promise<void> => {
  const milestoneRef = doc(db, "milestones", milestoneId);
  await deleteDoc(milestoneRef);
};

export const subscribeToMilestones = (
  goalId: string,
  callback: (milestones: Milestone[]) => void
): (() => void) => {
  const q = query(
    collection(db, "milestones"),
    where("goalId", "==", goalId),
    orderBy("dueDate", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const milestones = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Milestone[];
      callback(milestones);
    },
    (error) => {
      logger.error("Error subscribing to milestones", error);
      callback([]);
    }
  );
};

// ==================== RATING OPERATIONS ====================

export const createRating = async (
  ratingData: Omit<Rating, "id">
): Promise<string> => {
  const ratingRef = doc(collection(db, "ratings"));
  await setDoc(ratingRef, ratingData);
  return ratingRef.id;
};

export const getRatingsByOrganization = async (
  organizationId: string
): Promise<Rating[]> => {
  const q = query(
    collection(db, "ratings"),
    where("organizationId", "==", organizationId),
    orderBy("date", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Rating[];
};

export const updateRating = async (
  ratingId: string,
  updates: Partial<Rating>
): Promise<void> => {
  const ratingRef = doc(db, "ratings", ratingId);
  await updateDoc(ratingRef, updates);
};

export const deleteRating = async (ratingId: string): Promise<void> => {
  const ratingRef = doc(db, "ratings", ratingId);
  await deleteDoc(ratingRef);
};

// Get all ratings across all organizations (for platform admin)
export const getAllRatings = async (): Promise<Rating[]> => {
  try {
    let q = query(collection(db, "ratings"), orderBy("date", "desc"));
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (error: unknown) {
      // If index missing, try without orderBy
      const errorCode = getErrorCode(error);
      const errorMessage = getErrorMessage(error);
      if (
        errorCode === "failed-precondition" ||
        errorMessage.includes("index")
      ) {
        console.warn(
          "Index missing for ratings date, fetching without orderBy"
        );
        q = query(collection(db, "ratings"));
        snapshot = await getDocs(q);
        // Sort in memory
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Rating[];
        return docs.sort((a, b) => {
          const aDate = new Date(a.date).getTime();
          const bDate = new Date(b.date).getTime();
          return bDate - aDate; // Descending
        });
      } else {
        throw error;
      }
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Rating[];
  } catch (error) {
    logger.error("Error in getAllRatings", error);
    throw error;
  }
};

// ==================== RESOURCE OPERATIONS ====================

export const createResource = async (
  resourceData: Omit<Resource, "id" | "createdAt">
): Promise<string> => {
  const resourceRef = doc(collection(db, "resources"));
  await setDoc(resourceRef, {
    ...resourceData,
    createdAt: Timestamp.now(),
  });
  return resourceRef.id;
};

export const getResourcesByOrganization = async (
  organizationId: string
): Promise<Resource[]> => {
  const q = query(
    collection(db, "resources"),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as Resource[];
};

export const deleteResource = async (resourceId: string): Promise<void> => {
  const resourceRef = doc(db, "resources", resourceId);
  await deleteDoc(resourceRef);
};

// ==================== BLOG POST OPERATIONS ====================
// Blog posts are platform-wide (no organizationId)

export const createBlogPost = async (
  postData: Omit<BlogPost, "id" | "createdAt">
): Promise<string> => {
  const postRef = doc(collection(db, "blogPosts"));
  await setDoc(postRef, {
    ...postData,
    createdAt: Timestamp.now(),
  });
  return postRef.id;
};

export const getBlogPosts = async (
  publishedOnly: boolean = false
): Promise<BlogPost[]> => {
  let q = query(collection(db, "blogPosts"), orderBy("createdAt", "desc"));

  if (publishedOnly) {
    q = query(
      collection(db, "blogPosts"),
      where("published", "==", true),
      orderBy("createdAt", "desc")
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as BlogPost[];
};

export const updateBlogPost = async (
  postId: string,
  updates: Partial<BlogPost>
): Promise<void> => {
  const postRef = doc(db, "blogPosts", postId);
  await updateDoc(postRef, updates);
};

export const deleteBlogPost = async (postId: string): Promise<void> => {
  const postRef = doc(db, "blogPosts", postId);
  await deleteDoc(postRef);
};

// ==================== DISCUSSION GUIDE OPERATIONS ====================

export const createDiscussionGuide = async (
  guideData: Omit<DiscussionGuide, "id" | "createdAt">
): Promise<string> => {
  const guideRef = doc(collection(db, "discussionGuides"));
  await setDoc(guideRef, {
    ...guideData,
    createdAt: Timestamp.now(),
  });
  return guideRef.id;
};

export const getDiscussionGuides = async (
  organizationId?: string
): Promise<DiscussionGuide[]> => {
  // Get platform guides (isPlatform = true) and optionally org-specific guides
  const platformQuery = query(
    collection(db, "discussionGuides"),
    where("isPlatform", "==", true),
    orderBy("createdAt", "desc")
  );

  const platformSnapshot = await getDocs(platformQuery);
  const platformGuides = platformSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as DiscussionGuide[];

  if (!organizationId) {
    return platformGuides;
  }

  // Also get organization-specific guides
  const orgQuery = query(
    collection(db, "discussionGuides"),
    where("isPlatform", "==", false),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc")
  );

  const orgSnapshot = await getDocs(orgQuery);
  const orgGuides = orgSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as DiscussionGuide[];

  return [...platformGuides, ...orgGuides];
};

export const updateDiscussionGuide = async (
  guideId: string,
  updates: Partial<DiscussionGuide>
): Promise<void> => {
  const guideRef = doc(db, "discussionGuides", guideId);
  await updateDoc(guideRef, updates);
};

export const deleteDiscussionGuide = async (guideId: string): Promise<void> => {
  const guideRef = doc(db, "discussionGuides", guideId);
  await deleteDoc(guideRef);
};

// ==================== CAREER TEMPLATE OPERATIONS ====================

export const createCareerTemplate = async (
  templateData: Omit<CareerTemplate, "id" | "createdAt">
): Promise<string> => {
  const templateRef = doc(collection(db, "careerTemplates"));
  await setDoc(templateRef, {
    ...templateData,
    createdAt: Timestamp.now(),
  });
  return templateRef.id;
};

export const getCareerTemplates = async (
  organizationId?: string
): Promise<CareerTemplate[]> => {
  // Get platform templates (isPlatform = true) and optionally org-specific templates
  const platformQuery = query(
    collection(db, "careerTemplates"),
    where("isPlatform", "==", true),
    orderBy("createdAt", "desc")
  );

  const platformSnapshot = await getDocs(platformQuery);
  const platformTemplates = platformSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as CareerTemplate[];

  if (!organizationId) {
    return platformTemplates;
  }

  // Also get organization-specific templates
  const orgQuery = query(
    collection(db, "careerTemplates"),
    where("isPlatform", "==", false),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc")
  );

  const orgSnapshot = await getDocs(orgQuery);
  const orgTemplates = orgSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as CareerTemplate[];

  return [...platformTemplates, ...orgTemplates];
};

export const updateCareerTemplate = async (
  templateId: string,
  updates: Partial<CareerTemplate>
): Promise<void> => {
  const templateRef = doc(db, "careerTemplates", templateId);
  await updateDoc(templateRef, updates);
};

export const deleteCareerTemplate = async (
  templateId: string
): Promise<void> => {
  const templateRef = doc(db, "careerTemplates", templateId);
  await deleteDoc(templateRef);
};

// ==================== TRAINING VIDEO OPERATIONS ====================

export const createTrainingVideo = async (
  videoData: Omit<TrainingVideo, "id" | "createdAt">
): Promise<string> => {
  const videoRef = doc(collection(db, "trainingVideos"));
  await setDoc(videoRef, {
    ...videoData,
    createdAt: Timestamp.now(),
  });
  return videoRef.id;
};

export const getTrainingVideos = async (
  organizationId?: string
): Promise<TrainingVideo[]> => {
  // Get platform videos (isPlatform = true) and optionally org-specific videos
  const platformQuery = query(
    collection(db, "trainingVideos"),
    where("isPlatform", "==", true),
    orderBy("createdAt", "desc")
  );

  const platformSnapshot = await getDocs(platformQuery);
  const platformVideos = platformSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as TrainingVideo[];

  if (!organizationId) {
    return platformVideos;
  }

  // Also get organization-specific videos
  const orgQuery = query(
    collection(db, "trainingVideos"),
    where("isPlatform", "==", false),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc")
  );

  const orgSnapshot = await getDocs(orgQuery);
  const orgVideos = orgSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as TrainingVideo[];

  return [...platformVideos, ...orgVideos];
};

export const updateTrainingVideo = async (
  videoId: string,
  updates: Partial<TrainingVideo>
): Promise<void> => {
  const videoRef = doc(db, "trainingVideos", videoId);
  await updateDoc(videoRef, updates);
};

export const deleteTrainingVideo = async (videoId: string): Promise<void> => {
  const videoRef = doc(db, "trainingVideos", videoId);
  await deleteDoc(videoRef);
};

// ==================== CALENDAR EVENT OPERATIONS ====================

export const createCalendarEvent = async (
  eventData: Omit<CalendarEvent, "id" | "createdAt">
): Promise<string> => {
  const eventRef = doc(collection(db, "calendarEvents"));
  // Filter out undefined values - Firestore doesn't allow them
  const cleanData = Object.fromEntries(
    Object.entries(eventData).filter(([_, value]) => value !== undefined)
  );
  await setDoc(eventRef, {
    ...cleanData,
    createdAt: Timestamp.now(),
  });
  return eventRef.id;
};

export const getCalendarEventsByOrganization = async (
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<CalendarEvent[]> => {
  let q = query(
    collection(db, "calendarEvents"),
    where("organizationId", "==", organizationId),
    orderBy("date", "asc")
  );

  if (startDate) {
    q = query(q, where("date", ">=", startDate));
  }

  const snapshot = await getDocs(q);

  let events = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as CalendarEvent[];

  if (endDate) {
    events = events.filter((e) => e.date <= endDate);
  }

  return events;
};

export const getCalendarEventsByUser = async (
  userId: string,
  organizationId: string
): Promise<CalendarEvent[]> => {
  const q = query(
    collection(db, "calendarEvents"),
    where("organizationId", "==", organizationId),
    where("mentorId", "==", userId)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as CalendarEvent[];
};

export const getCalendarEvent = async (
  eventId: string
): Promise<CalendarEvent | null> => {
  const eventRef = doc(db, "calendarEvents", eventId);
  const eventSnap = await getDoc(eventRef);

  if (!eventSnap.exists()) {
    return null;
  }

  const eventData = eventSnap.data();
  return {
    id: eventSnap.id,
    ...eventData,
    createdAt: convertTimestamp(eventData.createdAt),
  } as CalendarEvent;
};

export const updateCalendarEvent = async (
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<void> => {
  const eventRef = doc(db, "calendarEvents", eventId);
  await updateDoc(eventRef, updates);
};

export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
  const eventRef = doc(db, "calendarEvents", eventId);
  await deleteDoc(eventRef);
};

// Get all calendar events across all organizations (for platform admin)
export const getAllCalendarEvents = async (
  startDate?: string,
  endDate?: string
): Promise<CalendarEvent[]> => {
  try {
    // Try with orderBy first, but fallback to no orderBy if index missing
    let q = query(collection(db, "calendarEvents"), orderBy("date", "asc"));

    if (startDate) {
      q = query(q, where("date", ">=", startDate));
    }

    let snapshot;
    let hasOrderBy = true; // Track whether we're using orderBy
    try {
      snapshot = await getDocs(q);
    } catch (error: unknown) {
      // If index missing, try without orderBy
      const errorCode = getErrorCode(error);
      const errorMessage = getErrorMessage(error);
      if (
        errorCode === "failed-precondition" ||
        errorMessage.includes("index")
      ) {
        console.warn(
          "Index missing for calendarEvents date, fetching without orderBy"
        );
        hasOrderBy = false; // Mark that we're not using orderBy
        q = query(collection(db, "calendarEvents"));
        if (startDate) {
          q = query(q, where("date", ">=", startDate));
        }
        snapshot = await getDocs(q);
      } else {
        throw error;
      }
    }

    let events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
    })) as CalendarEvent[];

    // Sort in memory only if we had to skip orderBy
    if (snapshot.docs.length > 0 && !hasOrderBy) {
      events = events.sort((a, b) => {
        const aDate = new Date(a.date).getTime();
        const bDate = new Date(b.date).getTime();
        return aDate - bDate; // Ascending
      });
    }

    if (endDate) {
      events = events.filter((e) => e.date <= endDate);
    }

    // Filter to only include past events (completed meetings) with a mentorId
    const now = new Date();
    events = events.filter((e) => {
      const eventDate = new Date(`${e.date}T${e.startTime}`);
      return eventDate < now && e.mentorId; // Only include events with a mentor
    });

    return events;
  } catch (error) {
    logger.error("Error in getAllCalendarEvents", error);
    throw error;
  }
};

// ==================== NOTIFICATION OPERATIONS ====================

export const createNotification = async (
  notificationData: Omit<Notification, "id">
): Promise<string> => {
  const notificationRef = doc(collection(db, "notifications"));
  await setDoc(notificationRef, {
    ...notificationData,
    timestamp: Timestamp.now(),
  });
  return notificationRef.id;
};

export const getNotificationsByUser = async (
  userId: string,
  organizationId: string
): Promise<Notification[]> => {
  const q = query(
    collection(db, "notifications"),
    where("organizationId", "==", organizationId),
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    firestoreLimit(50)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp:
      doc.data().timestamp?.toDate().toISOString() || new Date().toISOString(),
  })) as Notification[];
};

export const updateNotification = async (
  notificationId: string,
  updates: Partial<Notification>
): Promise<void> => {
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, updates);
};

export const deleteNotification = async (
  notificationId: string
): Promise<void> => {
  const notificationRef = doc(db, "notifications", notificationId);
  await deleteDoc(notificationRef);
};

// ==================== INVITATION OPERATIONS ====================

/**
 * Generates a unique invitation token
 */
const generateInvitationToken = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

/**
 * Creates an invitation with auto-generated token and link
 */
export const createInvitation = async (
  invitationData: Omit<Invitation, "id" | "token" | "invitationLink">
): Promise<string> => {
  const token = generateInvitationToken();
  // Always use current browser origin when available - this adapts to whatever port/domain is being used
  // Only fallback to VITE_APP_URL or default when window is not available (server-side)
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : import.meta.env.VITE_APP_URL || "https://meant2grow.com";
  const invitationLink = `${appUrl}/?invite=${token}`;

  const invitationRef = doc(collection(db, "invitations"));
  await setDoc(invitationRef, {
    ...invitationData,
    token,
    invitationLink,
    expiresAt:
      invitationData.expiresAt ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default 30 days
  });
  return invitationRef.id;
};

/**
 * Gets invitation by ID
 */
export const getInvitation = async (
  invitationId: string
): Promise<Invitation | null> => {
  const invitationRef = doc(db, "invitations", invitationId);
  const invitationSnap = await getDoc(invitationRef);

  if (!invitationSnap.exists()) {
    return null;
  }

  const data = invitationSnap.data();
  return {
    id: invitationSnap.id,
    ...data,
    sentDate: convertTimestamp(data.sentDate),
    expiresAt: data.expiresAt ? convertTimestamp(data.expiresAt) : undefined,
  } as Invitation;
};

/**
 * Gets invitation by token
 */
export const getInvitationByToken = async (
  token: string
): Promise<Invitation | null> => {
  const q = query(
    collection(db, "invitations"),
    where("token", "==", token),
    where("status", "==", "Pending")
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const invitationDoc = snapshot.docs[0];
  const data = invitationDoc.data();

  // Check expiration
  if (data.expiresAt) {
    const expiresAt =
      typeof data.expiresAt === "string"
        ? new Date(data.expiresAt)
        : data.expiresAt.toDate();
    if (expiresAt < new Date()) {
      // Mark as expired
      await updateInvitation(invitationDoc.id, { status: "Expired" });
      return null;
    }
  }

  return {
    id: invitationDoc.id,
    ...data,
    sentDate: convertTimestamp(data.sentDate),
    expiresAt: data.expiresAt ? convertTimestamp(data.expiresAt) : undefined,
  } as Invitation;
};

/**
 * Gets invitation by email and organization
 */
export const getInvitationByEmail = async (
  email: string,
  organizationId: string
): Promise<Invitation | null> => {
  const q = query(
    collection(db, "invitations"),
    where("email", "==", email.toLowerCase()),
    where("organizationId", "==", organizationId),
    where("status", "==", "Pending")
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const invitationDoc = snapshot.docs[0];
  const data = invitationDoc.data();

  // Check expiration
  if (data.expiresAt) {
    const expiresAt =
      typeof data.expiresAt === "string"
        ? new Date(data.expiresAt)
        : data.expiresAt.toDate();
    if (expiresAt < new Date()) {
      await updateInvitation(invitationDoc.id, { status: "Expired" });
      return null;
    }
  }

  return {
    id: invitationDoc.id,
    ...data,
    sentDate: convertTimestamp(data.sentDate),
    expiresAt: data.expiresAt ? convertTimestamp(data.expiresAt) : undefined,
  } as Invitation;
};

export const getInvitationsByOrganization = async (
  organizationId: string
): Promise<Invitation[]> => {
  const q = query(
    collection(db, "invitations"),
    where("organizationId", "==", organizationId),
    orderBy("sentDate", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    sentDate: convertTimestamp(doc.data().sentDate),
    expiresAt: doc.data().expiresAt
      ? convertTimestamp(doc.data().expiresAt)
      : undefined,
  })) as Invitation[];
};

export const updateInvitation = async (
  invitationId: string,
  updates: Partial<Invitation>
): Promise<void> => {
  const invitationRef = doc(db, "invitations", invitationId);
  await updateDoc(invitationRef, updates);
};

// ==================== REAL-TIME LISTENERS ====================

export const subscribeToUser = (
  userId: string,
  callback: (user: User | null) => void
): Unsubscribe => {
  const userRef = doc(db, "users", userId);
  return onSnapshot(
    userRef,
    (snap: DocumentSnapshot) => {
      if (snap.exists()) {
        callback({
          id: snap.id,
          ...snap.data(),
          createdAt: convertTimestamp(snap.data().createdAt),
        } as User);
      } else {
        callback(null);
      }
    },
    (error) => {
      logger.error("Error subscribing to user", error);
      logger.debug("UserId", { userId });
      callback(null);
    }
  );
};

export const subscribeToOrganization = (
  organizationId: string,
  callback: (org: Organization | null) => void
): Unsubscribe => {
  const orgRef = doc(db, "organizations", organizationId);
  return onSnapshot(
    orgRef,
    (snap: DocumentSnapshot) => {
      if (snap.exists()) {
        callback({
          id: snap.id,
          ...snap.data(),
          createdAt: convertTimestamp(snap.data().createdAt),
        } as Organization);
      } else {
        callback(null);
      }
    },
    (error) => {
      logger.error("Error subscribing to organization", error);
      logger.debug("OrganizationId", { organizationId });
      callback(null);
    }
  );
};

export const subscribeToUsersByOrganization = (
  organizationId: string,
  callback: (users: User[]) => void,
  pageSize: number = 50
): Unsubscribe => {
  const q = query(
    collection(db, "users"),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc"),
    firestoreLimit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
      })) as User[];
      callback(users);
    },
    (error) => {
      logger.error("Error subscribing to users", error);
      logger.debug("OrganizationId", { organizationId });
      // Call callback with empty array on error to prevent UI from hanging
      callback([]);
    }
  );
};

export const subscribeToMatchesByOrganization = (
  organizationId: string,
  callback: (matches: Match[]) => void,
  pageSize: number = 50
): Unsubscribe => {
  const q = query(
    collection(db, "matches"),
    where("organizationId", "==", organizationId),
    orderBy("startDate", "desc"),
    firestoreLimit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const matches = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Match[];
      callback(matches);
    },
    (error) => {
      logger.error("Error subscribing to matches", error);
      logger.debug("OrganizationId", { organizationId });
      callback([]);
    }
  );
};

export const subscribeToGoalsByOrganization = (
  organizationId: string,
  callback: (goals: Goal[]) => void,
  pageSize: number = 50
): Unsubscribe => {
  const q = query(
    collection(db, "goals"),
    where("organizationId", "==", organizationId),
    orderBy("dueDate", "asc"),
    firestoreLimit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const goals = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Goal[];
      callback(goals);
    },
    (error) => {
      logger.error("Error subscribing to goals", error);
      logger.debug("OrganizationId", { organizationId });
      callback([]);
    }
  );
};

export const subscribeToRatingsByOrganization = (
  organizationId: string,
  callback: (ratings: Rating[]) => void,
  pageSize: number = 50
): Unsubscribe => {
  const q = query(
    collection(db, "ratings"),
    where("organizationId", "==", organizationId),
    orderBy("date", "desc"),
    firestoreLimit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const ratings = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Rating[];
      callback(ratings);
    },
    (error) => {
      logger.error("Error subscribing to ratings", error);
      logger.debug("OrganizationId", { organizationId });
      callback([]);
    }
  );
};

export const subscribeToResourcesByOrganization = (
  organizationId: string,
  callback: (resources: Resource[]) => void,
  pageSize: number = 50
): Unsubscribe => {
  const q = query(
    collection(db, "resources"),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc"),
    firestoreLimit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const resources = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
      })) as Resource[];
      callback(resources);
    },
    (error) => {
      logger.error("Error subscribing to resources", error);
      logger.debug("OrganizationId", { organizationId });
      callback([]);
    }
  );
};

export const subscribeToCalendarEventsByOrganization = (
  organizationId: string,
  callback: (events: CalendarEvent[]) => void,
  pageSize: number = 100
): Unsubscribe => {
  const q = query(
    collection(db, "calendarEvents"),
    where("organizationId", "==", organizationId),
    orderBy("date", "asc"),
    firestoreLimit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const events = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
      })) as CalendarEvent[];
      callback(events);
    },
    (error) => {
      logger.error("Error subscribing to calendar events", error);
      logger.debug("OrganizationId", { organizationId });
      callback([]);
    }
  );
};

export const subscribeToNotificationsByUser = (
  userId: string,
  organizationId: string,
  callback: (notifications: Notification[]) => void,
  pageSize: number = 50
): Unsubscribe => {
  const q = query(
    collection(db, "notifications"),
    where("organizationId", "==", organizationId),
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    firestoreLimit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp:
          doc.data().timestamp?.toDate().toISOString() ||
          new Date().toISOString(),
      })) as Notification[];
      callback(notifications);
    },
    (error) => {
      logger.error("Error subscribing to notifications", error);
      logger.debug("UserId, OrganizationId", { userId, organizationId });
      callback([]);
    }
  );
};

export const subscribeToInvitationsByOrganization = (
  organizationId: string,
  callback: (invitations: Invitation[]) => void,
  pageSize: number = 50
): Unsubscribe => {
  const q = query(
    collection(db, "invitations"),
    where("organizationId", "==", organizationId),
    orderBy("sentDate", "desc"),
    firestoreLimit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const invitations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Invitation[];
      callback(invitations);
    },
    (error) => {
      logger.error("Error subscribing to invitations", error);
      logger.debug("OrganizationId", { organizationId });
      callback([]);
    }
  );
};

export const subscribeToBlogPosts = (
  callback: (posts: BlogPost[]) => void,
  publishedOnly: boolean = false
): Unsubscribe => {
  let q = query(collection(db, "blogPosts"), orderBy("createdAt", "desc"));

  if (publishedOnly) {
    q = query(q, where("published", "==", true));
  }

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const posts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
      })) as BlogPost[];
      callback(posts);
    },
    (error) => {
      logger.error("Error subscribing to blog posts", error);
      callback([]);
    }
  );
};

// Add error handling to all remaining subscription functions
export const subscribeToDiscussionGuides = (
  organizationId: string | undefined,
  callback: (guides: DiscussionGuide[]) => void
): Unsubscribe => {
  // Use two separate queries: one for platform-wide guides and one for org-specific guides
  // This ensures Firestore security rules can properly evaluate permissions
  const platformQuery = query(
    collection(db, "discussionGuides"),
    where("isPlatform", "==", true),
    orderBy("createdAt", "desc")
  );

  let orgQuery: ReturnType<typeof query> | null = null;
  if (organizationId) {
    orgQuery = query(
      collection(db, "discussionGuides"),
      where("organizationId", "==", organizationId),
      orderBy("createdAt", "desc")
    );
  }

  const platformGuides: DiscussionGuide[] = [];
  const orgGuides: DiscussionGuide[] = [];

  const updateCallback = () => {
    const allGuides = [...platformGuides, ...orgGuides].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    callback(allGuides);
  };

  const unsubscribePlatform = onSnapshot(
    platformQuery,
    (snapshot: QuerySnapshot) => {
      platformGuides.length = 0;
      platformGuides.push(
        ...snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertTimestamp(doc.data().createdAt),
        })) as DiscussionGuide[]
      );
      updateCallback();
    },
    (error) => {
      logger.error("Error subscribing to platform discussion guides", error);
      updateCallback();
    }
  );

  let unsubscribeOrg: Unsubscribe | null = null;
  if (orgQuery) {
    unsubscribeOrg = onSnapshot(
      orgQuery,
      (snapshot: QuerySnapshot) => {
        orgGuides.length = 0;
        orgGuides.push(
          ...snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: convertTimestamp(doc.data().createdAt),
          })) as DiscussionGuide[]
        );
        updateCallback();
      },
      (error) => {
        logger.error("Error subscribing to org discussion guides", error);
        logger.debug("OrganizationId", { organizationId });
        updateCallback();
      }
    );
  }

  return () => {
    unsubscribePlatform();
    if (unsubscribeOrg) {
      unsubscribeOrg();
    }
  };
};

export const subscribeToCareerTemplates = (
  organizationId: string | undefined,
  callback: (templates: CareerTemplate[]) => void
): Unsubscribe => {
  // Use two separate queries: one for platform-wide templates and one for org-specific templates
  const platformQuery = query(
    collection(db, "careerTemplates"),
    where("isPlatform", "==", true),
    orderBy("createdAt", "desc")
  );

  let orgQuery: ReturnType<typeof query> | null = null;
  if (organizationId) {
    orgQuery = query(
      collection(db, "careerTemplates"),
      where("organizationId", "==", organizationId),
      orderBy("createdAt", "desc")
    );
  }

  const platformTemplates: CareerTemplate[] = [];
  const orgTemplates: CareerTemplate[] = [];

  const updateCallback = () => {
    const allTemplates = [...platformTemplates, ...orgTemplates].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    callback(allTemplates);
  };

  const unsubscribePlatform = onSnapshot(
    platformQuery,
    (snapshot: QuerySnapshot) => {
      platformTemplates.length = 0;
      platformTemplates.push(
        ...snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertTimestamp(doc.data().createdAt),
        })) as CareerTemplate[]
      );
      updateCallback();
    },
    (error) => {
      logger.error("Error subscribing to platform career templates", error);
      updateCallback();
    }
  );

  let unsubscribeOrg: Unsubscribe | null = null;
  if (orgQuery) {
    unsubscribeOrg = onSnapshot(
      orgQuery,
      (snapshot: QuerySnapshot) => {
        orgTemplates.length = 0;
        orgTemplates.push(
          ...snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: convertTimestamp(doc.data().createdAt),
          })) as CareerTemplate[]
        );
        updateCallback();
      },
      (error) => {
        logger.error("Error subscribing to org career templates", error);
        logger.debug("OrganizationId", { organizationId });
        updateCallback();
      }
    );
  }

  return () => {
    unsubscribePlatform();
    if (unsubscribeOrg) {
      unsubscribeOrg();
    }
  };
};

export const subscribeToTrainingVideos = (
  organizationId: string | undefined,
  callback: (videos: TrainingVideo[]) => void
): Unsubscribe => {
  // Use two separate queries: one for platform-wide videos and one for org-specific videos
  const platformQuery = query(
    collection(db, "trainingVideos"),
    where("isPlatform", "==", true),
    orderBy("createdAt", "desc")
  );

  let orgQuery: ReturnType<typeof query> | null = null;
  if (organizationId) {
    orgQuery = query(
      collection(db, "trainingVideos"),
      where("organizationId", "==", organizationId),
      orderBy("createdAt", "desc")
    );
  }

  const platformVideos: TrainingVideo[] = [];
  const orgVideos: TrainingVideo[] = [];

  const updateCallback = () => {
    const allVideos = [...platformVideos, ...orgVideos].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    callback(allVideos);
  };

  const unsubscribePlatform = onSnapshot(
    platformQuery,
    (snapshot: QuerySnapshot) => {
      platformVideos.length = 0;
      platformVideos.push(
        ...snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertTimestamp(doc.data().createdAt),
        })) as TrainingVideo[]
      );
      updateCallback();
    },
    (error) => {
      logger.error("Error subscribing to platform training videos", error);
      updateCallback();
    }
  );

  let unsubscribeOrg: Unsubscribe | null = null;
  if (orgQuery) {
    unsubscribeOrg = onSnapshot(
      orgQuery,
      (snapshot: QuerySnapshot) => {
        orgVideos.length = 0;
        orgVideos.push(
          ...snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: convertTimestamp(doc.data().createdAt),
          })) as TrainingVideo[]
        );
        updateCallback();
      },
      (error) => {
        logger.error("Error subscribing to org training videos", error);
        logger.debug("OrganizationId", { organizationId });
        updateCallback();
      }
    );
  }

  return () => {
    unsubscribePlatform();
    if (unsubscribeOrg) {
      unsubscribeOrg();
    }
  };
};

// ==================== PAGINATION HELPERS ====================

export interface PaginationOptions {
  pageSize?: number;
  lastDoc?: QueryDocumentSnapshot;
}

export interface PaginatedResult<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export const getUsersByOrganizationPaginated = async (
  organizationId: string,
  options: PaginationOptions = {}
): Promise<PaginatedResult<User>> => {
  const pageSize = options.pageSize || 20;
  let q = query(
    collection(db, "users"),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc"),
    firestoreLimit(pageSize + 1) // Fetch one extra to check if there's more
  );

  if (options.lastDoc) {
    q = query(q, startAfter(options.lastDoc));
  }

  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const data = (hasMore ? docs.slice(0, pageSize) : docs).map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as User[];

  return {
    data,
    lastDoc: hasMore ? docs[pageSize - 1] : null,
    hasMore,
  };
};

export const getMatchesByOrganizationPaginated = async (
  organizationId: string,
  options: PaginationOptions = {}
): Promise<PaginatedResult<Match>> => {
  const pageSize = options.pageSize || 20;
  let q = query(
    collection(db, "matches"),
    where("organizationId", "==", organizationId),
    orderBy("startDate", "desc"),
    firestoreLimit(pageSize + 1)
  );

  if (options.lastDoc) {
    q = query(q, startAfter(options.lastDoc));
  }

  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const data = (hasMore ? docs.slice(0, pageSize) : docs).map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Match[];

  return {
    data,
    lastDoc: hasMore ? docs[pageSize - 1] : null,
    hasMore,
  };
};

// ==================== CHAT MESSAGE OPERATIONS ====================

export const createChatMessage = async (
  messageData: Omit<ChatMessage, "id" | "createdAt">
): Promise<string> => {
  const messageRef = doc(collection(db, "chatMessages"));

  // Remove undefined values as Firestore doesn't support them
  const cleanData: Record<string, any> = {
    ...messageData,
    createdAt: Timestamp.now(),
    timestamp: Timestamp.now(),
  };

  // Remove undefined fields
  Object.keys(cleanData).forEach((key) => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });

  await setDoc(messageRef, cleanData);
  return messageRef.id;
};

export const getChatMessages = async (
  chatId: string,
  organizationId: string,
  limit: number = 50
): Promise<ChatMessage[]> => {
  const q = query(
    collection(db, "chatMessages"),
    where("organizationId", "==", organizationId),
    where("chatId", "==", chatId),
    orderBy("timestamp", "desc"),
    firestoreLimit(limit)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp:
      doc.data().timestamp?.toDate().toISOString() || new Date().toISOString(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as ChatMessage[];
};

export const updateChatMessage = async (
  messageId: string,
  updates: Partial<ChatMessage>
): Promise<void> => {
  const messageRef = doc(db, "chatMessages", messageId);
  await updateDoc(messageRef, updates);
};

export const deleteChatMessage = async (messageId: string): Promise<void> => {
  const messageRef = doc(db, "chatMessages", messageId);
  await deleteDoc(messageRef);
};

export const subscribeToChatMessages = (
  chatId: string,
  organizationId: string,
  callback: (messages: ChatMessage[]) => void,
  pageSize: number = 50
): Unsubscribe => {
  const q = query(
    collection(db, "chatMessages"),
    where("organizationId", "==", organizationId),
    where("chatId", "==", chatId),
    orderBy("timestamp", "desc"),
    firestoreLimit(pageSize)
  );

  let isUnsubscribed = false;
  let unsubscribe: Unsubscribe | null = null;

  try {
    unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        if (isUnsubscribed) return;

        const messages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp:
            doc.data().timestamp?.toDate().toISOString() ||
            new Date().toISOString(),
          createdAt: convertTimestamp(doc.data().createdAt),
        })) as ChatMessage[];
        // Reverse to show oldest first
        callback(messages.reverse());
      },
      (error) => {
        if (isUnsubscribed) return;
        logger.error("Error subscribing to chat messages", error);
        logger.debug("Chat subscription error details", { chatId, organizationId });
        // Call callback with empty array on error to prevent UI from hanging
        callback([]);
      }
    );
  } catch (error) {
    logger.error("Error creating chat messages subscription", error);
    throw error;
  }

  // Return cleanup function
  return () => {
    isUnsubscribed = true;
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch (error) {
        logger.error("Error unsubscribing from chat messages", error);
      }
      unsubscribe = null;
    }
  };
};

/**
 * Subscribe to DM messages in both directions
 * For DMs, messages can have chatId = partnerId (sent TO partner) or chatId = currentUserId (sent TO current user)
 * This function queries both directions and merges the results
 */
export const subscribeToDMMessages = (
  partnerId: string, // The chat partner's ID (activeChatId)
  currentUserId: string, // The current user's ID
  organizationId: string,
  callback: (messages: ChatMessage[]) => void,
  pageSize: number = 50
): Unsubscribe => {
  // Query 1: Messages sent TO the partner (chatId = partnerId)
  const q1 = query(
    collection(db, "chatMessages"),
    where("organizationId", "==", organizationId),
    where("chatId", "==", partnerId),
    where("chatType", "==", "dm"),
    orderBy("timestamp", "desc"),
    firestoreLimit(pageSize)
  );

  // Query 2: Messages sent TO the current user BY the partner (chatId = currentUserId, senderId = partnerId)
  const q2 = query(
    collection(db, "chatMessages"),
    where("organizationId", "==", organizationId),
    where("chatId", "==", currentUserId),
    where("chatType", "==", "dm"),
    where("senderId", "==", partnerId),
    orderBy("timestamp", "desc"),
    firestoreLimit(pageSize)
  );

  let unsubscribe1: Unsubscribe | null = null;
  let unsubscribe2: Unsubscribe | null = null;
  let isUnsubscribed = false;
  let secondListenerTimeoutId: ReturnType<typeof setTimeout> | null = null;
  const messagesMap = new Map<string, ChatMessage>();

  const mergeAndCallback = () => {
    // Don't call callback if already unsubscribed
    if (isUnsubscribed) return;

    const mergedMessages = Array.from(messagesMap.values());
    // Sort by timestamp descending, then reverse to show oldest first
    mergedMessages.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime; // Descending
    });
    callback(mergedMessages.reverse());
  };

  // Validate inputs before creating listeners
  if (!partnerId || !currentUserId || !organizationId) {
    logger.error("Invalid parameters for subscribeToDMMessages", {
      partnerId,
      currentUserId,
      organizationId,
    });
    callback([]);
    return () => {}; // Return no-op unsubscribe
  }

  try {
    // Create first listener
    unsubscribe1 = onSnapshot(q1, {
      next: (snapshot: QuerySnapshot) => {
        if (isUnsubscribed) return;

        // Use docChanges() to handle added, modified, and removed documents
        snapshot.docChanges().forEach((change) => {
          if (change.type === "removed") {
            // Remove deleted messages from the map
            messagesMap.delete(change.doc.id);
          } else if (change.type === "added" || change.type === "modified") {
            // Add or update messages in the map
            const message = {
              id: change.doc.id,
              ...change.doc.data(),
              timestamp:
                change.doc.data().timestamp?.toDate().toISOString() ||
                new Date().toISOString(),
              createdAt: convertTimestamp(change.doc.data().createdAt),
            } as ChatMessage;
            messagesMap.set(change.doc.id, message);
          }
        });
        mergeAndCallback();
      },
      error: (error) => {
        if (isUnsubscribed) return;
        logger.error("Error subscribing to DM messages (query 1)", error);
        logger.debug("DM subscription error details", {
          partnerId,
          currentUserId,
          organizationId
        });
        // Call callback with empty array on error to prevent UI from hanging
        callback([]);
      },
    });

    // Small delay to ensure first listener is fully initialized before creating second
    // This prevents Firestore internal state corruption
    secondListenerTimeoutId = setTimeout(() => {
      if (isUnsubscribed) return;

      try {
        unsubscribe2 = onSnapshot(q2, {
          next: (snapshot: QuerySnapshot) => {
            if (isUnsubscribed) return;

            // Use docChanges() to handle added, modified, and removed documents
            snapshot.docChanges().forEach((change) => {
              if (change.type === "removed") {
                // Remove deleted messages from the map
                messagesMap.delete(change.doc.id);
              } else if (
                change.type === "added" ||
                change.type === "modified"
              ) {
                // Add or update messages in the map
                const message = {
                  id: change.doc.id,
                  ...change.doc.data(),
                  timestamp:
                    change.doc.data().timestamp?.toDate().toISOString() ||
                    new Date().toISOString(),
                  createdAt: convertTimestamp(change.doc.data().createdAt),
                } as ChatMessage;
                messagesMap.set(change.doc.id, message);
              }
            });
            mergeAndCallback();
          },
          error: (error) => {
            if (isUnsubscribed) return;
            logger.error("Error subscribing to DM messages (query 2)", error);
            logger.debug("DM subscription error details (query 2)", {
              partnerId,
              currentUserId,
              organizationId
            });
            // Call callback with empty array on error to prevent UI from hanging
            callback([]);
          },
        });
      } catch (error) {
        logger.error("Error creating second DM listener", error);
        // Clean up first listener if second fails
        if (unsubscribe1) {
          try {
            unsubscribe1();
          } catch (cleanupError) {
            logger.error("Error cleaning up first listener", cleanupError);
          }
        }
        callback([]);
      }
    }, 50); // 50ms delay to ensure sequential initialization
  } catch (error) {
    // If listener creation fails, clean up what was created
    logger.error("Error creating first DM listener", error);
    if (unsubscribe1) {
      try {
        unsubscribe1();
      } catch (cleanupError) {
        logger.error("Error cleaning up first listener", cleanupError);
      }
    }
    if (unsubscribe2) {
      try {
        unsubscribe2();
      } catch (cleanupError) {
        logger.error("Error cleaning up second listener", cleanupError);
      }
    }
    callback([]);
  }

  // Return cleanup function that unsubscribes from both queries
  return () => {
    isUnsubscribed = true;

    // Clear the timeout if second listener hasn't been created yet
    if (secondListenerTimeoutId) {
      clearTimeout(secondListenerTimeoutId);
      secondListenerTimeoutId = null;
    }

    try {
      if (unsubscribe1) {
        unsubscribe1();
        unsubscribe1 = null;
      }
      if (unsubscribe2) {
        unsubscribe2();
        unsubscribe2 = null;
      }
    } catch (error) {
      logger.error("Error unsubscribing from DM messages", error);
    }
  };
};

// ==================== CHAT GROUP OPERATIONS ====================

export const createChatGroup = async (
  groupData: Omit<ChatGroup, "id" | "createdAt">,
  customId?: string
): Promise<string> => {
  const groupRef = customId
    ? doc(db, "chatGroups", customId)
    : doc(collection(db, "chatGroups"));

  await setDoc(groupRef, {
    ...groupData,
    createdAt: Timestamp.now(),
  });
  return groupRef.id;
};

export const getChatGroupsByOrganization = async (
  organizationId: string
): Promise<ChatGroup[]> => {
  const q = query(
    collection(db, "chatGroups"),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as ChatGroup[];
};

export const subscribeToChatGroups = (
  organizationId: string,
  callback: (groups: ChatGroup[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, "chatGroups"),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const groups = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
      })) as ChatGroup[];
      console.log("[subscribeToChatGroups] Received groups", {
        count: groups.length,
        groupIds: groups.map((g) => g.id),
        groupDetails: groups.map((g) => ({
          id: g.id,
          name: g.name,
          members: g.members?.length || 0,
          organizationId: g.organizationId,
        })),
        organizationId,
      });
      callback(groups);
    },
    (error) => {
      logger.error("Error subscribing to chat groups", error);
      logger.debug("Chat groups subscription error details", {
        organizationId,
        code: (error as any)?.code,
        message: (error as any)?.message
      });
      // Call callback with empty array on error to prevent UI from hanging
      callback([]);
    }
  );
};

export const updateChatGroup = async (
  groupId: string,
  updates: Partial<ChatGroup>
): Promise<void> => {
  const groupRef = doc(db, "chatGroups", groupId);
  await updateDoc(groupRef, updates);
};

// ==================== PRIVATE MESSAGE REQUEST OPERATIONS ====================

export const createPrivateMessageRequest = async (
  requestData: Omit<PrivateMessageRequest, "id" | "createdAt">
): Promise<string> => {
  const requestRef = doc(collection(db, "privateMessageRequests"));
  await setDoc(requestRef, {
    ...requestData,
    createdAt: Timestamp.now(),
  });
  return requestRef.id;
};

export const getPrivateMessageRequestsByUser = async (
  userId: string,
  organizationId: string
): Promise<PrivateMessageRequest[]> => {
  const q = query(
    collection(db, "privateMessageRequests"),
    where("organizationId", "==", organizationId),
    where("recipientId", "==", userId),
    where("status", "==", "pending")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    respondedAt: doc.data().respondedAt
      ? convertTimestamp(doc.data().respondedAt)
      : undefined,
  })) as PrivateMessageRequest[];
};

export const getPrivateMessageRequest = async (
  requesterId: string,
  recipientId: string,
  organizationId: string
): Promise<PrivateMessageRequest | null> => {
  const q = query(
    collection(db, "privateMessageRequests"),
    where("organizationId", "==", organizationId),
    where("requesterId", "==", requesterId),
    where("recipientId", "==", recipientId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    respondedAt: doc.data().respondedAt
      ? convertTimestamp(doc.data().respondedAt)
      : undefined,
  } as PrivateMessageRequest;
};

export const updatePrivateMessageRequest = async (
  requestId: string,
  updates: Partial<PrivateMessageRequest>
): Promise<void> => {
  const requestRef = doc(db, "privateMessageRequests", requestId);
  const updateData: any = { ...updates };
  if (updates.respondedAt) {
    updateData.respondedAt = Timestamp.now();
  }
  await updateDoc(requestRef, updateData);
};

export const subscribeToPrivateMessageRequests = (
  userId: string,
  organizationId: string,
  callback: (requests: PrivateMessageRequest[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, "privateMessageRequests"),
    where("organizationId", "==", organizationId),
    where("recipientId", "==", userId),
    where("status", "==", "pending")
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        respondedAt: doc.data().respondedAt
          ? convertTimestamp(doc.data().respondedAt)
          : undefined,
      })) as PrivateMessageRequest[];
      callback(requests);
    },
    (error) => {
      logger.error("Error subscribing to private message requests", error);
      callback([]);
    }
  );
};

export const getApprovedPrivateMessagePartners = async (
  userId: string,
  organizationId: string
): Promise<string[]> => {
  // Get all approved requests where user is either requester or recipient
  const q1 = query(
    collection(db, "privateMessageRequests"),
    where("organizationId", "==", organizationId),
    where("requesterId", "==", userId),
    where("status", "==", "approved")
  );
  const q2 = query(
    collection(db, "privateMessageRequests"),
    where("organizationId", "==", organizationId),
    where("recipientId", "==", userId),
    where("status", "==", "approved")
  );

  const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const partnerIds = new Set<string>();
  snapshot1.docs.forEach((doc) => {
    const data = doc.data();
    partnerIds.add(data.recipientId);
  });
  snapshot2.docs.forEach((doc) => {
    const data = doc.data();
    partnerIds.add(data.requesterId);
  });

  return Array.from(partnerIds);
};

// ==================== HELPER FUNCTIONS ====================

const generateOrganizationCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
