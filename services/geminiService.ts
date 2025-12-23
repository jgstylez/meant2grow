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