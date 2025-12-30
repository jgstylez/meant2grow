import { getFunctions, httpsCallable } from "firebase/functions";
import { User, Resource } from "../types";

// Get Firebase Functions instance (us-central1 region matches Cloud Functions)
const functions = getFunctions(undefined, "us-central1");

/**
 * Get AI-powered mentor match suggestions via Cloud Function
 * API key is now secure on the server-side
 */
export const getMatchSuggestions = async (
  mentee: User,
  potentialMentors: User[]
): Promise<{ mentorId: string; reason: string; score: number }[]> => {
  try {
    const getMatches = httpsCallable(functions, "getMatchSuggestions");
    const result = await getMatches({ mentee, potentialMentors });
    return (result.data as { mentorId: string; reason: string; score: number }[]) || [];
  } catch (error) {
    console.error("Error fetching match suggestions:", error);
    return [];
  }
};

/**
 * Get AI-powered resource recommendations via Cloud Function
 */
export const getRecommendedResources = async (user: User): Promise<Resource[]> => {
  try {
    const getResources = httpsCallable(functions, "getRecommendedResources");
    const result = await getResources({ user });
    return (result.data as Resource[]) || [];
  } catch (error) {
    console.error("Error fetching resources:", error);
    return [];
  }
};

/**
 * Break down a goal into actionable steps via Cloud Function
 */
export const breakdownGoal = async (
  goalDescription: string
): Promise<{ steps: string[] }> => {
  try {
    const breakdown = httpsCallable(functions, "breakdownGoal");
    const result = await breakdown({ goalDescription });
    return (result.data as { steps: string[] }) || { steps: [] };
  } catch (error) {
    console.error("Error breaking down goal", error);
    return { steps: ["Define clear objectives", "Set milestones", "Review progress"] };
  }
};

export interface SuggestedMilestone {
  title: string;
  description?: string;
  suggestedDueDate: string; // ISO date string
}

/**
 * Suggest milestones for a goal via Cloud Function
 */
export const suggestMilestones = async (
  goalTitle: string,
  goalDescription: string,
  goalDueDate: string
): Promise<SuggestedMilestone[]> => {
  try {
    const suggest = httpsCallable(functions, "suggestMilestones");
    const result = await suggest({ goalTitle, goalDescription, goalDueDate });
    return (result.data as SuggestedMilestone[]) || [];
  } catch (error) {
    console.error("Error suggesting milestones", error);
    // Return fallback milestones
    const goalDate = new Date(goalDueDate);
    const quarter1 = new Date(
      goalDate.getTime() - (goalDate.getTime() - Date.now()) * 0.75
    );
    const quarter2 = new Date(
      goalDate.getTime() - (goalDate.getTime() - Date.now()) * 0.5
    );
    const quarter3 = new Date(
      goalDate.getTime() - (goalDate.getTime() - Date.now()) * 0.25
    );

    return [
      {
        title: "Research and planning",
        description: "Research best practices and create a plan",
        suggestedDueDate: quarter1.toISOString().split("T")[0],
      },
      {
        title: "Initial implementation",
        description: "Begin working on the core components",
        suggestedDueDate: quarter2.toISOString().split("T")[0],
      },
      {
        title: "Progress review and adjustments",
        description: "Review progress and make necessary adjustments",
        suggestedDueDate: quarter3.toISOString().split("T")[0],
      },
      {
        title: "Final completion",
        description: "Complete remaining tasks and finalize",
        suggestedDueDate: goalDueDate,
      },
    ];
  }
};
