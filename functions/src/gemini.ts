import * as functions from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenAI, Type } from "@google/genai";
import { User, Resource } from "./types";

// Define the Gemini API key as a secret
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Type for milestone suggestions (simplified version for API response)
interface SuggestedMilestone {
  title: string;
  description?: string;
  suggestedDueDate: string;
}

/**
 * Get AI-powered mentor match suggestions
 */
export const getMatchSuggestions = functions.onCall(
  {
    secrets: [geminiApiKey],
    region: "us-central1",
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new functions.HttpsError(
        "unauthenticated",
        "Must be authenticated to use AI features"
      );
    }

    const { mentee, potentialMentors } = request.data;

    // Input validation
    if (!mentee || !potentialMentors || !Array.isArray(potentialMentors)) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Missing required data: mentee and potentialMentors array"
      );
    }

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      throw new functions.HttpsError(
        "failed-precondition",
        "Gemini API key not configured"
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
    I need to find the best professional mentor for a mentee named ${mentee.name}.
    
    Mentee Profile:
    - Title: ${mentee.title}
    - Company: ${mentee.company}
    - Goals: ${mentee.goals?.join(", ") || "Not specified"}
    - Bio: ${mentee.bio || "Not provided"}
    
    Potential Mentors:
    ${JSON.stringify(
      potentialMentors.map((m: User) => ({
        id: m.id,
        name: m.name,
        title: m.title,
        company: m.company,
        skills: m.skills || [],
        bio: m.bio || "",
      }))
    )}
    
    Analyze the compatibility based on the mentee's career goals and the mentors' professional experience/skills.
    Return a ranked list of the top 3 most suitable mentors.
  `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                mentorId: { type: Type.STRING },
                score: {
                  type: Type.NUMBER,
                  description: "Compatibility score from 0 to 100",
                },
                reason: {
                  type: Type.STRING,
                  description:
                    "A concise explanation of why this match is good for their career growth.",
                },
              },
              required: ["mentorId", "score", "reason"],
            },
          },
        },
      });

      const jsonText = response.text;
      if (!jsonText) {
        return [];
      }
      return JSON.parse(jsonText);
    } catch (error: any) {
      console.error("Error fetching match suggestions:", error);
      throw new functions.HttpsError(
        "internal",
        "Failed to get match suggestions",
        error.message
      );
    }
  }
);

/**
 * Get AI-powered resource recommendations
 */
export const getRecommendedResources = functions.onCall(
  {
    secrets: [geminiApiKey],
    region: "us-central1",
  },
  async (request): Promise<Omit<Resource, "id" | "organizationId" | "uploadedBy" | "createdAt" | "fileUrl">[]> => {
    // Verify authentication
    if (!request.auth) {
      throw new functions.HttpsError(
        "unauthenticated",
        "Must be authenticated to use AI features"
      );
    }

    const { user } = request.data;

    // Input validation
    if (!user) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Missing required data: user"
      );
    }

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      throw new functions.HttpsError(
        "failed-precondition",
        "Gemini API key not configured"
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
    Suggest 3 professional development resources (articles, books, or videos) for a ${user.role?.toLowerCase() || "professional"} who wants to grow in: ${user.goals?.join(", ") || user.skills?.join(", ") || "professional development"}.
    The user is a ${user.title || "professional"}.
  `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: {
                  type: Type.STRING,
                  enum: ["Article", "Book", "Video", "Course"],
                },
                description: { type: Type.STRING },
                url: {
                  type: Type.STRING,
                  description: "A valid placeholder URL or real URL if known",
                },
              },
            },
          },
        },
      });

      const jsonText = response.text;
      if (!jsonText) {
        return [];
      }
      return JSON.parse(jsonText);
    } catch (error: any) {
      console.error("Error fetching resources:", error);
      throw new functions.HttpsError(
        "internal",
        "Failed to get resource recommendations",
        error.message
      );
    }
  }
);

/**
 * Break down a goal into actionable steps
 */
export const breakdownGoal = functions.onCall(
  {
    secrets: [geminiApiKey],
    region: "us-central1",
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new functions.HttpsError(
        "unauthenticated",
        "Must be authenticated to use AI features"
      );
    }

    const { goalDescription } = request.data;

    // Input validation
    if (!goalDescription || typeof goalDescription !== "string") {
      throw new functions.HttpsError(
        "invalid-argument",
        "Missing required data: goalDescription"
      );
    }

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      // Return fallback steps if API key not configured
      return {
        steps: [
          "Define clear objectives",
          "Set milestones",
          "Review progress",
        ],
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Break down this professional career goal into 3-5 actionable steps: "${goalDescription}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
      });

      const jsonText = response.text;
      if (!jsonText) {
        return { steps: [] };
      }
      return JSON.parse(jsonText);
    } catch (error: any) {
      console.error("Error breaking down goal", error);
      // Return fallback steps on error
      return {
        steps: [
          "Define clear objectives",
          "Set milestones",
          "Review progress",
        ],
      };
    }
  }
);

/**
 * Suggest milestones for a goal
 */
export const suggestMilestones = functions.onCall(
  {
    secrets: [geminiApiKey],
    region: "us-central1",
  },
  async (request): Promise<SuggestedMilestone[]> => {
    // Verify authentication
    if (!request.auth) {
      throw new functions.HttpsError(
        "unauthenticated",
        "Must be authenticated to use AI features"
      );
    }

    const { goalTitle, goalDescription, goalDueDate } = request.data;

    // Input validation
    if (!goalTitle || !goalDueDate) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Missing required data: goalTitle and goalDueDate"
      );
    }

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      // Return fallback milestones if API key not configured
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

    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Break down this professional career goal into 4-6 actionable milestones with suggested due dates. The goal is: "${goalTitle}". ${goalDescription ? `Description: ${goalDescription}` : ""}. The final goal due date is ${goalDueDate}. Suggest milestones that are evenly spaced between now and the due date.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              milestones: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: "Short, actionable milestone title",
                    },
                    description: {
                      type: Type.STRING,
                      description:
                        "Brief description of what needs to be accomplished",
                    },
                    suggestedDueDate: {
                      type: Type.STRING,
                      description:
                        "Suggested due date in YYYY-MM-DD format, evenly spaced before the goal due date",
                    },
                  },
                  required: ["title", "suggestedDueDate"],
                },
              },
            },
            required: ["milestones"],
          },
        },
      });

      const jsonText = response.text;
      if (!jsonText) {
        return [];
      }
      const parsed = JSON.parse(jsonText);
      return parsed.milestones || [];
    } catch (error: any) {
      console.error("Error suggesting milestones", error);
      // Return fallback milestones on error
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
  }
);

