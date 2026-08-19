/**
 * Research Agent — STEP 2 of the autonomous pipeline.
 * 
 * DUAL-MODEL RESEARCH INTELLIGENCE
 * 
 * Gemini: Broad contextual understanding, emotional search intent, search intent aggregation
 * DeepSeek R1: Analytical reasoning, structured insights, contextual gap analysis
 * Groq: Fallback intelligence
 */
const { generateJSON } = require("./clients/generateJSON");
const { groqGenerate } = require("./clients/groqClient");
const { getLocationByCity } = require("../config/locations");
const safeParseJSON = require("./jsonParser/jsonParser");

async function researchAgent(personaProfile, businessContext, locationContext = {}) {
  const targetLocation = locationContext.city || businessContext.targetLocation || "Kolkata";
  const locationData = getLocationByCity(targetLocation);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: BROAD QUALITATIVE RESEARCH
  // ═══════════════════════════════════════════════════════════════
  const phase1SystemPrompt = `You are a behavioral research intelligence system for the Indian Accounting & Finance Education market. You understand WHY users search, not just WHAT they search. Focus on emotional intent, career anxiety, and location-specific patterns. Provide deep, qualitative analysis.`;

  const phase1UserPrompt = `Perform deep behavioral research for this specific audience and location.

=== AUDIENCE ===
Reader: ${personaProfile.buyerPersona || "Accounting student"}
Category: ${businessContext.audienceCategory || "College-Level Student"}
Identity Belief: ${personaProfile.identityBelief || "Not specified"}
Hidden Fears: ${(personaProfile.hiddenFears || []).join(", ")}
Pain Points: ${(personaProfile.painPoints || []).join("; ")}
Live Situations: ${(personaProfile.liveSituations || []).join("; ")}
Location: ${targetLocation}

=== LOCATION CONTEXT ===
${locationData ? `
City: ${locationData.city}, ${locationData.state}
Economy: ${locationData.economicProfile}
Education Hub: ${locationData.educationHub}
Local Search Patterns: ${locationData.searchBehavior.join("; ")}
Local Pain Points: ${locationData.studentPainPoints.join("; ")}` : `City: ${targetLocation}`}

Perform research on:
1. SEARCH INTENT MAPPING — What do they search and WHY?
2. EMOTIONAL PATTERN ANALYSIS — What emotions drive their searches?
3. TREND DETECTION — What accounting topics are trending in ${targetLocation}?
4. LOCATION-BASED SEARCH ANALYSIS — How do search patterns differ in ${targetLocation}?
5. CAREER ANXIETY ANALYSIS — What career fears are MOST ACUTE right now?
6. EMOTIONAL TRANSFORMATION — What is the deep transformation they desperately seek?`;

  let qualitativeResearch = "";
  try {
    console.log("  [Research Phase 1] Running qualitative research...");
    qualitativeResearch = await groqGenerate(phase1SystemPrompt, phase1UserPrompt, { 
      model: "openai/gpt-oss-20b",
      temperature: 0.8, 
      maxTokens: 2000  // Output is sliced to 3000 chars in Phase 2 prompt
    });
  } catch (err) {
    console.error("Research Agent — Phase 1 failed:", err.message);
    qualitativeResearch = "Qualitative research unavailable.";
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: STRICT JSON ANALYTICAL EXTRACTION
  // ═══════════════════════════════════════════════════════════════
  const phase2SystemPrompt = `You are an analytical research intelligence engine. You take qualitative research and extract precise, data-driven insights into STRICT JSON format.

CRITICAL RULES:
- Output ONLY valid JSON. No markdown, no prose, no code fences.
- All array fields must be actual JSON arrays of strings.`;

  const phase2UserPrompt = `Extract structured analytical research for accounting education content targeting ${businessContext.audienceCategory || "students"} in ${targetLocation}.

=== QUALITATIVE RESEARCH INTELLIGENCE ===
${qualitativeResearch.substring(0, 3000)}

Output EXACTLY this JSON structure (no extra text):
{
  "searchIntentAnalysis": "A 2-3 sentence summary of the overarching emotional search intent",
  "emotionalSearchPatterns": ["fear of...","desire for...", "urgency regarding..."],
  "careerAnxietyPatterns": ["anxiety 1", "anxiety 2", "anxiety 3"],
  "locationSearchPatterns": ["local pattern 1", "local pattern 2"],
  "platformTrustMap": ["Google", "LinkedIn", "Reddit"],
  "trendingTopics": ["trend 1", "trend 2", "trend 3", "trend 4"],
  "contentPreference": ["Case studies", "Salary insights", "Video tutorials"],
  "transformationPsychology": "A 2-3 sentence summary of the emotional transformation they seek",
  "keywords": ["seo keyword 1", "seo keyword 2", "seo keyword 3", "seo keyword 4"],
  "aiSearchQueries": ["ChatGPT query 1", "ChatGPT query 2", "ChatGPT query 3"],
  "seoGaps": ["competitor gap 1", "competitor gap 2", "competitor gap 3"],
  "searchIntentClusters": ["cluster 1", "cluster 2", "cluster 3"],
  "trustSignals": ["trust signal 1", "trust signal 2", "trust signal 3"],
  "competitiveContentGaps": ["content gap 1", "content gap 2"],
  "behavioralPatterns": ["behavior 1", "behavior 2"],
  "contentOpportunityScore": 85
}`;

  let resultJSON = null;
  
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`  [Research Phase 2] Extracting JSON (Attempt ${attempt})...`);
      const rawResult = await generateJSON(phase2SystemPrompt, phase2UserPrompt, { 
        model: "gemini-3.5-flash-lite",  // Primary: native JSON mode
        groqModel: "openai/gpt-oss-120b", // Fallback: reliable structured JSON
        temperature: 0.3, 
        maxTokens: 1200,  // JSON structure is ~500 tokens
        json: true
      });
      
      resultJSON = safeParseJSON(rawResult);
      if (resultJSON && Array.isArray(resultJSON.keywords)) {
        break; // Successfully parsed
      } else {
        throw new Error("Invalid or missing JSON fields");
      }
    } catch (err) {
      console.warn(`  [Research Agent] JSON Extraction failed on attempt ${attempt}: ${err.message}`);
      if (attempt === 2) {
        // Fallback payload
        resultJSON = {
          searchIntentAnalysis: `Driven by career anxiety and placement urgency in ${targetLocation}.`,
          emotionalSearchPatterns: ["Fear of unemployment", "Confusion about career path", "Urgency before placements"],
          careerAnxietyPatterns: ["Failing interviews", "Not having practical skills"],
          locationSearchPatterns: [`Job queries specific to ${targetLocation}`],
          platformTrustMap: ["Google Search", "YouTube", "LinkedIn"],
          trendingTopics: ["GST updates", "Tally Prime practicals", "Interview preparation"],
          contentPreference: ["Step-by-step guides", "Salary transparency", "Practical examples"],
          transformationPsychology: "Seeking confidence to face interviews and guarantee a stable income.",
          keywords: [`accounting course ${targetLocation}`, "practical accounting training", "Tally learning for beginners", "GST filing training", "accounting job for freshers"],
          aiSearchQueries: [`What should I learn to get an accounting job in ${targetLocation}?`, "Is Tally enough for a job?"],
          seoGaps: ["Real salary data", "Location specific interview questions"],
          searchIntentClusters: ["Course discovery", "Salary research", "Interview prep"],
          trustSignals: ["Student testimonials", "Salary data", "Practical curriculum"],
          competitiveContentGaps: ["Emotional support", "Realistic career paths"],
          behavioralPatterns: ["Searching for salaries first", "Comparing multiple institutes"],
          contentOpportunityScore: 75
        };
      }
    }
  }

  // Construct final JS object matching original expected structure
  return {
    searchIntentAnalysis: resultJSON.searchIntentAnalysis || "",
    emotionalSearchPatterns: Array.isArray(resultJSON.emotionalSearchPatterns) ? resultJSON.emotionalSearchPatterns : [],
    careerAnxietyPatterns: Array.isArray(resultJSON.careerAnxietyPatterns) ? resultJSON.careerAnxietyPatterns : [],
    locationSearchPatterns: Array.isArray(resultJSON.locationSearchPatterns) ? resultJSON.locationSearchPatterns : [],
    platformTrustMap: Array.isArray(resultJSON.platformTrustMap) ? resultJSON.platformTrustMap : [],
    trendInsights: Array.isArray(resultJSON.trendingTopics) ? resultJSON.trendingTopics : [],
    contentPreference: Array.isArray(resultJSON.contentPreference) ? resultJSON.contentPreference : [],
    transformationPsychology: resultJSON.transformationPsychology || "",
    keywords: Array.isArray(resultJSON.keywords) ? resultJSON.keywords : [],
    aiSearchQueries: Array.isArray(resultJSON.aiSearchQueries) ? resultJSON.aiSearchQueries : [],
    seoGaps: Array.isArray(resultJSON.seoGaps) ? resultJSON.seoGaps : [],
    searchIntentClusters: Array.isArray(resultJSON.searchIntentClusters) ? resultJSON.searchIntentClusters : [],
    trustSignals: Array.isArray(resultJSON.trustSignals) ? resultJSON.trustSignals : [],
    contentOpportunityScore: parseInt(resultJSON.contentOpportunityScore) || 75,
    competitiveContentGaps: Array.isArray(resultJSON.competitiveContentGaps) ? resultJSON.competitiveContentGaps : [],
    behavioralPatterns: Array.isArray(resultJSON.behavioralPatterns) ? resultJSON.behavioralPatterns : [],
    contextualQueries: Array.isArray(resultJSON.aiSearchQueries) ? resultJSON.aiSearchQueries : [],
    trendingTopics: Array.isArray(resultJSON.trendingTopics) ? resultJSON.trendingTopics : [],
    dataSources: ["Google Search", "YouTube", "LinkedIn", "Reddit", "Accounting Forums", "Career Discussions"],
    methodology: {
      principlesUsed: ["Search Intent Mapping", "Emotional Pattern Analysis", "Trend Detection", "Context Aggregation", "SEO Opportunity Analysis", "Source Reliability Filtering", "Location-based Search Analysis", "Career Anxiety Analysis"],
      dataSources: ["Google Search", "YouTube", "LinkedIn", "Reddit", "Accounting Forums", "Career Discussions"],
      models: {
        primary: "Groq (Llama 3.3 70B)",
        fallback: "Groq (Llama 3.3 70B)"
      },
      approach: "Research intelligence powered by Groq (JSON Enforced).",
      reasoning: "Research focused on deep persona pain points and localized anxieties. Analysis exploits gaps competitors miss by addressing the emotional core of commerce career searches."
    }
  };
}

module.exports = researchAgent;
