/**
 * OPPORTUNITY ANALYSIS AGENT — STEP 0 of the autonomous pipeline.
 * 
 * Runs every 15 days. Analyzes market demand across all 3 audience categories,
 * scoring each on 7 dimensions to select the highest-opportunity audience.
 * 
 * Uses: Gemini (broad understanding) + DeepSeek R1 (analytical scoring)
 * 
 * Scoring Dimensions:
 * 1. Search Demand (current search volume signals)
 * 2. Emotional Intensity (how emotionally charged the audience is)
 * 3. Competitor Gaps (where competitors are weakest)
 * 4. SEO Opportunity (untapped keyword potential)
 * 5. Trend Growth (growing vs declining interest)
 * 6. Location-Specific Demand (Kolkata/Lucknow specific)
 * 7. Previous Success Patterns (from memory)
 */
const { groqGenerate } = require("./clients/groqClient");
const { getLocationByCity } = require("../config/locations");
const { getCompetitorContext } = require("../config/competitors");
const { memoryAgent } = require("./memoryAgent");
const safeParseJSON = require("./jsonParser/jsonParser");

const AUDIENCE_CATEGORIES = [
  "12th Pass Commerce Student",
  "College-Level Student",
  "Working Professional"
];

const LOCATIONS = ["Kolkata", "Lucknow"];

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
// HELPER: Intelligently pick the location least used recently
// ═══════════════════════════════════════════════════════════════
function selectSmartLocation(memoryData) {
  const locationHistory = memoryData.locationHistory || [];

  // Count how many times each location was used
  const usageCounts = LOCATIONS.reduce((acc, loc) => {
    acc[loc] = locationHistory.filter(l => l === loc).length;
    return acc;
  }, {});

  // Pick the location with lowest usage count (rotate fairly)
  const sorted = [...LOCATIONS].sort((a, b) => usageCounts[a] - usageCounts[b]);
  return sorted[0];
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

  // Count category frequency to detect over-saturation
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
// MAIN: Opportunity Agent
// ═══════════════════════════════════════════════════════════════
async function opportunityAgent() {
  const competitorContext = getCompetitorContext();

  // Get memory for historical patterns
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

  // 1. SMART LOCATION SELECTION
  // We do this FIRST so the LLM analysis is deeply targeted to this city
  const selectedLocation = selectSmartLocation(memoryData);
  const locObj = getLocationByCity(selectedLocation);
  
  const locationContext = `
CITY: ${locObj.city}, ${locObj.state} (${locObj.tier})
Economy: ${locObj.economicProfile}
Education: ${locObj.educationHub}
Key Industries: ${locObj.keyIndustries.join(", ")}
Accounting Demand: ${locObj.accountingDemand}
Student Pain Points: ${locObj.studentPainPoints.join("; ")}
Local Search Behavior: ${locObj.searchBehavior.join("; ")}
`;

  // ══════════════════════════════════════════════════════════════
  // PHASE 1: GEMINI — Broad Market Understanding
  // Deep qualitative analysis of all 3 audience categories.
  // Focus: current search behavior, emotional pain points, market trends.
  // ══════════════════════════════════════════════════════════════
  const geminiSystemPrompt = `You are a senior market intelligence analyst specializing in the Indian Accounting & Finance Education sector. You perform deep qualitative research using signals from Google Trends, LinkedIn, Reddit, YouTube comments, college forums, job boards (Naukri, LinkedIn), and accounting Facebook groups.

Your goal: produce rich, specific, and actionable market intelligence — not generic observations. Every insight must be grounded in the real psychological and economic realities of Indian accounting students and professionals in Tier-2 cities like ${selectedLocation}.

Think like a researcher who spends time reading actual Reddit posts, YouTube comments, and LinkedIn complaints from Indian commerce students and accounting professionals.`;

  const geminiUserPrompt = `Perform a comprehensive market opportunity analysis for Indian accounting education content across THREE audience categories.

=== AUDIENCE CATEGORIES TO ANALYZE ===
1. 12TH PASS COMMERCE STUDENTS — Completed Class 12 (Commerce stream), age 17-19. Career confused, limited budget, influenced by parents/relatives, scared of "wrong" career choices. Currently deciding between B.Com, BBA, CA Foundation, or direct accounting courses.
2. COLLEGE-LEVEL STUDENTS (B.Com/BBA) — Age 19-23, have degree or pursuing it but realize they have ZERO practical skills. Terrified of interviews. Comparing themselves to engineering/MBA peers.
3. WORKING PROFESSIONALS — Age 23-35, stuck in low-paying accounting/data-entry jobs (₹12,000-₹20,000/month). Know they need upskilling but lack time, money, and direction. Anxious about job security.

=== TARGET LOCATION CONTEXT: ${selectedLocation.toUpperCase()} ===
${locationContext}

=== COMPETITOR LANDSCAPE ===
${competitorContext}

=== CONTENT HISTORY (use this to recommend FRESH angles) ===
${memorySummary.summary}

=== YOUR RESEARCH TASK ===
For EACH of the 3 audience categories, provide SPECIFIC and DEEP analysis tightly focused on ${selectedLocation}:

1. CURRENT SEARCH BEHAVIOR — What exact queries are they typing on Google RIGHT NOW in ${selectedLocation}? (e.g., "accounting course fees in ${selectedLocation} after 12th", "Tally job salary for freshers"). Give 4-5 real example queries.

2. EMOTIONAL PAIN LANDSCAPE — What is their PRIMARY emotional pain right now? Is it fear of unemployment, family pressure, comparison with peers, job rejection, salary shame? Be specific and vivid.

3. TRENDING TOPICS (current context) — What accounting/finance topics are trending for this audience? Think: GST e-invoicing updates, AI replacing accounting jobs, new CA exam pattern, Tally Prime vs Tally ERP, Income Tax portal issues, etc.

4. COMPETITOR CONTENT GAPS — Where are existing competitors (like Institute of Accounts, Tally Academy, EduBridge, etc.) failing this audience emotionally and practically?

5. CONTENT ANGLE OPPORTUNITIES — What 2-3 specific content angles would resonate deeply with this audience RIGHT NOW that competitors are NOT covering?

6. LOCATION DEMAND SIGNALS — What are the specific ${selectedLocation} demand signals for this audience? (e.g., job market conditions, local college placements, regional employer trends based on the provided location context)

Respond in this EXACT format:

[BEGIN_ANALYSIS]
CATEGORY_1_NAME: 12th Pass Commerce Student
CATEGORY_1_SEARCH_QUERIES: (4-5 real example search queries, semicolon-separated)
CATEGORY_1_PRIMARY_EMOTION: (1 dominant emotion with 2-sentence explanation)
CATEGORY_1_TRENDING_TOPICS: (4 specific trending topics, semicolon-separated)
CATEGORY_1_COMPETITOR_GAPS: (3 specific gaps, semicolon-separated)
CATEGORY_1_CONTENT_ANGLES: (3 fresh content angles, semicolon-separated)
CATEGORY_1_LOCATION_DEMAND: (${selectedLocation} specific signals, 2-3 sentences)

CATEGORY_2_NAME: College-Level Student
CATEGORY_2_SEARCH_QUERIES: (4-5 real example search queries, semicolon-separated)
CATEGORY_2_PRIMARY_EMOTION: (1 dominant emotion with 2-sentence explanation)
CATEGORY_2_TRENDING_TOPICS: (4 specific trending topics, semicolon-separated)
CATEGORY_2_COMPETITOR_GAPS: (3 specific gaps, semicolon-separated)
CATEGORY_2_CONTENT_ANGLES: (3 fresh content angles, semicolon-separated)
CATEGORY_2_LOCATION_DEMAND: (${selectedLocation} specific signals, 2-3 sentences)

CATEGORY_3_NAME: Working Professional
CATEGORY_3_SEARCH_QUERIES: (4-5 real example search queries, semicolon-separated)
CATEGORY_3_PRIMARY_EMOTION: (1 dominant emotion with 2-sentence explanation)
CATEGORY_3_TRENDING_TOPICS: (4 specific trending topics, semicolon-separated)
CATEGORY_3_COMPETITOR_GAPS: (3 specific gaps, semicolon-separated)
CATEGORY_3_CONTENT_ANGLES: (3 fresh content angles, semicolon-separated)
CATEGORY_3_LOCATION_DEMAND: (Kolkata/Lucknow specific signals, 2-3 sentences)

OVERALL_MARKET_TRENDS: (3 macro trends affecting all 3 categories, comma-separated)
OVERALL_COMPETITOR_WEAKNESSES: (3 universal competitor weaknesses across the sector, comma-separated)
OVERALL_EMOTIONAL_OPPORTUNITIES: (3 emotional content opportunities that cut across all audiences, comma-separated)
OVERALL_SEO_GAPS: (4 specific SEO keyword gaps competitors are missing, comma-separated)

[END_ANALYSIS]`;

  let marketResearchResult = "";
  try {
    console.log("  [Phase 1] Running broad market research via Groq...");
    marketResearchResult = await withRetry(() =>
      groqGenerate(geminiSystemPrompt, geminiUserPrompt, {
        model: "openai/gpt-oss-20b",
        temperature: 0.65,
        maxTokens: 2500  // Text is truncated to 3500 chars in Phase 2 anyway
      })
    );
    console.log("  [Phase 1] ✅ Market research complete.");
  } catch (err) {
    console.error("Opportunity Agent — Groq Phase 1 (broad research) failed:", err.message);
    marketResearchResult = "Market research unavailable due to API error.";
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 2: DEEPSEEK R1 — Analytical Scoring
  // Takes Phase 1 qualitative research and scores each category
  // on 7 dimensions. Outputs clean JSON with scores + reasoning.
  // ══════════════════════════════════════════════════════════════
  const deepseekSystemPrompt = `You are a quantitative market scoring engine for content strategy decisions. You receive qualitative market research and transform it into precise, data-backed numerical scores.

CRITICAL RULES:
- Output ONLY valid JSON — no markdown, no prose, no code fences.
- All scores must be integers between 0 and 100.
- totalScore for each category = average of its 7 dimension scores (you calculate this).
- Your selectedCategory must be the one with the highest totalScore.
- Your reasoning must be specific and reference actual data from the research provided.`;

  const deepseekUserPrompt = `You received the following market research on 3 Indian accounting education audience categories. Score each one on 7 strategic dimensions for the target location: ${selectedLocation.toUpperCase()}.

=== MARKET RESEARCH INTELLIGENCE ===
${marketResearchResult.substring(0, 3500)}

=== CONTENT HISTORY (critical for scoring) ===
${memorySummary.summary}

=== SCORING INSTRUCTIONS ===
Score each of the 3 audience categories on these 7 dimensions (0-100 each):

1. searchDemand — How intense is CURRENT search volume for this audience? (High active searching = high score)
2. emotionalIntensity — How emotionally charged/urgent is this audience's pain RIGHT NOW? (Desperate, time-sensitive pain = high score)
3. competitorGaps — How poorly are existing competitors serving this audience emotionally and practically? (Big gaps = high score)
4. seoOpportunity — How much untapped long-tail keyword potential exists for this audience? (Underserved queries = high score)
5. trendGrowth — Is this audience's interest growing or declining? (Strong growth = high score)
6. locationDemand — How strong is ${selectedLocation} specific demand for this audience? (Strong regional pull = high score)
7. previousSuccess — Based on content history, how much FRESH opportunity remains for this audience? (Categories NOT recently covered heavily = high score. If heavily saturated in history, score lower to encourage diversity.)

IMPORTANT GUIDANCE FOR previousSuccess:
- If a category appears frequently in "categories used recently" → score it 20-40 (encourage rotation)
- If a category was NOT used recently → score it 65-85 (fresh opportunity)

Output this exact JSON structure (no extra text):
{
  "categoryScores": [
    {
      "category": "12th Pass Commerce Student",
      "scores": {
        "searchDemand": 0,
        "emotionalIntensity": 0,
        "competitorGaps": 0,
        "seoOpportunity": 0,
        "trendGrowth": 0,
        "locationDemand": 0,
        "previousSuccess": 0
      },
      "totalScore": 0,
      "reasoning": "2-3 sentence explanation citing specific data points from the research",
      "keyInsights": ["specific insight 1", "specific insight 2"]
    },
    {
      "category": "College-Level Student",
      "scores": { "searchDemand": 0, "emotionalIntensity": 0, "competitorGaps": 0, "seoOpportunity": 0, "trendGrowth": 0, "locationDemand": 0, "previousSuccess": 0 },
      "totalScore": 0,
      "reasoning": "2-3 sentence explanation",
      "keyInsights": ["insight 1", "insight 2"]
    },
    {
      "category": "Working Professional",
      "scores": { "searchDemand": 0, "emotionalIntensity": 0, "competitorGaps": 0, "seoOpportunity": 0, "trendGrowth": 0, "locationDemand": 0, "previousSuccess": 0 },
      "totalScore": 0,
      "reasoning": "2-3 sentence explanation",
      "keyInsights": ["insight 1", "insight 2"]
    }
  ],
  "selectedCategory": "THE WINNER (category with highest totalScore)",
  "selectionReasoning": "3-4 sentences explaining the selection — reference specific scores and market signals from the research",
  "runnerUpCategory": "2nd highest scoring category",
  "marketTrends": ["trend1", "trend2", "trend3"],
  "competitorWeaknesses": ["weakness1", "weakness2", "weakness3"],
  "emotionalOpportunities": ["opportunity1", "opportunity2", "opportunity3"],
  "seoGaps": ["gap1", "gap2", "gap3", "gap4"]
}`;

  let scoringResult = null;
  try {
    console.log("  [Phase 2] Running analytical scoring via Groq...");
    const rawScoring = await withRetry(() =>
      groqGenerate(deepseekSystemPrompt, deepseekUserPrompt, {
        model: "openai/gpt-oss-120b",
        temperature: 0.2,
        maxTokens: 1500  // Scoring JSON is ~600 tokens
      })
    );

    scoringResult = safeParseJSON(rawScoring);

    if (!scoringResult || !scoringResult.categoryScores) {
      throw new Error("JSON parsed but missing required 'categoryScores' field.");
    }

    console.log("  [Phase 2] ✅ Analytical scoring complete.");
  } catch (err) {
    console.error("Opportunity Agent — Groq Phase 2 (analytical scoring) failed:", err.message);
    scoringResult = null;
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 3: SCORE VALIDATION + SMART SELECTION
  // Validates and normalizes scores. Applies memory-based
  // diversity logic. Selects winner and target location.
  // ══════════════════════════════════════════════════════════════

  // If scoring completely failed — use intelligent rotation fallback
  if (!scoringResult) {
    console.warn("  [Phase 3] Scoring failed — using intelligent rotation fallback.");
    const { categoryFrequency } = memorySummary;

    // Pick the least-used category
    const fallbackCategory = AUDIENCE_CATEGORIES.reduce((leastUsed, cat) => {
      const count = categoryFrequency[cat] || 0;
      return count < (categoryFrequency[leastUsed] || 0) ? cat : leastUsed;
    }, AUDIENCE_CATEGORIES[0]);

    scoringResult = {
      categoryScores: AUDIENCE_CATEGORIES.map((cat) => {
        const recentUsageCount = categoryFrequency[cat] || 0;
        const diversityBonus = cat === fallbackCategory ? 25 : 0;
        const baseScore = Math.max(30, 60 - recentUsageCount * 10) + diversityBonus;
        return {
          category: cat,
          scores: {
            searchDemand: 60,
            emotionalIntensity: 65,
            competitorGaps: 55,
            seoOpportunity: 58,
            trendGrowth: 55,
            locationDemand: 60,
            previousSuccess: cat === fallbackCategory ? 75 : Math.max(25, 55 - recentUsageCount * 10)
          },
          totalScore: baseScore,
          reasoning: `Fallback scoring — Groq API unavailable. Score based on content diversity rotation. ${cat} used ${recentUsageCount} time(s) recently.`,
          keyInsights: ["Career anxiety and practical roadmap", "Interview preparation and skill gap"]
        };
      }),
      selectedCategory: fallbackCategory,
      selectionReasoning: `Fallback: rotating to "${fallbackCategory}" as it has the lowest recent usage (${categoryFrequency[fallbackCategory] || 0} times) to maintain content diversity across all 3 audience categories.`,
      runnerUpCategory: AUDIENCE_CATEGORIES.find(c => c !== fallbackCategory) || AUDIENCE_CATEGORIES[1],
      marketTrends: ["Practical accounting skills demand rising", "GST and Tally Prime upskilling surge", "AI anxiety driving professional upskilling"],
      competitorWeaknesses: ["Generic, emotionless content", "No location-specific context", "Theory-heavy with zero practical guidance"],
      emotionalOpportunities: ["Career anxiety and peer comparison content", "Salary shame and transformation stories", "Interview confidence building"],
      seoGaps: [`location-specific accounting courses in ${selectedLocation}`, "practical tally training for job", "accounting salary increment tips", "GST course for working professionals"]
    };
  }

  // Recalculate all totalScores from their dimension scores (in case LLM got math wrong)
  if (scoringResult.categoryScores && Array.isArray(scoringResult.categoryScores)) {
    scoringResult.categoryScores.forEach(cs => {
      if (cs.scores && typeof cs.scores === "object") {
        const vals = Object.values(cs.scores).filter(v => typeof v === "number");
        if (vals.length > 0) {
          cs.totalScore = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        }
      }
      
      // 🚨 STRICT JAVASCRIPT PENALTY (Overrides LLM Bias)
      // The LLM often favors "12th Pass" heavily on market metrics.
      // This mathematically guarantees rotation by slashing the final score.
      const usageCount = memorySummary.categoryFrequency[cs.category] || 0;
      if (usageCount > 0) {
         // Deduct 15 points per recent use
         const penalty = usageCount * 15;
         cs.totalScore -= penalty; 
         if (cs.reasoning) {
            cs.reasoning += ` [SYSTEM: Applied strict -${penalty} pt diversity penalty]`;
         }
      }
    });

    // Re-determine winner based on computed totalScores
    const winner = scoringResult.categoryScores.reduce((best, cur) =>
      cur.totalScore > best.totalScore ? cur : best
    );
    scoringResult.selectedCategory = winner.category;
    if (!scoringResult.selectionReasoning) {
      scoringResult.selectionReasoning = winner.reasoning;
    }
  }

  // Extract the winning category's enriched data
  const winnerData = (scoringResult.categoryScores || []).find(
    c => c.category === scoringResult.selectedCategory
  ) || {};

  console.log(`  [Phase 3] ✅ Selected: "${scoringResult.selectedCategory}" | Location: ${selectedLocation}`);

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
    // Truncated raw research for downstream agents (persona, research)
    broadMarketResearch: marketResearchResult.substring(0, 800),
    methodology: {
      approach: "3-Phase Opportunity Intelligence",
      phases: [
        "Phase 1: Broad market research — qualitative audience pain analysis",
        "Phase 2: Analytical scoring — 7-dimension numerical scoring with diversity logic",
        "Phase 3: Smart selection — memory-based validation and location rotation"
      ],
      models: ["Groq (Llama 3.3 70B)"],
      scoringDimensions: [
        "Search Demand", "Emotional Intensity", "Competitor Gaps",
        "SEO Opportunity", "Trend Growth", "Location Demand", "Previous Success"
      ],
      diversityLogic: "previousSuccess dimension penalizes over-saturated categories to ensure audience rotation across pipeline runs.",
      reasoning: `Selected "${scoringResult.selectedCategory}" with score ${winnerData.totalScore || "N/A"}/100. Location "${selectedLocation}" chosen via fair-rotation algorithm based on content history.`
    }
  };
}

module.exports = opportunityAgent;

