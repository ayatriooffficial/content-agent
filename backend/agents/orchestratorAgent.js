const { generateJSON } = require("./clients/generateJSON");
const safeParseJSON = require("./jsonParser/jsonParser");
const { buyerJourneyPromptBlock } = require("../data/buyerJourneyIntel");

/**
 * Orchestrator Agent — STEP 4 of the autonomous pipeline. The Central Brain.
 * Combines persona insights, research data, competitor analysis, and memory history
 * with location intelligence to decide: final strategy, emotional angle, and content direction.
 */
async function orchestratorAgent(persona, research, competitor, memory, domainResult) {
  const targetLocation = persona.targetLocation || research.targetLocation || "India";

  // Fetch LIVE website data so the blueprint revolves around the real offers
  const { getWebsiteContext } = require("../services/websiteContext");
  const website = await getWebsiteContext();
  const websiteContextText = website?.context
    ? `\n=== LIVE WEBSITE DATA (Charters Union) — USE THIS AS THE PRIMARY SOURCE OF TRUTH ===\n${website.context}\n`
    : "";

  const prompt = `You are the Chief Content Strategist for CHARTES UNION OF BUSINESS — an industry-led business education brand offering CBA™ (Certified Business Accountant), DGM™ (Digital Growth & Marketing), and TBM™ (Technology & Business Management) programs.
${websiteContextText}
=== BUYER JOURNEY INTELLIGENCE ===
${buyerJourneyPromptBlock()}
=== DOMAIN POSITIONING ===
Industry: ${domainResult.industry}
Domain: ${domainResult.domain}
Niche: ${domainResult.niche}
Target Audience: ${domainResult.audienceType}
Audience Category: ${domainResult.audienceCategory}
Target Location: ${targetLocation}

=== PERSONA INTELLIGENCE ===
Reader: ${persona.buyerPersona}
Character Snapshot: ${persona.characterSnapshot || ""}
Identity Belief: ${persona.identityBelief}
Hidden Fears: ${Array.isArray(persona.hiddenFears) ? persona.hiddenFears.join("; ") : (persona.hiddenFears || "")}
Fear of Inaction: ${Array.isArray(persona.fearOfInaction) ? persona.fearOfInaction.join("; ") : ""}
Live Situations: ${Array.isArray(persona.liveSituations) ? persona.liveSituations.slice(0, 3).join("; ") : (persona.liveSituations || "")}
Emotional Triggers: ${Array.isArray(persona.emotionalTriggers) ? persona.emotionalTriggers.join(", ") : (persona.emotionalTriggers || "")}
Objections: ${Array.isArray(persona.objectionsBeforePurchase?.exactObjections) ? persona.objectionsBeforePurchase.exactObjections.slice(0, 5).join("; ") : ""}
Trust Factors: ${Array.isArray(persona.trustFactorsNeeded) ? persona.trustFactorsNeeded.slice(0, 5).join("; ") : ""}
Best Marketing Angles: ${Array.isArray(persona.bestMarketingAngles) ? persona.bestMarketingAngles.slice(0, 3).join("; ") : ""}
Offer Positioning: ${persona.offerPositioning || ""}
Buyer-vs-User: ${persona.buyerVsUser?.dynamic || ""}
Transformation: From "${persona.transformationGoal?.beforeState || persona.beforeState}" to "${persona.transformationGoal?.afterState || persona.afterState}"

=== RESEARCH INTELLIGENCE ===
Emotional Search Drivers: ${(research.emotionalSearchPatterns || []).join(", ")}
AI Search Queries: ${(research.aiSearchQueries || []).join(", ")}
Trust Signals: ${(research.trustSignals || []).join(", ")}
Trending: ${(research.trendInsights || []).join(", ")}
Location Search Patterns: ${(research.locationSearchPatterns || []).join(", ")}
Career Anxieties: ${(research.careerAnxietyPatterns || []).join(", ")}
SEO Gaps: ${(research.seoGaps || []).join(", ")}

=== COMPETITOR INTELLIGENCE ===
Emotional Gaps: ${(competitor.emotionalGaps || []).join(", ")}
Trust Gaps: ${(competitor.trustGaps || []).join(", ")}
Blind Spots: ${(competitor.competitorBlindSpots || []).join(", ")}
SEO Gaps: ${(competitor.seoGaps || []).join(", ")}
Strategy: ${competitor.strategyNotes}

=== MEMORY CONTEXT ===
Previous Blogs: ${memory.totalBlogsGenerated || 0}
Avoid Repeating: ${(memory.previousTitles || []).slice(-5).join(", ")}
Successful Strategies: ${(memory.emotionalStrategies || []).slice(-3).join(", ")}

=== YOUR TASK ===
Synthesize ALL intelligence above into a content blueprint. The content must:
1. Revolve around the LIVE WEBSITE DATA — the real Charters Union programs (CBA/DGM/TBM), their fees, durations, placements, faculty, and testimonials. Do NOT invent programs or stats.
2. Address the specific persona's emotional reality in ${targetLocation}
3. Exploit competitor blind spots and SEO gaps
4. Answer the search queries they're actually asking
5. Build trust using the signals they need
6. NOT repeat any previous titles
7. Target localized SEO keywords
8. Follow the BUYER JOURNEY's psychological transformation pipeline: from "confused/lost/scared" to "trusts the institute, sees a clear path, ready to invest" — the blueprint must move the reader along that arc.
9. Position the offer using the persona's offer positioning and best marketing angles, and align the emotional angle with the buyer journey messaging pillars.

CRITICAL RULES:
- Output ONLY valid JSON. No markdown, no prose, no code fences.
- All array fields must be actual JSON arrays of strings.
- The "category" field must be one of: BUSINESS, MARKETING, TECHNOLOGY, CAREER, ACCOUNTING, FINANCE

Output EXACTLY this JSON structure (no extra text):
{
  "blogTitle": "emotionally specific title for target accounting audience",
  "emotionalHook": "opening hook that validates their specific pain",
  "emotionalAngle": "the primary emotional strategy for this content",
  "transformationStory": "the journey from their current pain to their desired success",
  "trustBuildingStrategy": "how to build authority for this specific audience",
  "sectionsToCover": ["section H2 1", "section H2 2", "section H2 3", "section H2 4"],
  "persuasionCta": "emotionally obvious next step for this audience",
  "positioningStrategy": "how to win against competitors in this niche",
  "targetKeywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4"],
  "category": "ACCOUNTING",
  "wordCount": 1200,
  "contentDirection": "1-2 sentences on overall content strategy and reasoning"
}`;

  const fallbackResult = {
    blogTitle: `The ${domainResult.audienceCategory}'s Guide to Breaking Into Accounting in ${targetLocation}`,
    emotionalTone: `Connecting with the specific frustrations of ${domainResult.audienceType} in ${targetLocation}.`,
    emotionalHook: `Connecting with the specific frustrations of ${domainResult.audienceType} in ${targetLocation}.`,
    emotionalAngle: "Empathy + practical roadmap",
    transformationStory: `From ${persona.beforeState || "confusion"} to ${persona.afterState || "confidence"}.`,
    trustBuildingStrategy: "Real student stories, practical curriculum proof, salary data.",
    sectionsToCover: ["The Real Problem Nobody Talks About", "What Actually Works", "The Step-by-Step Path", "From Theory to Job Offer"],
    ctaStrategy: "Start your practical accounting journey today.",
    rankingStrategy: "Position against theory-heavy competitors with practical, emotional content.",
    category: "ACCOUNTING",
    targetKeywords: research.keywords || [`accounting course ${targetLocation}`, "practical accounting", "commerce career"],
    wordCount: 1200,
    contentAngle: "Practical transformation with emotional depth.",
    contentDirection: `Psychology-driven practical accounting content for ${targetLocation}.`,
    targetLocation,
    methodology: {
      approach: "Multi-Intelligence Synthesis (Fallback)",
      inputs: ["Persona Psychology", "Research Data", "Competitor Analysis", "Memory History", "Location Intelligence"],
      reasoning: "Combined 5 intelligence sources to determine optimal content strategy.",
      decisions: {
        emotionalAngle: "Empathy-first approach based on persona's hidden fears",
        rankingApproach: "Exploit competitor blind spots in emotional connection",
        contentDirection: "Practical transformation storytelling",
        locationFocus: targetLocation
      }
    }
  };

  let resultJSON = null;
  
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`  [Orchestrator Agent] Extracting JSON blueprint (Attempt ${attempt})...`);
      const rawResult = await generateJSON(
        `You are a strategic content brain for Charters Union of Business — the CBA/DGM/TBM education brand. You combine the LIVE website data (programs, fees, placements, faculty, testimonials), psychology, research, competitor gaps, and memory into a precise content blueprint. Every decision must be data-driven and grounded in the actual website offers. Output STRICT JSON only.`,
        prompt,
        { model: "gemini-3.5-flash-lite", groqModel: "openai/gpt-oss-120b", temperature: 0.6, maxTokens: 1200, json: true }  // Blueprint JSON is ~500 tokens
      );
      
      resultJSON = safeParseJSON(rawResult);
      if (resultJSON && resultJSON.blogTitle && Array.isArray(resultJSON.targetKeywords)) {
        break; // Successfully parsed
      } else {
        throw new Error("Invalid or missing JSON fields");
      }
    } catch (err) {
      console.warn(`  [Orchestrator Agent] JSON Extraction failed on attempt ${attempt}: ${err.message}`);
      if (attempt === 2) {
        return fallbackResult;
      }
    }
  }

  // Enforce Category logic
  const validCategories = ["ACCOUNTING", "FINANCE"];
  let finalCategory = (resultJSON.category || "ACCOUNTING").toUpperCase().split(" ")[0];
  if (!validCategories.includes(finalCategory)) {
    finalCategory = "ACCOUNTING";
  }

  return {
    blogTitle: resultJSON.blogTitle || fallbackResult.blogTitle,
    emotionalTone: resultJSON.emotionalHook || "",
    emotionalHook: resultJSON.emotionalHook || "",
    emotionalAngle: resultJSON.emotionalAngle || "",
    transformationStory: resultJSON.transformationStory || "",
    trustBuildingStrategy: resultJSON.trustBuildingStrategy || "",
    sectionsToCover: Array.isArray(resultJSON.sectionsToCover) ? resultJSON.sectionsToCover : fallbackResult.sectionsToCover,
    ctaStrategy: resultJSON.persuasionCta || "",
    rankingStrategy: resultJSON.positioningStrategy || "",
    targetKeywords: Array.isArray(resultJSON.targetKeywords) ? resultJSON.targetKeywords : fallbackResult.targetKeywords,
    category: finalCategory,
    wordCount: parseInt(resultJSON.wordCount) || 1200,
    contentAngle: resultJSON.transformationStory || "",
    contentDirection: resultJSON.contentDirection || "",
    targetLocation,
    methodology: {
      approach: "Multi-Intelligence Synthesis Engine",
      inputs: ["Deep Persona Psychology", "Dual-Model Research", "7-Framework Competitor Analysis", "Self-Learning Memory", "Location Intelligence"],
      reasoning: `Synthesized ${domainResult.audienceCategory} persona insights with research data, competitor gaps, and localized context. Avoided ${(memory.previousTitles || []).length} previously generated titles using Llama 3.3 Intelligence (JSON Enforced).`,
      decisions: {
        emotionalAngle: resultJSON.emotionalAngle || "",
        rankingApproach: resultJSON.positioningStrategy || "",
        contentDirection: resultJSON.contentDirection || ""
      }
    }
  };
}

module.exports = orchestratorAgent;
