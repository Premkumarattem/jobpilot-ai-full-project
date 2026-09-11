// Uses Google's Gemini API, which has a genuinely free tier (rate-limited,
// no credit card required) via an API key from https://aistudio.google.com/apikey
// Swap GEMINI_MODEL if Google renames/deprecates the default — check
// https://ai.google.dev/gemini-api/docs/models for current options.
const { GoogleGenAI } = require("@google/genai");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

let client = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// generateText(prompt, systemInstruction?) -> string, or null if no key configured.
// Every route that calls this must handle the null case with a template fallback,
// so the app is always fully functional even with zero API keys.
async function generateText(prompt, systemInstruction) {
  const ai = getClient();
  if (!ai) return null;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    ...(systemInstruction ? { config: { systemInstruction } } : {}),
  });
  return (response.text || "").trim();
}

module.exports = { getClient, generateText, MODEL };
