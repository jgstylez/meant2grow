import { GoogleGenAI, Type } from "@google/genai";
import { User, Resource } from "../types";

// Support both API_KEY and GEMINI_API_KEY for compatibility
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getMatchSuggestions = async (mentee: User, potentialMentors: User[]): Promise<{ mentorId: string; reason: string; score: number }[]> => {
  if (!apiKey) return [];

  const prompt = `
    I need to find the best professional mentor for a mentee named ${mentee.name}.
    
    Mentee Profile:
    - Title: ${mentee.title}
    - Company: ${mentee.company}
    - Goals: ${mentee.goals?.join(", ")}
    - Bio: ${mentee.bio}
    
    Potential Mentors:
    ${JSON.stringify(potentialMentors.map(m => ({ id: m.id, name: m.name, title: m.title, company: m.company, skills: m.skills, bio: m.bio })))}
    
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
              score: { type: Type.NUMBER, description: "Compatibility score from 0 to 100" },
              reason: { type: Type.STRING, description: "A concise explanation of why this match is good for their career growth." }
            },
            required: ["mentorId", "score", "reason"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error fetching match suggestions:", error);
    return [];
  }
};

export const getRecommendedResources = async (user: User): Promise<Resource[]> => {
  if (!apiKey) return [];

  const prompt = `
    Suggest 3 professional development resources (articles, books, or videos) for a ${user.role.toLowerCase()} who wants to grow in: ${user.goals?.join(", ") || user.skills.join(", ")}.
    The user is a ${user.title}.
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
              type: { type: Type.STRING, enum: ["Article", "Book", "Video", "Course"] },
              description: { type: Type.STRING },
              url: { type: Type.STRING, description: "A valid placeholder URL or real URL if known" }
            }
          }
        }
      }
    });

     const jsonText = response.text;
    if (!jsonText) return [];
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error fetching resources:", error);
    return [];
  }
};

export const breakdownGoal = async (goalDescription: string): Promise<{ steps: string[] }> => {
  if (!apiKey) return { steps: ["Define clear objectives", "Set milestones", "Review progress"] };
  
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
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    const jsonText = response.text;
    if (!jsonText) return { steps: [] };
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error breaking down goal", error);
    return { steps: [] };
  }
}

export interface SuggestedMilestone {
  title: string;
  description?: string;
  suggestedDueDate: string; // ISO date string
}

export const suggestMilestones = async (
  goalTitle: string,
  goalDescription: string,
  goalDueDate: string
): Promise<SuggestedMilestone[]> => {
  if (!apiKey) {
    // Fallback suggestions
    const goalDate = new Date(goalDueDate);
    const quarter1 = new Date(goalDate.getTime() - (goalDate.getTime() - Date.now()) * 0.75);
    const quarter2 = new Date(goalDate.getTime() - (goalDate.getTime() - Date.now()) * 0.5);
    const quarter3 = new Date(goalDate.getTime() - (goalDate.getTime() - Date.now()) * 0.25);
    
    return [
      { title: "Research and planning", description: "Research best practices and create a plan", suggestedDueDate: quarter1.toISOString().split("T")[0] },
      { title: "Initial implementation", description: "Begin working on the core components", suggestedDueDate: quarter2.toISOString().split("T")[0] },
      { title: "Progress review and adjustments", description: "Review progress and make necessary adjustments", suggestedDueDate: quarter3.toISOString().split("T")[0] },
      { title: "Final completion", description: "Complete remaining tasks and finalize", suggestedDueDate: goalDueDate }
    ];
  }

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
                  title: { type: Type.STRING, description: "Short, actionable milestone title" },
                  description: { type: Type.STRING, description: "Brief description of what needs to be accomplished" },
                  suggestedDueDate: { type: Type.STRING, description: "Suggested due date in YYYY-MM-DD format, evenly spaced before the goal due date" }
                },
                required: ["title", "suggestedDueDate"]
              }
            }
          },
          required: ["milestones"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    const parsed = JSON.parse(jsonText);
    return parsed.milestones || [];
  } catch (error) {
    console.error("Error suggesting milestones", error);
    return [];
  }
}