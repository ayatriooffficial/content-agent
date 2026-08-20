/**
 * PROVIDER ROUTER
 * Tries providers in order (best → last resort), each with its own free-tier
 * quota, so no single provider's rate limit ever kills a generation.
 *
 * Order:
 *   1. Gemini (AI Studio)      — best native JSON, 15 RPM / 500 RPD
 *   2. NVIDIA NIM              — MiniMax M3 / Nemotron 120B, 1M ctx, structured output
 *   3. OpenRouter              — GLM 5.2 / Gemma 4 31B / Gemma 4 26B (:free)
 *   4. Groq                    — gpt-oss-120b / gpt-oss-20b (existing)
 *
 * RULE: NO silent fallback. If ALL providers fail, this throws — the caller
 * marks the slot "GENERATION FAILED" visibly instead of injecting hardcoded
 * content. Every generated piece is 100% AI, never a canned string.
 *
 * TRACKING: every attempt logs provider name, model, status (skip/try/ok/fail),
 * elapsed ms, and token count, so failures are easy to trace.
 */

const { geminiGenerate } = require("./geminiClient");
const { nvidiaGenerate } = require("./nvidiaClient");
const { openRouterGenerate } = require("./openRouterClient");
const { groqGenerate } = require("./groqClient");

/**
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {object} options - { temperature, maxTokens, json, order, model }
 *   order: array of provider names in priority order, e.g.
 *          ["NVIDIA","OpenRouter","Groq"] — default Gemini-first (Phase 1).
 *          Phase 3 content generation MUST NOT include "Gemini".
 * @returns {Promise<string>} raw model output
 */
async function generateBest(systemPrompt, userPrompt, options = {}) {
  const temperature = options.temperature !== undefined ? options.temperature : 0.6;
  const maxTokens = options.maxTokens || 2048;
  const json = options.json === true;
  const startedAt = Date.now();
  const callerHint = options.caller || "unknown";
  const order = Array.isArray(options.order) && options.order.length
    ? options.order
    : ["Gemini", "NVIDIA", "OpenRouter", "Groq"];

  const attempts = [
    {
      name: "Gemini",
      model: () => options.geminiModel || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      enabled: !!process.env.GEMINI_API_KEY,
      run: () => geminiGenerate(systemPrompt, userPrompt, {
        model: options.geminiModel || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        temperature, maxTokens, json,
      }),
    },
    {
      name: "NVIDIA",
      model: () => options.nvidiaModel || "minimaxai/minimax-m3",
      enabled: !!process.env.NVIDIA_API_KEY,
      run: () => nvidiaGenerate(systemPrompt, userPrompt, {
        model: options.nvidiaModel || "minimaxai/minimax-m3",
        temperature, maxTokens, json,
      }),
    },
    {
      name: "NVIDIA-GptOss",
      model: () => options.nvidiaGptOssModel || "openai/gpt-oss-120b",
      enabled: !!process.env.NVIDIA_API_KEY,
      run: () => nvidiaGenerate(systemPrompt, userPrompt, {
        model: options.nvidiaGptOssModel || "openai/gpt-oss-120b",
        temperature, maxTokens, json,
      }),
    },
    {
      name: "OpenRouter",
      model: () => options.openRouterModel || "google/gemma-4-26b-a4b-it:free",
      enabled: !!process.env.OPENROUTER_API_KEY,
      run: () => openRouterGenerate(systemPrompt, userPrompt, {
        model: options.openRouterModel || "google/gemma-4-26b-a4b-it:free",
        temperature, maxTokens, json,
      }),
    },
    {
      name: "OpenRouter-Nemotron",
      model: () => options.openRouterNemotronModel || "nvidia/nemotron-3-ultra-550b-a55b:free",
      enabled: !!process.env.OPENROUTER_API_KEY,
      run: () => openRouterGenerate(systemPrompt, userPrompt, {
        model: options.openRouterNemotronModel || "nvidia/nemotron-3-ultra-550b-a55b:free",
        temperature, maxTokens, json,
      }),
    },
    {
      name: "Groq",
      model: () => options.groqModel || "openai/gpt-oss-120b",
      enabled: !!process.env.GROQ_API_KEY,
      run: () => groqGenerate(systemPrompt, userPrompt, {
        model: options.groqModel || "openai/gpt-oss-120b",
        temperature, maxTokens, json,
      }),
    },
  ];

  console.log(`\n  [Router] 🔀 ${callerHint} — starting provider chain (order: ${order.join(" → ")}, json=${json}, maxTokens=${maxTokens}, temp=${temperature})`);

  const byName = Object.fromEntries(attempts.map(a => [a.name, a]));

  let lastErr = null;
  for (const name of order) {
    const attempt = byName[name];
    if (!attempt) {
      console.warn(`  [Router] ❓ ${name} — unknown provider (not in registry), skipping`);
      continue;
    }
    if (!attempt.enabled) {
      console.log(`  [Router] ⏭️  ${attempt.name} — SKIPPED (no API key in env)`);
      continue;
    }

    const t0 = Date.now();
    console.log(`  [Router] 🚀 ${attempt.name} (${attempt.model()}) — trying...`);
    try {
      const text = await attempt.run();
      const elapsed = Date.now() - t0;
      if (text && text.trim()) {
        console.log(`  [Router] ✅ ${attempt.name} (${attempt.model()}) | ~${text.split(" ").length} tokens out | ${elapsed}ms`);
        console.log(`  [Router] ✔ DONE — ${callerHint} answered by ${attempt.name} in ${Date.now() - startedAt}ms total`);
        return text;
      }
      lastErr = new Error(`${attempt.name} returned empty output`);
      console.warn(`  [Router] ⚠️ ${attempt.name} — EMPTY output after ${elapsed}ms — trying next...`);
    } catch (err) {
      lastErr = err;
      const elapsed = Date.now() - t0;
      console.warn(`  [Router] ⚠️ ${attempt.name} — FAILED after ${elapsed}ms: ${String(err.message).split("\n")[0]} — trying next...`);
    }
  }

  // NO fallback — surface the failure so the slot is marked GENERATION FAILED
  const totalMs = Date.now() - startedAt;
  console.error(`  [Router] ❌ ALL providers failed for ${callerHint} after ${totalMs}ms. Last: ${lastErr?.message || "unknown"}`);
  throw new Error(`All AI providers failed (${callerHint}): ${lastErr?.message || "no providers configured"}`);
}

module.exports = { generateBest };
