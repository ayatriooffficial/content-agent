/**
 * OPPORTUNITY ANALYSIS AGENT — STEP 0 of the autonomous pipeline.
 *
 * FULLY DYNAMIC — no hardcoded audience list, no hardcoded cities.
 *
 * Flow:
 *   Phase 1: Broad market research (Groq prose) — grounded in Google/Quora/Reddit-style signals
 *   Phase 2: AI DISCOVERS the top 3-5 audience segments + target cities from LIVE Charters Union
 *            website data + the market research. Nothing canned.
 *   Phase 3: AI scores the DISCOVERED audiences on 7 dimensions (Gemini JSON).
 *   Phase 4: JS recalculates scores, applies memory diversity penalty, picks the winner.
 *
 * NO hardcoded fallback: if any AI phase fails, this THROWS so the pipeline run
 * is marked failed visibly (admin retries) instead of injecting canned data.
 *
 * The ONE deliberate static value: Kolkata is kept as a city candidate every
 * run because it is the brand's home operating region (buyer journey brief).
 */
const { generateJSON } = require("./clients/generateJSON");
const { groqGenerate } = require("./clients/groqClient");
const { getCompetitorContext } = require("../config/competitors");
const { memoryAgent } = require("./memoryAgent");
const safeParseJSON = require("./jsonParser/jsonParser");
const { getWebsiteContext } = require("../services/websiteContext");
const { getPrimaryLocationContext } = require("../config/locations");

// ═══════════════════════════════════════════════════════════════
// HELPER: Retry an async function up to N times with delay
// ═══════════════════════════════════════════════════════════════
async function withRetry(fn, retries = 2, delayMs = 1500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt < retries) {
        console.warn(`  ↻ Retrying in ${delayMs}ms... (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Build a rich memory context summary for prompts
// ═══════════════════════════════════════════════════════════════
function buildMemorySummary(memoryData) {
  const recentTitles = (memoryData.previousTitles || []).slice(-8);
  const recentCategories = (memoryData.previousCategories || []).slice(-6);
  const successfulStrategies = (memoryData.emotionalStrategies || []).slice(-4);
  const successfulHooks = (memoryData.successfulHooks || []).slice(-3);
  const successfulKeywords = (memoryData.successfulKeywords || []).slice(-6);
  const avoidTopics = memoryData.avoidTopics || [];

  const categoryFrequency = {};
  (memoryData.previousCategories || []).forEach(c => {
    categoryFrequency[c] = (categoryFrequency[c] || 0) + 1;
  });

  return {
    summary: `
Audience categories used recently: ${recentCategories.join(", ") || "None"}
Category frequency (over-saturation risk): ${JSON.stringify(categoryFrequency)}
Proven emotional strategies that worked: ${successfulStrategies.join("; ") || "None yet"}
Proven emotional hooks that worked: ${successfulHooks.join("; ") || "None yet"}
High-performing keywords: ${successfulKeywords.join(", ") || "None yet"}
Topics to avoid (too saturated): ${avoidTopics.join(", ") || "None"}`,
    categoryFrequency,
    totalBlogs: memoryData.totalBlogsGenerated || 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN: Opportunity Agent (fully dynamic)
// ═══════════════════════════════════════════════════════════════
async function opportunityAgent() {
  const competitorContext = getCompetitorContext();

  // Memory for historical patterns (diversity rotation)
  let memoryData;
  try {
    memoryData = await memoryAgent("ACCOUNTING");
  } catch (e) {
    console.warn("Memory Agent unavailable — proceeding without history.");
    memoryData = {
      totalBlogsGenerated: 0,
      previousTitles: [],
      previousCategories: [],
      emotionalStrategies: [],
      successfulHooks: [],
      successfulKeywords: [],
      avoidTopics: [],
      locationHistory: [],
    };
  }
  const memorySummary = buildMemorySummary(memoryData);

  // LIVE Charters Union website data — the PRIMARY SOURCE OF TRUTH
  let websiteContextText = "";
  try {
    const website = await getWebsiteContext();
    websiteContextText = website?.context
      ? `\n=== LIVE WEBSITE DATA (Charters Union) — PRIMARY SOURCE OF TRUTH ===\n${website.context}\n`
      : "";
  } catch (err) {
    console.warn("Opportunity Agent — website data fetch failed:", err.message);
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 1: BROAD MARKET RESEARCH (Groq prose — Google/Quora/Reddit-style signals)
  // ══════════════════════════════════════════════════════════════
  const researchSystemPrompt = `You are a senior market intelligence analyst specializing in the Indian Accounting & Finance Education sector. You perform deep qualitative research using signals from Google Trends, LinkedIn, Reddit, YouTube comments, college forums, job boards (Naukri, LinkedIn), and accounting Facebook groups.

Your goal: produce rich, specific, and actionable market intelligence — not generic observations. Every insight must be grounded in the real psychological and economic realities of Indian accounting students and professionals.

Think like a researcher who spends time reading actual Reddit posts, YouTube comments, and LinkedIn complaints from Indian commerce students and accounting professionals.`;

  const researchUserPrompt = `Perform a comprehensive market opportunity analysis for Indian accounting education content.

=== LIVE CHARTERS UNION OFFERINGS (ground every insight in these REAL programs) ===
${websiteContextText}

=== HOME MARKET (PRIMARY OPERATING REGION — Charters Union is Kolkata/Howrah based) ===
Use this as the demand anchor: the brand operates from Kolkata/Howrah, and its buyer journey is written for that local market (middle-class family pressure, employability anxiety, weak spoken-English confidence). Keep Kolkata/Howrah demand in the analysis; only rank other cities above it when the evidence is genuinely stronger.
${getPrimaryLocationContext()}

=== COMPETITOR LANDSCAPE ===
${competitorContext}

=== CONTENT HISTORY (use this to recommend FRESH angles) ===
${memorySummary.summary}

=== YOUR RESEARCH TASK ===
Based on the REAL Charters Union programs (CBA/DGM/TBM) and current market signals, identify:

1. WHO is searching for this kind of education RIGHT NOW? — Give 4-6 SPECIFIC, grounded audience segments. Create vivid labels that describe a real person's situation (career stage + pain + goal) — do NOT reuse generic template labels like "12th Pass Commerce Student" or "College-Level Student", and do NOT copy any example segment names. Each must feel like it was discovered from real job boards, Reddit, YouTube comments, and college groups.

2. FOR EACH segment: their exact Google search queries, primary emotional pain, trending topics, competitor content gaps, and content angle opportunities.

3. WHICH CITIES show the strongest demand for these programs? — Name 3-5 specific Indian cities/tiers with reasoning (job market, college density, employer demand, cost sensitivity). Kolkata/Howrah must be evaluated first as the home market.

4. OVERALL market trends, competitor weaknesses, emotional opportunities, and SEO keyword gaps.

Respond in this EXACT format (plain text, no JSON):

[AUDIENCE_1_NAME]: <specific segment name>
[AUDIENCE_1_SEARCH_QUERIES]: (4-5 real example search queries, semicolon-separated)
[AUDIENCE_1_PRIMARY_EMOTION]: (1 dominant emotion with 2-sentence explanation)
[AUDIENCE_1_TRENDING_TOPICS]: (4 specific trending topics, semicolon-separated)
[AUDIENCE_1_COMPETITOR_GAPS]: (3 specific gaps, semicolon-separated)
[AUDIENCE_1_CONTENT_ANGLES]: (3 fresh content angles, semicolon-separated)
[AUDIENCE_1_CITY_DEMAND]: (which cities + why, 2-3 sentences)

[AUDIENCE_2_NAME]: ... (same fields)
[AUDIENCE_3_NAME]: ... (same fields)
[AUDIENCE_4_NAME]: ... (same fields, if applicable)
[AUDIENCE_5_NAME]: ... (same fields, if applicable)
[AUDIENCE_6_NAME]: ... (same fields, if applicable)

[TOP_CITIES]: (3-5 specific cities, comma-separated, with 1-line reason each)
[OVERALL_MARKET_TRENDS]: (3 macro trends, comma-separated)
[OVERALL_COMPETITOR_WEAKNESSES]: (3 universal weaknesses, comma-separated)
[OVERALL_EMOTIONAL_OPPORTUNITIES]: (3 emotional opportunities, comma-separated)
[OVERALL_SEO_GAPS]: (4 specific SEO keyword gaps, comma-separated)`;

  let marketResearchResult = "";
  try {
    console.log("  [Phase 1] Running broad market research via Groq...");
    marketResearchResult = await withRetry(() =>
      groqGenerate(researchSystemPrompt, researchUserPrompt, {
        model: "openai/gpt-oss-20b",
        temperature: 0.65,
        maxTokens: 2500,
        caller: "opportunity-research",
      })
    );
    console.log("  [Phase 1] ✅ Market research complete.");
  } catch (err) {
    console.error("Opportunity Agent — Phase 1 (broad research) failed:", err.message);
    throw new Error(`Opportunity Agent Phase 1 failed: ${err.message}`);
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 2: AI DISCOVERS audiences + cities (DYNAMIC — no hardcoded list)
  // ══════════════════════════════════════════════════════════════
  const discoverySystemPrompt = `You are a quantitative market segmentation engine. You receive qualitative market research and extract the SPECIFIC audience segments and cities it identifies.

CRITICAL RULES:
- Output ONLY valid JSON — no markdown, no prose, no code fences.
- Extract EXACTLY the audience segments named in the research (each [AUDIENCE_N_NAME]).
- Do NOT invent segments that are not in the research.
- Do NOT use generic labels — keep each segment's specific name from the research.`;

  const discoveryUserPrompt = `Extract the audience segments and target cities from this market research.

=== MARKET RESEARCH INTELLIGENCE ===
${marketResearchResult.substring(0, 6000)}

=== CONTENT HISTORY ===
${memorySummary.summary}

=== WEBSITE OFFERINGS (ground the segments in these real programs) ===
${websiteContextText.substring(0, 2000)}

=== HOME MARKET (MUST be a city candidate) ===
The brand's home market is Kolkata/Howrah (its buyer journey is Kolkata-specific). Include Kolkata among the discovered cities unless the research evidence explicitly says the demand is absent there.

Output EXACTLY this JSON structure (no extra text):
{
  "audienceCategories": [
    { "name": "exact segment name from research", "description": "1-sentence who they are", "primaryPain": "their #1 emotional pain", "searchQueries": ["q1","q2","q3"], "contentAngles": ["angle1","angle2"] }
  ],
  "cities": [
    { "city": "City Name", "reason": "1-sentence demand rationale from research" }
  ]
}`;

  let discovered = null;
  try {
    console.log("  [Phase 2] Discovering dynamic audience segments + cities via AI...");
    const rawDiscovery = await withRetry(() =>
      generateJSON(discoverySystemPrompt, discoveryUserPrompt, {
        model: "gemini-3.5-flash-lite",  // Phase-1 strategy — Gemini is correct here
        groqModel: "openai/gpt-oss-120b",
        temperature: 0.2,
        maxTokens: 1500,
        json: true,
      })
    );
    discovered = safeParseJSON(rawDiscovery);

    if (!discovered || !Array.isArray(discovered.audienceCategories) || !discovered.audienceCategories.length) {
      throw new Error("Audience discovery returned no audienceCategories");
    }
    if (!Array.isArray(discovered.cities) || !discovered.cities.length) {
      throw new Error("Audience discovery returned no cities");
    }

    // Keep 3-5 audiences + up to 5 cities
    discovered.audienceCategories = discovered.audienceCategories.slice(0, 5);
    discovered.cities = discovered.cities.slice(0, 5);

    // Home-market guarantee: Kolkata/Howrah is the brand's actual operating
    // region (per the buyer journey brief) — always keep it as a candidate so
    // the pipeline can never drift wholesale away from the real business.
    if (!discovered.cities.some(c => String(c.city || "").toLowerCase().includes("kolkata"))) {
      console.log("   ↳ Injecting Kolkata as home-market city candidate (buyer journey region).");
      discovered.cities.unshift({ city: "Kolkata", reason: "Home operating region (Kolkata/Howrah) per the buyer journey brief." });
      discovered.cities = discovered.cities.slice(0, 5);
    }

    console.log(`  [Phase 2] ✅ Discovered ${discovered.audienceCategories.length} audiences: ${discovered.audienceCategories.map(a => a.name).join(" | ")}`);
    console.log(`  [Phase 2] ✅ Discovered cities: ${discovered.cities.map(c => c.city).join(" | ")}`);
  } catch (err) {
    console.error("Opportunity Agent — Phase 2 (audience discovery) failed:", err.message);
    throw new Error(`Opportunity Agent Phase 2 (audience discovery) failed: ${err.message}`);
  }

  // Memory-based location rotation: prefer a city we haven't used recently,
  // but only among the AI-discovered ones (never inject a hardcoded city).
  const locationHistory = memoryData.locationHistory || [];
  const discoveredCityNames = discovered.cities.map(c => c.city.toLowerCase().trim());
  const unusedCities = discovered.cities.filter(c => !locationHistory.includes(c.city));
  const selectedCityObj = unusedCities.length
    ? unusedCities[0]
    : discovered.cities[0];
  const selectedLocation = selectedCityObj.city;

  // ══════════════════════════════════════════════════════════════
  // PHASE 3: AI SCORES the discovered audiences (7 dimensions)
  // ══════════════════════════════════════════════════════════════
  const scoreSystemPrompt = `You are a quantitative market scoring engine for content strategy decisions. You receive audience segments and transform them into precise, data-backed numerical scores.

CRITICAL RULES:
- Output ONLY valid JSON — no markdown, no prose, no code fences.
- All scores must be integers between 0 and 100.
- totalScore for each category = average of its 7 dimension scores.
- Your selectedCategory must be the one with the highest totalScore.
- Your reasoning must be specific and reference actual data from the research.`;

  const scoreUserPrompt = `Score these audience segments on 7 strategic dimensions.

=== AUDIENCE SEGMENTS ===
${JSON.stringify(discovered.audienceCategories, null, 2)}

=== MARKET RESEARCH INTELLIGENCE ===
${marketResearchResult.substring(0, 3500)}

=== TARGET CITY ===
${selectedLocation} — ${selectedCityObj.reason || ""}

=== CONTENT HISTORY (critical for scoring) ===
${memorySummary.summary}

=== SCORING INSTRUCTIONS ===
Score EACH audience segment on these 7 dimensions (0-100 each):
1. searchDemand — How intense is CURRENT search volume for this audience?
2. emotionalIntensity — How emotionally charged/urgent is this audience's pain RIGHT NOW?
3. competitorGaps — How poorly are existing competitors serving this audience?
4. seoOpportunity — How much untapped long-tail keyword potential exists?
5. trendGrowth — Is this audience's interest growing or declining?
6. locationDemand — How strong is ${selectedLocation}-specific demand for this audience?
7. previousSuccess — Based on content history, how much FRESH opportunity remains? (Recently-covered = 20-40, fresh = 65-85)

Output EXACTLY this JSON structure (no extra text):
{
  "categoryScores": [
    {
      "category": "<exact segment name>",
      "scores": { "searchDemand": 0, "emotionalIntensity": 0, "competitorGaps": 0, "seoOpportunity": 0, "trendGrowth": 0, "locationDemand": 0, "previousSuccess": 0 },
      "totalScore": 0,
      "reasoning": "2-3 sentence explanation citing specific data points",
      "keyInsights": ["insight 1", "insight 2"]
    }
  ],
  "selectedCategory": "THE WINNER",
  "selectionReasoning": "3-4 sentences explaining the selection",
  "runnerUpCategory": "2nd highest",
  "marketTrends": ["trend1", "trend2", "trend3"],
  "competitorWeaknesses": ["weakness1", "weakness2", "weakness3"],
  "emotionalOpportunities": ["opportunity1", "opportunity2", "opportunity3"],
  "seoGaps": ["gap1", "gap2", "gap3", "gap4"]
}`;

  let scoringResult = null;
  try {
    console.log("  [Phase 3] Running analytical scoring via AI...");
    const rawScoring = await withRetry(() =>
      generateJSON(scoreSystemPrompt, scoreUserPrompt, {
        model: "gemini-3.5-flash-lite",  // Phase-1 strategy — Gemini is correct here
        groqModel: "openai/gpt-oss-120b",
        temperature: 0.2,
        maxTokens: 2000,
        json: true,
      })
    );
    scoringResult = safeParseJSON(rawScoring);
    if (!scoringResult || !Array.isArray(scoringResult.categoryScores) || !scoringResult.categoryScores.length) {
      throw new Error("Scoring returned no categoryScores");
    }
    console.log("  [Phase 3] ✅ Analytical scoring complete.");
  } catch (err) {
    console.error("Opportunity Agent — Phase 3 (scoring) failed:", err.message);
    throw new Error(`Opportunity Agent Phase 3 (scoring) failed: ${err.message}`);
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 4: JS VALIDATION + SELECTION (math only, no hardcoded data)
  // ══════════════════════════════════════════════════════════════
  scoringResult.categoryScores.forEach(cs => {
    if (cs.scores && typeof cs.scores === "object") {
      const vals = Object.values(cs.scores).filter(v => typeof v === "number");
      if (vals.length > 0) {
        cs.totalScore = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
    }

    // Memory diversity penalty — encourages rotation across runs
    const usageCount = memorySummary.categoryFrequency[cs.category] || 0;
    if (usageCount > 0) {
      const penalty = usageCount * 15;
      cs.totalScore -= penalty;
      if (cs.reasoning) {
        cs.reasoning += ` [SYSTEM: Applied strict -${penalty} pt diversity penalty]`;
      }
    }
  });

  // Re-determine winner by computed totalScores
  const winner = scoringResult.categoryScores.reduce((best, cur) =>
    cur.totalScore > best.totalScore ? cur : best
  );
  scoringResult.selectedCategory = winner.category;
  if (!scoringResult.selectionReasoning) {
    scoringResult.selectionReasoning = winner.reasoning;
  }

  const winnerData = (scoringResult.categoryScores || []).find(
    c => c.category === scoringResult.selectedCategory
  ) || {};

  console.log(`  [Phase 4] ✅ Selected: "${scoringResult.selectedCategory}" | Location: ${selectedLocation}`);

  return {
    selectedCategory: scoringResult.selectedCategory,
    selectedLocation,
    categoryScores: scoringResult.categoryScores || [],
    selectionReasoning: scoringResult.selectionReasoning || "",
    runnerUpCategory: scoringResult.runnerUpCategory || "",
    winnerInsights: {
      keyInsights: winnerData.keyInsights || [],
      detailedScores: winnerData.scores || {},
    },
    marketTrends: scoringResult.marketTrends || [],
    competitorWeaknesses: scoringResult.competitorWeaknesses || [],
    emotionalOpportunities: scoringResult.emotionalOpportunities || [],
    seoGaps: scoringResult.seoGaps || [],
    discoveredAudiences: discovered.audienceCategories || [],
    discoveredCities: discovered.cities || [],
    broadMarketResearch: marketResearchResult.substring(0, 800),
    methodology: {
      approach: "4-Phase Dynamic Opportunity Intelligence",
      phases: [
        "Phase 1: Broad market research — Google/Quora/Reddit-style signals (Groq)",
        "Phase 2: AI audience + city DISCOVERY from live website data + research (Gemini)",
        "Phase 3: 7-dimension analytical scoring of discovered segments (Gemini)",
        "Phase 4: JS validation + memory diversity penalty + winner selection"
      ],
      models: ["Groq (research)", "Gemini 3.5 Flash Lite (discovery + scoring)"],
      scoringDimensions: [
        "Search Demand", "Emotional Intensity", "Competitor Gaps",
        "SEO Opportunity", "Trend Growth", "Location Demand", "Previous Success"
      ],
      diversityLogic: "previousSuccess dimension + JS penalty penalize over-saturated segments; cities rotate among AI-discovered ones by memory usage.",
      reasoning: `Discovered ${discovered.audienceCategories.length} audiences from live data, scored them, selected "${scoringResult.selectedCategory}" (${winnerData.totalScore || "N/A"}/100) for ${selectedLocation}.`
    }
  };
}

module.exports = opportunityAgent;
