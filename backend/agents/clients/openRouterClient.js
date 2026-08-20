/**
 * OPENROUTER AI CLIENT
 * Free-tier models via OpenRouter (:free suffix, no card).
 *   google/gemma-4-26b-a4b-it:free          — 256K ctx, strong reasoning/JSON
 *   google/gemma-4-31b-it:free — 262K ctx, dense, strong writer
 *   google/gemma-4-26b-a4b-it:free — MoE, fast, near-31B quality
 *   deepseek/deepseek-r1       — legacy analytical (if still available)
 */
async function openRouterGenerate(systemPrompt, userPrompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not set");
  }

  const model = options.model || "google/gemma-4-26b-a4b-it:free";
  const temperature = options.temperature !== undefined ? options.temperature : 0.6;
  const maxTokens = options.maxTokens || 4096;
  const json = options.json === true;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://accountiq.app",
        "X-Title": "AccountIQ Content Intelligence"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens,
        // NOTE: no response_format — free OpenRouter models (Gemma 4 31B)
        // return 429/401 on it. Callers parse JSON from the text via safeParseJSON.
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const isRateLimit = response.status === 429;
      throw new Error(isRateLimit ? "OpenRouter rate limited (429)" : `OpenRouter API returned ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0]) {
      throw new Error("No choices returned from OpenRouter API");
    }

    const text = data.choices[0].message.content || "";
    if (!text.trim()) throw new Error("OpenRouter returned empty output");
    console.log(`  [OpenRouter] ✅ ${model} | ~${text.split(" ").length} tokens out${json ? " (json)" : ""}`);
    return text;
  } catch (error) {
    if (error.message.includes("rate limited")) throw error;
    throw new Error(`OpenRouter API error: ${error.message}`);
  }
}

module.exports = { openRouterGenerate };
