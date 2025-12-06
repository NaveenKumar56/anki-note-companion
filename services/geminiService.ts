import { GoogleGenAI } from "@google/genai";
import { CardAnalysis } from "../types";

const getAiClient = () => {
  // Process.env.API_KEY is replaced by Vite at build time
  if (!process.env.API_KEY) {
    throw new Error("Gemini API Key is missing. Check your .env file.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const refineNoteWithGemini = async (
  currentNote: string,
  cardContext: { question: string; answer: string }
): Promise<string> => {
  try {
    const ai = getAiClient();
    
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

export const analyzeCardContent = async (
  cardContext: { question: string; answer: string }
): Promise<CardAnalysis> => {
  try {
    const ai = getAiClient();
    const cleanQ = cardContext.question.replace(/<[^>]*>?/gm, ' ').trim();
    const cleanA = cardContext.answer.replace(/<[^>]*>?/gm, ' ').trim();

    const prompt = `
      Analyze the following vocabulary/sentence (likely Japanese, but handle general language learning too).
      
      Question: ${cleanQ}
      Answer: ${cleanA}

      Provide a JSON response with the following keys:
      1. "mnemonic": A creative and memorable mnemonic device to help remember the meaning/reading.
      2. "kanjiDetails": An array of objects for each Kanji character found in the text. Each object should have:
         - "character": The kanji char
         - "meaning": English meaning
         - "readings": On/Kun readings
         - "jlpt": JLPT Level (N5-N1) or "N/A"
      3. "frequency": An object with:
         - "score": A number from 1 to 5 (1=Rare, 5=Very Common)
         - "label": A short text description of usage (e.g. "Top 100 words", "Academic use only")

      Return ONLY raw JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    if (!response.text) throw new Error("No response from AI");
    
    // Parse JSON
    return JSON.parse(response.text) as CardAnalysis;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};