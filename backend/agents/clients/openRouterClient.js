/**
 * OPENROUTER AI CLIENT (DeepSeek R1)
 * Wrapper for OpenRouter API calls using DeepSeek R1 model.
 * Used by: Competitor Agent, Research Agent (analytical), Opportunity Agent
 * 
 * IMPORTANT: Explicitly uses model: "deepseek/deepseek-r1"
 */

/**
 * Generate text using DeepSeek R1 via OpenRouter.
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - User prompt
 * @param {object} options - { temperature, maxTokens }
 * @returns {string} Generated text
 */
async function deepseekGenerate(systemPrompt, userPrompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ OPENROUTER_API_KEY not set. DeepSeek calls will fail.");
  }

  const temperature = options.temperature || 0.6;
  const maxTokens = options.maxTokens || 4096;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey || "PLACEHOLDER"}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://accountiq.app",
        "X-Title": "AccountIQ Content Intelligence"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error("No choices returned from OpenRouter API");
    }

    return data.choices[0].message.content || "";
  } catch (error) {
    console.error("OpenRouter/DeepSeek API Error:", error.message);
    throw new Error(`DeepSeek R1 generation failed: ${error.message}`);
  }
}

module.exports = { deepseekGenerate };
