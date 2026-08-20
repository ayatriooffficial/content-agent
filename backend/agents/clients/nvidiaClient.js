/**
 * NVIDIA NIM CLIENT
 * Free-tier endpoints on build.nvidia.com / integrate.api.nvidia.com.
 * Models:
 *   minimaxai/minimax-m3        — 1M ctx, 427B MoE, structured output ✓
 *   nvidia/nemotron-3-super-120b-a12b — 1M ctx, 124B MoE, thinking mode
 * Uses built-in fetch (no axios dependency).
 */
const ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

async function nvidiaGenerate(systemPrompt, userPrompt, options = {}) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY not set");

  const model = options.model || "minimaxai/minimax-m3";
  const temperature = options.temperature !== undefined ? options.temperature : 0.6;
  const maxTokens = options.maxTokens || 2048;
  const json = options.json === true;
  const timeoutMs = options.timeout || 15000; // per-model timeout override

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new Error(`NVIDIA request failed: ${err.name === "TimeoutError" ? "timeout (20s)" : err.message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("NVIDIA rate limited (429)");
    throw new Error(`NVIDIA API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => ({}));
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text.trim()) throw new Error("NVIDIA returned empty output");
  console.log(`  [NVIDIA] ✅ ${model} | ~${text.split(" ").length} tokens out${json ? " (json)" : ""}`);
  return text;
}

module.exports = { nvidiaGenerate };
