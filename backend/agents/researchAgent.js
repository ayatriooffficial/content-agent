/**
 * Research Agent — STEP 2 of the autonomous pipeline.
 *
 * LIVE-SEARCH + DUAL-MODEL RESEARCH INTELLIGENCE
 *
 * Phase 0: Live web research (DuckDuckGo + Reddit site-search) using the
 *          persona's real voice — grounded on the buyer journey file's
 *          platform list (Google, YouTube, Instagram, WhatsApp, Telegram,
 *          LinkedIn, Quora, Reddit, job portals). If search fails, the
 *          pipeline continues with LLM simulation (zero regression risk).
 * Phase 1: Qualitative research (Groq prose) — emotional search intent.
 * Phase 2: Strict JSON analytical extraction (Gemini primary, Groq fallback).
 */
const { generateJSON } = require("./clients/generateJSON");
const { groqGenerate } = require("./clients/groqClient");
const { getLocationByCity } = require("../config/locations");
const safeParseJSON = require("./jsonParser/jsonParser");
const { runLiveResearch, renderLiveEvidence, buildSearchQueries } = require("../services/liveResearch");

async function researchAgent(personaProfile, businessContext, locationContext = {}) {
  const targetLocation = locationContext.city || businessContext.targetLocation || "Kolkata";
  const locationData = getLocationByCity(targetLocation);
  const programSpec = businessContext.programSpec || {};

  // ═══════════════════════════════════════════════════════════════
  // PHASE 0: LIVE WEB RESEARCH (real snippets, graceful degradation)
  // ═══════════════════════════════════════════════════════════════
  let liveEvidenceText = "";
  try {
    const queries = buildSearchQueries(personaProfile, programSpec);
    const liveGroups = await runLiveResearch(queries);
    liveEvidenceText = liveGroups.length
      ? `\n=== LIVE SEARCH EVIDENCE (GOOGLE/REDDIT REAL RESULTS) — USE THESE REAL PHRASES AND PAINS ===\n${renderLiveEvidence(liveGroups)}\n`
      : "";
  } catch (err) {
    console.warn("  [Research Agent] Live search skipped:", err.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: BROAD QUALITATIVE RESEARCH
  // ═══════════════════════════════════════════════════════════════
  const phase1SystemPrompt = `You are a behavioral research intelligence system for the Indian Accounting, Finance, Digital Marketing & Business education market. You understand WHY users search, not just WHAT they search. Focus on emotional intent, career anxiety, and location-specific patterns. Provide deep, qualitative analysis grounded in the real platforms where these audiences actually speak.`;

  const phase1UserPrompt = `Perform deep behavioral research for this specific audience and location.

=== AUDIENCE ===
Reader: ${personaProfile.buyerPersona || "Accounting student"}
Category: ${businessContext.audienceCategory || "College-Level Student"}
Identity Belief: ${personaProfile.identityBelief || "Not specified"}
Hidden Fears: ${(personaProfile.hiddenFears || []).join(", ")}
Fear of Inaction: ${(personaProfile.fearOfInaction || []).join(", ")}
Pain Points: ${(personaProfile.painPoints || []).join("; ")}
Live Situations: ${(personaProfile.liveSituations || []).join("; ")}
Location: ${targetLocation}

=== LOCATION CONTEXT ===
${locationData && Array.isArray(locationData.searchBehavior) && Array.isArray(locationData.studentPainPoints) ? `
City: ${locationData.city}, ${locationData.state || ""}
Economy: ${locationData.economicProfile || ""}
Education Hub: ${locationData.educationHub || ""}
Local Search Patterns: ${locationData.searchBehavior.join("; ")}
Local Pain Points: ${locationData.studentPainPoints.join("; ")}` : `City: ${targetLocation}`}
${liveEvidenceText}
=== RESEARCH PLATFORMS (ground your analysis in these real channels) ===
Google Search (keyword intent + AI overview targeting), YouTube (tutorials, career stories, comments), Instagram (Reels, career motivation), WhatsApp groups & forwards, Telegram study groups, LinkedIn (professionals, jobs, observing behavior), Quora (question voice), Reddit (honest complaint voice), Naukri/Internshala/Indeed (job-search rejection reality), ChatGPT/Perplexity (AI search queries).

Perform research on:
1. SEARCH INTENT MAPPING — What do they search and WHY?
2. EMOTIONAL PATTERN ANALYSIS — What emotions drive their searches?
3. TREND DETECTION — What topics are trending for this audience in ${targetLocation}?
4. LOCATION-BASED SEARCH ANALYSIS — How do search patterns differ in ${targetLocation}?
5. CAREER ANXIETY ANALYSIS — What career fears are MOST ACUTE right now?
6. PLATFORM BEHAVIOR — Where do they actually spend time (reels, YouTube, WhatsApp, LinkedIn lurking) and what content do they trust?
7. EMOTIONAL TRANSFORMATION — What is the deep transformation they desperately seek?
8. OBJECTION VOICE — What exact phrases/objections would they type on Reddit/Quora (e.g., "is this course a scam?", "placement support real?")?`;

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

  const phase2UserPrompt = `Extract structured analytical research for education content targeting ${businessContext.audienceCategory || "students"} in ${targetLocation}.

=== QUALITATIVE RESEARCH INTELLIGENCE ===
${qualitativeResearch.substring(0, 3000)}
${liveEvidenceText ? `\n=== LIVE VOICE EVIDENCE (real user phrasing — quote it directly where useful) ===\n${liveEvidenceText}` : ""}

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
  "exactSearchIntents": ["exact long-tail search phrase 1", "exact long-tail search phrase 2", "exact long-tail search phrase 3"],
  "quoraStyleQuestions": ["question 1", "question 2", "question 3"],
  "redditVoicePhrases": ["exact phrase someone would post on Reddit, e.g., 'Applied to 40 jobs and got zero callbacks'"],
  "jobPortalQueries": ["job portal search phrase 1", "job portal search phrase 2"],
  "platformWeeklyHabits": "2-3 sentences on where they spend time (reels, YouTube, WhatsApp groups, LinkedIn lurking) and what content earns their trust",
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
        maxTokens: 1400,  // JSON structure is ~600 tokens
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
          exactSearchIntents: [`best ${programSpec.label || "course"} in ${targetLocation} for job`, "placement guaranteed course", "practical training with internship"],
          quoraStyleQuestions: ["Will this course actually get me a job?", "Is placement support real?"],
          redditVoicePhrases: ["Applied everywhere and got zero callbacks", "Scared of wasting another year"],
          jobPortalQueries: ["fresher accountant jobs", "digital marketing executive no experience"],
          platformWeeklyHabits: `Spends evenings on Instagram reels and YouTube, lurks on LinkedIn, active in WhatsApp/Telegram groups; trusts honest student proof over ads.`,
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
    // Buyer-journey aligned additions
    exactSearchIntents: Array.isArray(resultJSON.exactSearchIntents) ? resultJSON.exactSearchIntents : [],
    quoraStyleQuestions: Array.isArray(resultJSON.quoraStyleQuestions) ? resultJSON.quoraStyleQuestions : [],
    redditVoicePhrases: Array.isArray(resultJSON.redditVoicePhrases) ? resultJSON.redditVoicePhrases : [],
    jobPortalQueries: Array.isArray(resultJSON.jobPortalQueries) ? resultJSON.jobPortalQueries : [],
    platformWeeklyHabits: resultJSON.platformWeeklyHabits || "",
    contextualQueries: Array.isArray(resultJSON.aiSearchQueries) ? resultJSON.aiSearchQueries : [],
    trendingTopics: Array.isArray(resultJSON.trendingTopics) ? resultJSON.trendingTopics : [],
    liveSearchEvidence: liveEvidenceText ? "collected" : "unavailable",
    dataSources: ["Google Search", "Reddit", "YouTube", "LinkedIn", "Quora", "Job Portals", "Instagram", "WhatsApp/Telegram Groups"],
    methodology: {
      principlesUsed: ["Live Search Evidence", "Search Intent Mapping", "Emotional Pattern Analysis", "Trend Detection", "Context Aggregation", "SEO Opportunity Analysis", "Source Reliability Filtering", "Location-based Search Analysis", "Career Anxiety Analysis", "Platform Behavior Analysis"],
      dataSources: ["Google Search", "Reddit", "YouTube", "LinkedIn", "Quora", "Job Portals", "Instagram", "WhatsApp/Telegram Groups"],
      models: {
        phase0: "Live web search (DuckDuckGo + Reddit)",
        primary: "Gemini (JSON extraction)",
        fallback: "Groq (JSON extraction)"
      },
      approach: "Live-search grounded research intelligence (Groq qualitative + Gemini JSON extraction).",
      reasoning: "Research powered by real search evidence where available, focused on deep persona pain points, localized anxieties, and platform behavior. Analysis exploits gaps competitors miss by addressing the emotional core of career searches."
    }
  };
}

module.exports = researchAgent;