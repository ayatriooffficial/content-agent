const Groq = require("groq-sdk");

// Initialize Groq client with API key from environment
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Model rotation — each model has its OWN free-tier quota. The default is
 * gpt-oss-20b; on rate limit we rotate through the others so no single
 * model's per-minute quota is exhausted.
 */
const MODEL_ROTATION = [
  process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
];

/**
 * GROQ AI CLIENT
 * Standardized wrapper for Groq API calls with model rotation on rate limits.
 */
async function groqGenerate(systemPrompt, userPrompt, options = {}) {
  const preferred = options.model || MODEL_ROTATION[0];
  // Start from preferred, then rotate through the rest on 429
  const ordered = [preferred, ...MODEL_ROTATION.filter((m) => m !== preferred)];
  const temperature = options.temperature !== undefined ? options.temperature : 0.7;
  const maxTokens = options.maxTokens || 2048;
  const maxRetries = 3;

  let lastError = null;

  for (const model of ordered) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        });

        const result = completion.choices[0].message.content || "";
        console.log(`  [Groq] ✅ ${model} | ~${result.split(" ").length} tokens out`);
        return result;
      } catch (error) {
        const isRateLimit = error.status === 429 || (error.message || "").includes("rate limit");
        const isLastAttempt = attempt === maxRetries;

        if (isRateLimit && !isLastAttempt) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.warn(`  [Groq] ⚠️  ${model} rate limited. Retrying in ${backoffMs / 1000}s (attempt ${attempt}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

        if (isRateLimit) {
          // Exhausted retries on this model — rotate to the next model (own quota)
          console.warn(`  [Groq] ↻ ${model} rate limit exhausted — switching model...`);
          lastError = error;
          break; // break inner loop → next model
        }

        // Non-rate-limit error (404, 413, etc.) — don't rotate, it's model-specific
        console.error(`  [Groq] ❌ ${model} failed (attempt ${attempt}): ${error.message}`);
        throw new Error(`Groq generation failed: ${error.message}`);
      }
    }
  }

  // All models exhausted
  console.error(`  [Groq] ❌ All models rate-limited. Last: ${lastError?.message || "unknown"}`);
  throw new Error(`Groq generation failed: ${lastError?.message || "All models rate-limited"}`);
}

module.exports = { groqGenerate };
