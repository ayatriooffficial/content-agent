const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * FALLBACK CLIENT (Groq)
 * Provides fallback generation when Gemini or DeepSeek quotas are exhausted.
 */

async function fallbackGenerate(systemPrompt, userPrompt, options = {}) {
  const temperature = options.temperature || 0.7;
  const maxTokens = options.maxTokens || 4000;

  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b", // Use a strong Groq model for fallback
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    return completion.choices[0].message.content || "";
  } catch (error) {
    console.error("Groq Fallback Error:", error.message);
    throw new Error(`Fallback generation failed: ${error.message}`);
  }
}

module.exports = { fallbackGenerate };
