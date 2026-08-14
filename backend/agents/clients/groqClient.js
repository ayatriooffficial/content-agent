const Groq = require("groq-sdk");

// Initialize Groq client with API key from environment
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * GROQ AI CLIENT
 * Standardized wrapper for Groq API calls.
 * Used by all agents in the "Groq-Only" architecture.
 * 
 * Features:
 * - Exponential backoff on 429 Rate Limit errors
 * - Request token/model logging for debugging
 * - Sensible default: 2048 tokens (override per agent)
 */
async function groqGenerate(systemPrompt, userPrompt, options = {}) {
  const model = options.model || "llama-3.3-70b-versatile";
  const temperature = options.temperature !== undefined ? options.temperature : 0.7;
  const maxTokens = options.maxTokens || 2048;
  const maxRetries = 3;

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
        console.warn(`  [Groq] ⚠️  Rate limited. Retrying in ${backoffMs / 1000}s (attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      console.error(`  [Groq] ❌ ${model} failed (attempt ${attempt}): ${error.message}`);
      throw new Error(`Groq generation failed: ${error.message}`);
    }
  }
}

module.exports = { groqGenerate };
