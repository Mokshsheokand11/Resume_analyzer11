
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, JobDetails } from "../types";

// Always initialize with the current API Key from environment
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    throw new Error("Please set your Gemini API key in .env.local (currently using placeholder)");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeResume = async (
  resumeDataBase64: string,
  mimeType: string,
  jobDetails: JobDetails
): Promise<AnalysisResult> => {
  const ai = getAIClient();
  const modelName = "gemini-3-flash-preview";

  // Robust system prompt to ensure valid JSON and high-quality analysis
  const prompt = `
    Analyze the attached resume (${mimeType === 'application/pdf' ? 'PDF' : 'Image'}) 
    specifically for the "${jobDetails.title}" role at "${jobDetails.company || 'the target company'}".

    Context Job Description:
    ${jobDetails.description}

    Required Output JSON format:
    {
      "overallScore": number (0-100),
      "summary": string,
      "strengths": string[],
      "weaknesses": string[],
      "improvements": [{"category": string, "description": string, "impact": "High" | "Medium" | "Low"}],
      "spellingErrors": [{"original": string, "suggestion": string, "context": string}],
      "jobAlignment": {
        "matchPercentage": number,
        "missingKeywords": string[],
        "suggestedKeywords": string[],
        "roleFitSummary": string
      }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: resumeDataBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                },
                required: ["category", "description", "impact"],
              },
            },
            spellingErrors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                  context: { type: Type.STRING },
                },
                required: ["original", "suggestion", "context"],
              },
            },
            jobAlignment: {
              type: Type.OBJECT,
              properties: {
                matchPercentage: { type: Type.NUMBER },
                missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                roleFitSummary: { type: Type.STRING },
              },
              required: ["matchPercentage", "missingKeywords", "suggestedKeywords", "roleFitSummary"],
            },
          },
          required: ["overallScore", "summary", "strengths", "weaknesses", "improvements", "spellingErrors", "jobAlignment"]
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI.");

    return JSON.parse(text) as AnalysisResult;
  } catch (error: any) {
    console.error("Gemini API Error:", error);

    // Generic error handling without artificial mentions of AI limits
    if (error.message?.includes("400") || error.message?.includes("INVALID_ARGUMENT") || error.message?.toLowerCase().includes("too large")) {
      throw new Error(
        "The document could not be processed. Ensure the file is a valid PDF or clear image under 10MB."
      );
    }

    throw new Error(error.message || "Failed to analyze document.");
  }
};
