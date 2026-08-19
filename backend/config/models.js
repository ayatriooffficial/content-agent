/**
 * MULTI-MODEL AI CONFIGURATION
 * Maps each agent to its designated AI model provider.
 * 
 * Model Assignment:
 * - Persona Agent: Gemini
 * - Research Agent: Gemini + DeepSeek R1 (via OpenRouter)
 * - Competitor Agent: DeepSeek R1 (via OpenRouter)
 * - Content Generation Agent: Groq (existing)
 * - Validation Agent: Groq (existing, lightweight)
 * - Orchestrator Agent: Groq (existing)
 * - Opportunity Agent: Gemini + DeepSeek R1
 */

const MODEL_CONFIG = {
  gemini: {
    model: "gemini-2.0-flash",
    provider: "google",
    apiKeyEnv: "GEMINI_API_KEY",
    maxTokens: 4096,
    temperature: 0.7
  },
  deepseek: {
    model: "deepseek/deepseek-r1",
    provider: "openrouter",
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    maxTokens: 4096,
    temperature: 0.6
  },
  groq: {
    model: "openai/gpt-oss-20b",
    provider: "groq",
    apiKeyEnv: "GROQ_API_KEY",
    maxTokens: 4000,
    temperature: 0.7
  },
  groqLightweight: {
    model: "openai/gpt-oss-120b",
    provider: "groq",
    apiKeyEnv: "GROQ_API_KEY",
    maxTokens: 2000,
    temperature: 0.3
  }
};

const AGENT_MODEL_MAP = {
  personaAgent: "gemini",
  researchAgent_broad: "gemini",
  researchAgent_analytical: "deepseek",
  competitorAgent: "deepseek",
  orchestratorAgent: "groq",
  contentGenerationAgent: "groq",
  validationAgent: "groqLightweight",
  opportunityAgent_broad: "gemini",
  opportunityAgent_analytical: "deepseek"
};

module.exports = { MODEL_CONFIG, AGENT_MODEL_MAP };
