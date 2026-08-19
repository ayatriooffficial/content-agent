/**
 * GEMINI AI CLIENT
 * Wrapper for Google Gemini API calls.
 * Used by: Persona Agent, Research Agent (broad), Opportunity Agent
 */
const { GoogleGenAI } = require("@google/genai");

let _client = null;

function getGeminiClient() {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY not set. Gemini calls will fail.");
    }
    _client = new GoogleGenAI({ apiKey: apiKey || "PLACEHOLDER" });
  }
  return _client;
}

/**
 * Generate text using Gemini.
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - User prompt
 * @param {object} options - { model, temperature, maxTokens }
 * @returns {string} Generated text
 */
async function geminiGenerate(systemPrompt, userPrompt, options = {}) {
  const client = getGeminiClient();
  const model = options.model || "gemini-2.5-flash";
  const temperature = options.temperature || 0.7;
  const maxTokens = options.maxTokens || 4096;

  try {
    const response = await client.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        maxOutputTokens: maxTokens,
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    throw new Error(`Gemini generation failed: ${error.message}`);
  }
}

module.exports = { geminiGenerate, getGeminiClient };
