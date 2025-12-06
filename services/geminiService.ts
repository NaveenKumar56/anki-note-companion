import { GoogleGenAI } from "@google/genai";

export const refineNoteWithGemini = async (
  currentNote: string,
  cardContext: { question: string; answer: string }
): Promise<string> => {
  try {
    // Process.env.API_KEY is replaced by Vite at build time
    if (!process.env.API_KEY) {
      throw new Error("Gemini API Key is missing. Check your .env file.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const cleanQ = cardContext.question.replace(/<[^>]*>?/gm, ' ').trim();
    const cleanA = cardContext.answer.replace(/<[^>]*>?/gm, ' ').trim();

    const prompt = `
      You are a helpful study assistant.
      
      Context Card:
      Q: ${cleanQ.substring(0, 500)}...
      A: ${cleanA.substring(0, 500)}...
      
      User's Draft Note: "${currentNote}"

      Instructions:
      1. Fix grammar and typos.
      2. If the note is empty, generate a very brief (1 sentence) mnemonic or key insight based on the card.
      3. Keep it concise.
      4. Output ONLY the refined note text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || currentNote;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};