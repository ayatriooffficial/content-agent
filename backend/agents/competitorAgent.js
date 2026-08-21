/**
 * Competitor Analysis Agent — STEP 3 of the autonomous pipeline.
 * 
 * Uses: DeepSeek R1 via OpenRouter (Primary), Groq (Fallback)
 * 
 * Analyzes hardcoded primary competitors for:
 * - SWOT Analysis
 * - Emotional Gap Analysis
 * - Trust Gap Analysis
 * - SEO Gap Analysis
 */
const { generateJSON } = require("./clients/generateJSON");
const { PRIMARY_COMPETITORS, getCompetitorContext } = require("../config/competitors");
const safeParseJSON = require("./jsonParser/jsonParser");

async function competitorAgent(competitorWebsites, personaProfile, researchData, options = {}) {
  // Use hardcoded competitors + any additional ones passed in; callers can
  // override the full context (e.g. the DGM run uses digital-marketing
  // competitors instead of the accounting set) via options.competitorContext.
  const allCompetitors = options.competitorContext || getCompetitorContext();
  const additionalCompetitors = (competitorWebsites || []).filter(c =>
    !PRIMARY_COMPETITORS.some(pc => pc.url.includes(c) || c.includes(pc.url))
  );

  const systemPrompt = `You are a professional competitive intelligence strategist specializing in the Indian Accounting & Finance Education market. You analyze competitors through both strategic (SWOT) and psychological (emotional/trust gaps) lenses. Focus on actionable differentiation opportunities.

CRITICAL RULES:
- Output ONLY valid JSON. No markdown, no prose, no code fences.
- All array fields must be actual JSON arrays of strings.`;

  const userPrompt = `Perform a comprehensive competitive intelligence analysis for the Indian accounting education market.

=== PRIMARY COMPETITORS (Strictly use and compete against these) ===
${allCompetitors}
${additionalCompetitors.length > 0 ? `\nAdditional: ${additionalCompetitors.join(", ")}` : ""}

=== AUDIENCE INTELLIGENCE ===
Reader: ${personaProfile.buyerPersona || "Accounting student"}
Identity Belief: ${personaProfile.identityBelief || "Not specified"}
Target Location: ${personaProfile.targetLocation || "Kolkata"}
Pain Points: ${(personaProfile.painPoints || []).join("; ")}

=== RESEARCH CONTEXT ===
Search Intent: ${researchData.searchIntentAnalysis || (researchData.emotionalSearchPatterns || []).join(", ")}
Trust Signals Needed: ${(researchData.trustSignals || []).join(", ")}
SEO Gaps Found: ${(researchData.seoGaps || []).join(", ")}

Perform analysis using these PROFESSIONAL METHODOLOGIES:
1. SWOT Analysis
2. Emotional Gap Analysis
3. Trust Gap Analysis
4. SEO Gap Analysis
5. Messaging Weaknesses (where their copy fails psychologically)

Output EXACTLY this JSON structure (no extra text):
{
  "swot": {
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "opportunities": ["opportunity 1", "opportunity 2"],
    "threats": ["threat 1", "threat 2"]
  },
  "emotionalGaps": ["gap 1", "gap 2", "gap 3", "gap 4", "gap 5", "gap 6"],
  "trustGaps": ["gap 1", "gap 2", "gap 3", "gap 4", "gap 5", "gap 6"],
  "seoGaps": ["gap 1", "gap 2", "gap 3", "gap 4", "gap 5", "gap 6"],
  "positioningAnalysis": "4-5 sentences on how competitors position themselves and the gap",
  "messagingWeaknesses": ["weakness 1", "weakness 2", "weakness 3", "weakness 4", "weakness 5", "weakness 6"],
  "competitorBlindSpots": ["blind spot 1", "blind spot 2", "blind spot 3", "blind spot 4", "blind spot 5", "blind spot 6"],
  "differentiationStrategy": "4-5 sentences on exactly how to beat them with specific tactics",
  "contentOpportunities": ["opportunity 1", "opportunity 2", "opportunity 3", "opportunity 4", "opportunity 5", "opportunity 6"]
}`;

  let resultJSON = null;
  
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`  [Competitor Agent] Extracting JSON (Attempt ${attempt})...`);
      const rawResult = await generateJSON(systemPrompt, userPrompt, { 
        model: "gemini-3.5-flash-lite",  // Primary: native JSON mode
        groqModel: "openai/gpt-oss-120b", // Fallback: reliable structured JSON
        temperature: 0.5, 
        maxTokens: 1500,  // JSON structure is ~700 tokens
        json: true
      });
      
      resultJSON = safeParseJSON(rawResult);
      if (resultJSON && resultJSON.swot && Array.isArray(resultJSON.emotionalGaps)) {
        break; // Successfully parsed
      } else {
        throw new Error("Invalid or missing JSON fields");
      }
    } catch (err) {
      console.warn(`  [Competitor Agent] JSON Extraction failed on attempt ${attempt}: ${err.message}`);
      if (attempt === 2) {
        return buildFallbackCompetitorAnalysis(personaProfile);
      }
    }
  }

  return {
    swot: {
      strengths: Array.isArray(resultJSON.swot?.strengths) ? resultJSON.swot.strengths : [],
      weaknesses: Array.isArray(resultJSON.swot?.weaknesses) ? resultJSON.swot.weaknesses : [],
      opportunities: Array.isArray(resultJSON.swot?.opportunities) ? resultJSON.swot.opportunities : [],
      threats: Array.isArray(resultJSON.swot?.threats) ? resultJSON.swot.threats : []
    },
    emotionalGaps: Array.isArray(resultJSON.emotionalGaps) ? resultJSON.emotionalGaps : [],
    trustGaps: Array.isArray(resultJSON.trustGaps) ? resultJSON.trustGaps : [],
    seoGaps: Array.isArray(resultJSON.seoGaps) ? resultJSON.seoGaps : [],
    positioningAnalysis: resultJSON.positioningAnalysis || "",
    messagingWeaknesses: Array.isArray(resultJSON.messagingWeaknesses) ? resultJSON.messagingWeaknesses : [],
    competitorBlindSpots: Array.isArray(resultJSON.competitorBlindSpots) ? resultJSON.competitorBlindSpots : [],
    strategyNotes: resultJSON.differentiationStrategy || "",
    contentOpportunities: Array.isArray(resultJSON.contentOpportunities) ? resultJSON.contentOpportunities : [],
    analyzedWebsites: PRIMARY_COMPETITORS.map(c => `${c.name} (${c.url})`),
    methodology: {
      principlesUsed: ["SWOT Analysis", "Emotional Gap Analysis", "Trust Gap Analysis", "SEO Gap Analysis", "Positioning Analysis", "Messaging Weakness Analysis"],
      models: {
        primary: "Groq (Llama 3.3 70B)",
        fallback: "Groq (Llama 3.3 70B)"
      },
      competitorsAnalyzed: PRIMARY_COMPETITORS.map(c => c.name),
      approach: "7-framework professional competitive intelligence powered by Groq (JSON Enforced).",
      reasoning: `Analyzed ${PRIMARY_COMPETITORS.length} hardcoded competitors. Used analytical reasoning to find messaging weaknesses and emotional gaps they miss.`
    }
  };
}

function buildFallbackCompetitorAnalysis(personaProfile) {
  return {
    swot: {
      strengths: ["Brand recognition", "Large student base"],
      weaknesses: ["Theory-heavy content", "Generic marketing"],
      opportunities: ["Practical skill focus", "Emotional storytelling"],
      threats: ["Market saturation"]
    },
    emotionalGaps: ["Interview anxiety", "Family pressure", "Peer comparison stress"],
    trustGaps: ["No real salary data", "No relatable student stories"],
    seoGaps: ["Location-specific accounting courses", "Practical accounting jobs"],
    positioningAnalysis: "Competitors focus on curriculum features. Opportunity: position as the practical skill bridge for career transformation.",
    messagingWeaknesses: ["Too much jargon", "No empathy"],
    competitorBlindSpots: ["Career guidance", "Confidence building"],
    strategyNotes: "Focus on emotional connection and practical outcomes.",
    contentOpportunities: ["Interview anxiety content", "Practical skill demonstrations"],
    analyzedWebsites: PRIMARY_COMPETITORS.map(c => `${c.name} (${c.url})`),
    methodology: {
      principlesUsed: ["SWOT Analysis", "Emotional Gap Analysis"],
      model: "Fallback (Primary Models Unavailable)",
      competitorsAnalyzed: PRIMARY_COMPETITORS.map(c => c.name),
      approach: "Fallback competitive intelligence based on stored patterns."
    }
  };
}

module.exports = competitorAgent;
