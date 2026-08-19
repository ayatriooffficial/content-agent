/**
 * UNIFIED JSON GENERATION HELPER
 * Tries Gemini (native JSON mode — most reliable at strict JSON) first,
 * then falls back to Groq (gpt-oss-120b with response_format) if Gemini
 * fails, is rate-limited, or has no API key.
 *
 * This keeps the pipeline resilient: Gemini is the primary for the 5
 * JSON-critical agents (orchestrator, calendar, opportunity scoring,
 * research extraction, competitor), Groq stays as fallback.
 */
const { geminiGenerate } = require("./geminiClient");
const { groqGenerate } = require("./groqClient");

/**
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {object} options - { model (gemini), groqModel, temperature, maxTokens, json }
 * @returns {Promise<string>} raw model output (JSON string)
 */
async function generateJSON(systemPrompt, userPrompt, options = {}) {
  const temperature = options.temperature !== undefined ? options.temperature : 0.5;
  const maxTokens = options.maxTokens || 2048;

  // 1) Gemini primary — native JSON mode, no json_validate_failed issue
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      return await geminiGenerate(systemPrompt, userPrompt, {
        model: options.model || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        temperature,
        maxTokens,
        json: options.json !== false,
      });
    } catch (err) {
      const msg = String(err?.message || err);
      const isRateOrQuota =
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("rate limit") ||
        msg.includes("quota");
      if (isRateOrQuota) {
        console.warn(`  [Gemini] ⚠️ rate-limited/quota (${msg.split("\n")[0]}) — falling back to Groq...`);
      } else {
        console.warn(`  [Gemini] ⚠️ failed (${msg.split("\n")[0]}) — falling back to Groq...`);
      }
    }
  }

  // 2) Groq fallback — gpt-oss-120b with response_format (best-effort)
  return groqGenerate(systemPrompt, userPrompt, {
    model: options.groqModel || "openai/gpt-oss-120b",
    temperature,
    maxTokens,
    json: options.json !== false,
  });
}

module.exports = { generateJSON };
