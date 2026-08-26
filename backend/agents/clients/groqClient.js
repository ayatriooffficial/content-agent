const Groq = require("groq-sdk");

// Initialize Groq client with API key from environment
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Model routing — free-tier aware.
 *
 * Free-tier limits (per your Groq dashboard table):
 *   openai/gpt-oss-20b   → 1,000 req/day · 30 req/min · 8,000 tok/min
 *   openai/gpt-oss-120b  → 1,000 req/day · 30 req/min · 8,000 tok/min
 *   qwen/qwen3.6-27b     → 1,000 req/day · 30 req/min · 8,000 tok/min
 *
 * Every model has its OWN quota, so rotating on 429 spreads the load.
 * Use qwen only where strict JSON output matters (it is the strongest free
 * model at structured output); gpt-oss-120b is used for mid-size JSON;
 * gpt-oss-20b stays the default for long-form prose.
 */
const MODEL_ROTATION = [
  process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
];

// Recommended free-tier model per task class (callers can still override)
const MODELS = {
  json: "openai/gpt-oss-120b",      // strict JSON-heavy agents (orchestrator, calendar, scoring) — accepts response_format
  json_medium: "openai/gpt-oss-120b", // mid-size JSON (persona, whatsapp, validation)
  prose: "openai/gpt-oss-20b",   // long-form prose (research phase 1, market research)
};

/**
 * GROQ AI CLIENT
 * Standardized wrapper for Groq API calls with model rotation on rate limits
 * and optional JSON-mode (response_format) for strict JSON tasks.
 */
async function groqGenerate(systemPrompt, userPrompt, options = {}) {
  const preferred = options.model || MODELS.prose;
  // Start from preferred, then rotate through the rest on 429
  const ordered = [preferred, ...MODEL_ROTATION.filter((m) => m !== preferred)];
  const temperature = options.temperature !== undefined ? options.temperature : 0.7;
  const maxTokens = options.maxTokens || 2048;
  const maxRetries = 3;
  // JSON mode is BEST-EFFORT: some free models (qwen 3.6 27B) reject the
  // response_format flag with json_validate_failed. If it's rejected we retry
  // the same call WITHOUT the flag — our safeParseJSON handles prose/fences.
  const wantsJson = options.json === true || options.responseFormat === "json_object";

  let lastError = null;

  for (const model of ordered) {
    // Once a model rejects JSON mode, skip the flag for its remaining attempts
    let jsonRejected = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const attempts = wantsJson && !jsonRejected ? [true, false] : [false];

      for (const useJson of attempts) {
        try {
          const completion = await groq.chat.completions.create({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature,
            max_tokens: maxTokens,
            ...(useJson ? { response_format: { type: "json_object" } } : {}),
          });

          const result = completion.choices[0].message.content || "";
          console.log(`  [Groq] ✅ ${model} | ~${result.split(" ").length} tokens out${useJson ? " (json)" : ""}`);
          return result;
        } catch (error) {
          // 413 = "Request too large" (tokens-per-minute ceiling on free tier).
          // Treat it like a rate limit so we retry/rotate models instead of
          // aborting the whole generation.
          const isRateLimit = error.status === 429 || error.status === 413 || (error.message || "").includes("rate limit");
          const isJsonRejection = useJson && (
            error.status === 400 ||
            (error.message || "").includes("json_validate_failed") ||
            (error.message || "").includes("invalid_request_error") ||
            (error.message || "").includes("response_format")
          );

          // JSON mode not supported by this model → retry same call WITHOUT it
          if (isJsonRejection) {
            jsonRejected = true;
            console.warn(`  [Groq] ⚠️  ${model} rejected JSON mode (${String(error.message).split("\n")[0]}) — retrying without response_format...`);
            continue; // next in `attempts` (false)
          }

          const isLastAttempt = attempt === maxRetries;
          if (isRateLimit && !isLastAttempt) {
            const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.warn(`  [Groq] ⚠️  ${model} rate limited. Retrying in ${backoffMs / 1000}s (attempt ${attempt}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            break; // break attempts loop, continue to next attempt
          }

          if (isRateLimit) {
            // Exhausted retries on this model — rotate to the next model (own quota)
            console.warn(`  [Groq] ↻ ${model} rate limit exhausted — switching model...`);
            lastError = error;
            break; // break attempts loop → next model
          }

          // Non-rate-limit error (404, etc.) — don't rotate, it's model-specific
          console.error(`  [Groq] ❌ ${model} failed (attempt ${attempt}): ${error.message}`);
          throw new Error(`Groq generation failed: ${error.message}`);
        }
      }
    }
  }

  // All models exhausted
  console.error(`  [Groq] ❌ All models rate-limited. Last: ${lastError?.message || "unknown"}`);
  throw new Error(`Groq generation failed: ${lastError?.message || "All models rate-limited"}`);
}

module.exports = { groqGenerate, MODELS };
