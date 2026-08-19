/**
 * GEMINI AI CLIENT
 * Wrapper for Google Gemini API calls with native JSON mode support.
 * Used by the JSON-critical agents (orchestrator, calendar, opportunity
 * scoring, research extraction, competitor) where Groq's free models are
 * unreliable at strict JSON.
 *
 * Free tier (flash-lite): ~15 RPM · 250K TPM · 500 RPD — a full pipeline
 * run needs only ~11-13 JSON calls, so this stays well within budget.
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
 * @param {object} options - { model, temperature, maxTokens, json }
 * @returns {string} Generated text
 */
async function geminiGenerate(systemPrompt, userPrompt, options = {}) {
  const client = getGeminiClient();
  const model = options.model || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const temperature = options.temperature !== undefined ? options.temperature : 0.7;
  const maxTokens = options.maxTokens || 4096;
  const jsonMode = options.json === true || options.responseMimeType === "application/json";

  try {
    const response = await client.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        maxOutputTokens: maxTokens,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      }
    });

    const text = response.text || "";
    console.log(`  [Gemini] ✅ ${model} | ~${text.split(" ").length} tokens out${jsonMode ? " (json)" : ""}`);
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    throw new Error(`Gemini generation failed: ${error.message}`);
  }
}

module.exports = { geminiGenerate, getGeminiClient };
