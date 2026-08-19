/**
 * DEEPSEEK AI CLIENT
 * Wrapper for DeepSeek API calls.
 * Used by all agents in the "DeepSeek-Only" architecture.
 */
const OpenAI = require("openai");

let _client = null;

function getDeepSeekClient() {
  if (!_client) {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY environment variable is not set.");
    }

    _client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
    });
  }

  return _client;
}

/**
 * Generate text using DeepSeek R1.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {object} options - { model, maxTokens }
 * @returns {string}
 */
async function deepseekGenerate(systemPrompt, userPrompt, options = {}) {
  const client = getDeepSeekClient();

  const model = options.model || "deepseek-reasoner";
  const maxTokens = options.maxTokens ?? 4096;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
    });

    return completion.choices[0].message.content?.trim() || "";
  } catch (error) {
    console.error("DeepSeek API Error:", error.message);
    throw new Error(`DeepSeek generation failed: ${error.message}`);
  }
}

module.exports = { deepseekGenerate, getDeepSeekClient };