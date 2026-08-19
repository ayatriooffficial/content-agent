/**
 * Persona Agent — STEP 3 of the autonomous pipeline.
 * 
 * Uses: Gemini (Primary), Groq (Fallback)
 * 
 * Enriches static persona templates with:
 * - Location intelligence (Kolkata/Lucknow)
 * - Current market trends
 * - Competitor messaging context
 * - Deep psychological pain points
 */
const { groqGenerate } = require("./clients/groqClient");

const safeParseJSON = require("./jsonParser/jsonParser");

async function personaAgent(templates, businessContext, locationContext = {}, marketResearch = "") {
  const targetLocation = locationContext.city || businessContext.targetLocation || "Kolkata";
  const baseTemplate = templates[0] || {};

  const systemPrompt = `You are a world-class consumer psychologist and persona strategist specializing in the Indian accounting education sector. You create "living" personas that capture the deepest psychological truths of students and professionals. Your work is data-driven but emotionally profound.

CRITICAL RULES:
- Output ONLY valid JSON. No markdown, no prose, no code fences.
- All array fields must be actual JSON arrays of strings.`;

  const userPrompt = `Enrich the following persona template with deep location-specific intelligence and current market trends for ${targetLocation}.

=== BROAD MARKET INTELLIGENCE ===
${marketResearch ? marketResearch : "No recent market data available. Rely on template."}

=== BASE TEMPLATE (Psychological Foundation) ===
Category: ${baseTemplate.audienceCategory}
Identity Belief: ${baseTemplate.psychologyLayer?.identityBelief || "Not defined"}
Hidden Fears: ${(baseTemplate.painArchitecture?.hiddenFears || []).join("; ") || "Not defined"}
Pain Points: ${baseTemplate.psychologyLayer?.emotionalFrustration || "Not defined"}
Live Situations: ${(baseTemplate.painArchitecture?.liveDailyLifeSituations || []).join("; ") || "Not defined"}

=== BUSINESS CONTEXT ===
Target Location: ${targetLocation}
Education Goal: ${businessContext.educationBackground || "Commerce"}
Primary Struggle: ${businessContext.biggestProblem || "No practical exposure"}

ENRICHMENT RULES:
1. FOUNDATION FIRST: Your primary source of truth is the BASE TEMPLATE and the MARKET INTELLIGENCE.
2. LOCATION AS A LENS: Apply the Target Location (${targetLocation}) as a "lens". Adapt their environment to match the local economy and job market.
3. PAIN POINT DEPTH: Dive deep into the TEMPLATE pains. Explain their emotional toll in ${targetLocation}.
4. CHARACTER SNAPSHOT: Make them feel alive, describing their daily grind and specific anxieties.

Output EXACTLY this JSON structure (no extra text):
{
  "buyerPersona": "A punchy name/label for this enriched persona (e.g., 'Anxious B.Com Fresher in Kolkata')",
  "characterSnapshot": "4-5 sentences that make them feel alive in the target location, describing their daily grind",
  "identityBelief": "2 deep-seated beliefs that drive their behavior",
  "deepPainAnalysis": "4-5 sentences analyzing the emotional toll of their pain points in the local context",
  "locationAnxiety": "3 specific fears unique to the local job market (e.g., specific local companies or colleges)",
  "hiddenFears": ["fear 1", "fear 2", "fear 3", "fear 4", "fear 5"],
  "liveSituations": ["situation 1", "situation 2", "situation 3", "situation 4", "situation 5"],
  "emotionalTriggers": ["trigger 1", "trigger 2", "trigger 3", "trigger 4", "trigger 5"]
}`;

  let resultJSON = null;
  
  // Retry logic for robust JSON generation
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`  [Persona Agent] Generating persona via Groq (Attempt ${attempt})...`);
      const rawResult = await groqGenerate(systemPrompt, userPrompt, { 
        model: "openai/gpt-oss-120b",
        temperature: 0.7, 
        maxTokens: 2000,  // Persona JSON is ~900 tokens
        json: true
      });
      
      resultJSON = safeParseJSON(rawResult);
      if (resultJSON && resultJSON.buyerPersona) {
        break; // Successfully parsed
      } else {
        throw new Error("Invalid or missing JSON fields");
      }
    } catch (err) {
      console.warn(`  [Persona Agent] Generation failed on attempt ${attempt}: ${err.message}`);
      if (attempt === 2) {
        // Fallback to static mapping if LLM fails completely
        resultJSON = {
          buyerPersona: `${baseTemplate.audienceCategory} in ${targetLocation}`,
          characterSnapshot: `A typical ${baseTemplate.audienceCategory} navigating the accounting job market in ${targetLocation}. They face immense pressure to secure a stable career.`,
          identityBelief: baseTemplate.psychologyLayer?.identityBelief || "I must secure a safe job to make my family proud.",
          deepPainAnalysis: "They struggle with a massive gap between theoretical knowledge and practical employer expectations.",
          locationAnxiety: `High competition for limited corporate roles in ${targetLocation}.`,
          hiddenFears: baseTemplate.painArchitecture?.hiddenFears || ["Fear of unemployment", "Fear of falling behind peers"],
          liveSituations: baseTemplate.painArchitecture?.liveDailyLifeSituations || ["Comparing themselves on LinkedIn", "Getting rejected after interviews"],
          emotionalTriggers: ["Salary increment promises", "Guaranteed interview calls", "Practical software skills"]
        };
      }
    }
  }

  return {
    buyerPersona: resultJSON.buyerPersona,
    characterSnapshot: resultJSON.characterSnapshot,
    identityBelief: resultJSON.identityBelief,
    painPointAnalysis: resultJSON.deepPainAnalysis,
    locationAnxiety: resultJSON.locationAnxiety,
    hiddenFears: Array.isArray(resultJSON.hiddenFears) ? resultJSON.hiddenFears : [],
    liveSituations: Array.isArray(resultJSON.liveSituations) ? resultJSON.liveSituations : [],
    emotionalTriggers: Array.isArray(resultJSON.emotionalTriggers) ? resultJSON.emotionalTriggers : [],
    // Comprehensive template data
    fullPsychology: baseTemplate.psychologyLayer || {},
    fullPainArchitecture: baseTemplate.painArchitecture || {},
    lifeSituation: baseTemplate.lifeSituation || {},
    voiceOfCustomer: baseTemplate.voiceOfCustomer || {},
    transformationGoal: baseTemplate.transformationGoal || {},
    buyingBehavior: baseTemplate.buyingBehavior || {},
    methodology: {
      approach: "Psychological Persona Enrichment (JSON enforced)",
      model: "Groq (Llama 3.3 70B)",
      reasoning: `Enriched the base template with deep localized context for ${targetLocation} using Opportunity Market Intelligence. Built a living profile that drives high-conversion content.`
    }
  };
}

module.exports = personaAgent;
