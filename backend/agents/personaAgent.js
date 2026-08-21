/**
 * Persona Agent — STEP 3 of the autonomous pipeline.
 *
 * Uses: Groq (Primary), Gemini (Primary via generateJSON), + LLM fallback
 *
 * Enriches static persona templates with the company's buyer-journey brief
 * (A–Z psychological structure):
 * - Location intelligence (Kolkata/Lucknow)
 * - Current market trends
 * - Competitor messaging context
 * - Deep psychological pain points (fear of inaction, affordability,
 *   objections, trust factors, messaging resonance, offer positioning)
 *
 * Enriched output keeps every legacy field name (buyerPersona, identityBelief,
 * hiddenFears, liveSituations, emotionalTriggers ...) so downstream agents
 * keep working, and ADDS the A–Z core sections.
 */
const { groqGenerate } = require("./clients/groqClient");
const { geminiGenerate } = require("./clients/geminiClient");
const { buyerPersonaBriefBlock } = require("../data/buyerJourneyIntel");

const safeParseJSON = require("./jsonParser/jsonParser");

// Home-grown stringify for prompt blocks (keeps token budget tight)
function compact(value, limit = 600) {
  if (value === undefined || value === null) return "";
  try {
    const s = typeof value === "string" ? value : JSON.stringify(value);
    return s.length > limit ? s.slice(0, limit) + "…" : s;
  } catch (err) {
    return String(value).slice(0, limit);
  }
}

async function personaAgent(templates, businessContext, locationContext = {}, marketResearch = "", programSpec = {}) {
  const targetLocation = locationContext.city || businessContext.targetLocation || "Kolkata";
  const baseTemplate = templates[0] || {};

  const program = programSpec || {};
  const programCode = program.code || businessContext.program || "CBA";

  // Slim persona brief — the A-Z psychology rules + funnel context
  const journeyBlock = buyerPersonaBriefBlock();

  // Foundation example: prefer a richer "example persona" attached to the
  // template (e.g. RIYA_SEN_PERSONA wired via the loader) so the model has
  // a concrete quality bar, never invents shallow personas from scratch.
  const foundationExample = (baseTemplate.foundationExample || "").trim();

  const systemPrompt = `You are a world-class consumer psychologist, behavioral scientist, and EdTech conversion strategist specializing in the Indian education sector (Kolkata/Howrah market). You create "living" personas that capture the deepest psychological truths of students and professionals. Your work is data-driven but emotionally profound.

CRITICAL RULES (from the company's buyer persona brief):
- Unique human-written personas, NOT generic. Never write shallow points like "wants success", "uses social media", or "faces challenges".
- Reflect true local context: middle-class family pressure, employability anxiety, pressure to become financially independent, weak spoken-English confidence, fear of wasting time after graduation, confusion between degree and job-readiness, affordability concerns, parent influence on purchase, trust issues around placement promises.
- Show hidden psychology: clearly distinguish (1) the problem they THINK they have, (2) the problem they ACTUALLY have, (3) the emotional fear underneath, (4) the transformation they really want.
- Focus on conversion, not theory: why they buy, why they hesitate, what message converts them, what promise attracts them, what proof they need, what content makes them trust, what keeps them interested but not buying.
- Output ONLY valid JSON. No markdown, no prose, no code fences.
- All array fields must be actual JSON arrays of strings.
- The persona must be immediately actionable for marketers, sales teams, and founders.`;

  const userPrompt = `Enrich the following persona template with deep location-specific intelligence, current market trends, and the company's buyer journey brief for ${targetLocation}.

=== BUYER JOURNEY INTELLIGENCE ===
${journeyBlock}

=== PROGRAM CONTEXT ===
Program: ${programCode} — ${program.label || baseTemplate.label || ""}
Core Promise: ${program.corePromise || ""}
Course Objections: ${compact(program.commonObjections, 400)}
Course Trust Factors: ${compact(program.trustFactors, 400)}

=== BROAD MARKET INTELLIGENCE ===
${marketResearch ? marketResearch : "No recent market data available. Rely on template."}

=== BASE TEMPLATE (Psychological Foundation) ===
Category: ${baseTemplate.audienceCategory}
Identity Belief: ${baseTemplate.psychologyLayer?.identityBelief || "Not defined"}
Hidden Fears: ${(baseTemplate.painArchitecture?.hiddenFears || []).join("; ") || "Not defined"}
Pain Points: ${baseTemplate.psychologyLayer?.emotionalFrustration || "Not defined"}
Live Situations: ${(baseTemplate.painArchitecture?.liveDailyLifeSituations || []).join("; ") || "Not defined"}
Voice of Customer: ${compact(baseTemplate.voiceOfCustomer, 400)}
Transformation Goal: Before: "${baseTemplate.transformationGoal?.beforeState || ""}" → After: "${baseTemplate.transformationGoal?.afterState || ""}"
${foundationExample ? `\n=== EXAMPLE QUALITY BAR (shape your persona like this, same depth) ===\n${foundationExample}` : ""}

=== BUSINESS CONTEXT ===
Target Location: ${targetLocation}
Education Goal: ${businessContext.educationBackground || "Commerce"}
Primary Struggle: ${businessContext.biggestProblem || "No practical exposure"}

ENRICHMENT RULES:
1. FOUNDATION FIRST: Your primary source of truth is the BASE TEMPLATE and the BUYER JOURNEY INTELLIGENCE.
2. LOCATION AS A LENS: Apply the Target Location (${targetLocation}) as a "lens". Adapt their environment to match the local economy and job market.
3. PAIN POINT DEPTH: Dive deep into the TEMPLATE pains. Explain their emotional toll in ${targetLocation}.
4. CHARACTER SNAPSHOT: Make them feel alive, describing their daily grind and specific anxieties.
5. HIDDEN PSYCHOLOGY: For each reason below, separate what they think their problem is from what it actually is, then the fear underneath, then the transformation they want.
6. CONVERSION-FIRST: Every section should help ads, landing pages, counselor scripts, and remarketing convert this person.

Output EXACTLY this JSON structure (no extra text):
{
  "buyerPersona": "A punchy name/label for this enriched persona (e.g., 'Anxious B.Com Fresher in Kolkata')",
  "characterSnapshot": "4-5 sentences that make them feel alive in the target location, describing their daily grind",
  "personaIdentity": { "name": "string", "age": "string", "educationLevel": "string", "currentCareerStatus": "string", "location": "string", "familyBackground": "string", "financialBackground": "string", "oneLineSummary": "string" },
  "buyerVsUser": { "user": "who actually uses the product", "economicApprover": "parent/sibling/self", "dynamic": "how the decision really happens", "implication": "what sales/marketing must do" },
  "psychographics": { "desperatelyWant": "string", "values": "string", "aspiresTo": "string", "frustratesThem": "string", "givesThemHope": "string", "howTheySeeSuccess": "string", "whatScaresThem": "string", "compareAgainst": "string", "transformationSeek": "string", "whyNotAchievedYet": "string" },
  "identityBelief": "2 deep-seated beliefs that drive their behavior",
  "deepPainAnalysis": "4-5 sentences analyzing the emotional toll of their pain points in the local context",
  "problemTheyThinkTheyHave": "string",
  "problemTheyActuallyHave": "string",
  "emotionalFearUnderneath": "string",
  "locationAnxiety": "3 specific fears unique to the local job market (e.g., specific local companies or colleges)",
  "hiddenFears": ["fear 1", "fear 2", "fear 3", "fear 4", "fear 5"],
  "liveSituations": ["situation 1", "situation 2", "situation 3", "situation 4", "situation 5"],
  "emotionalTriggers": ["trigger 1", "trigger 2", "trigger 3", "trigger 4", "trigger 5"],
  "fearOfInaction": ["what happens if they do NOTHING — unemployment, stagnation, AI disruption", "fear 1", "fear 2"],
  "affordabilityConcerns": ["how they think about the ₹50,000 fee — EMI? family approval? investment vs risk?"],
  "purchaseBarriers": ["barrier 1", "barrier 2", "barrier 3"],
  "objectionsBeforePurchase": { "exactObjections": ["objection 1", "objection 2", "objection 3"], "triggerEvents": "what makes them look NOW", "evaluationCriteria": "how they compare options" },
  "trustFactorsNeeded": ["placement proof", "demo class", "parent assurance", "google reviews"],
  "motivationsForBuying": ["motivation 1", "motivation 2"],
  "contentConsumptionHabits": { "platforms": ["YouTube", "Instagram", "WhatsApp", "Telegram", "LinkedIn", "Google"], "formatsTrusted": ["format 1", "format 2"], "attentionSpan": "string" },
  "urgentTriggers": ["graduation approaching", "friend got placed", "family pressure"],
  "searchIntentKeywords": { "google": ["keyword 1", "keyword 2"], "aiQueries": ["AI query 1", "AI query 2"], "theirOwnWords": ["phrase 1", "phrase 2"] },
  "messagingThatResonates": ["message 1", "message 2", "message 3"],
  "bestMarketingAngles": ["angle 1", "angle 2"],
  "offerPositioning": "The single strongest promise for this persona",
  "transformationGoal": { "beforeState": "string", "afterState": "string", "emotionalGoal": "string" },
  "voiceOfCustomer": { "definingQuote": "string", "commonPhrases": ["phrase 1", "phrase 2", "phrase 3"] }
}`;

  let resultJSON = null;
  let lastError = null;

  // ═══════════════════════════════════════════════════════════════
  // ATTEMPT 1: Gemini 3.1 Flash Lite — primary. Best JSON compliance in
  // the pipeline, large free quota (15 RPM / 250K TPM / 500 RPD), native
  // responseMimeType JSON mode, no 8k TPM wall like Groq.
  // ═══════════════════════════════════════════════════════════════
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log(`  [Persona Agent] Generating persona via Gemini 3.1 Flash Lite (program: ${programCode})...`);
      const rawResult = await geminiGenerate(systemPrompt, userPrompt, {
        model: "gemini-3.1-flash-lite",
        temperature: 0.7,
        maxTokens: 4000,
        json: true,
      });
      resultJSON = safeParseJSON(rawResult);
      if (resultJSON && resultJSON.buyerPersona) {
        console.log(`  [Persona Agent] ✅ Persona generated via Gemini 3.1 Flash Lite (${programCode})`);
      } else {
        throw new Error("Invalid or missing JSON fields from Gemini");
      }
    } catch (err) {
      lastError = err;
      console.warn(`  [Persona Agent] Gemini attempt failed: ${err.message} — trying Gemma 4 31B...`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ATTEMPT 2: Gemma 4 31B via the Gemini API key — same quota pool,
  // 16K TPM headroom. It's a reasoning model, so its thinking lands as
  // leading text — safeParseJSON already strips everything before the
  // first balanced JSON object.
  // ═══════════════════════════════════════════════════════════════
  if (!resultJSON && process.env.GEMINI_API_KEY) {
    try {
      console.log(`  [Persona Agent] Generating persona via Gemma 4 31B (program: ${programCode})...`);
      const rawResult = await geminiGenerate(systemPrompt, userPrompt, {
        model: "gemma-4-31b-it",
        temperature: 0.7,
        maxTokens: 4000,
        json: true,
      });
      resultJSON = safeParseJSON(rawResult);
      if (resultJSON && resultJSON.buyerPersona) {
        console.log(`  [Persona Agent] ✅ Persona generated via Gemma 4 31B (${programCode})`);
      } else {
        throw new Error("Invalid or missing JSON fields from Gemma");
      }
    } catch (err) {
      lastError = err;
      console.warn(`  [Persona Agent] Gemma attempt failed: ${err.message} — trying Groq...`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ATTEMPT 3: Groq gpt-oss-120b — trimmed input + output budget so the
  // request stays under Groq's 8k TPM limit (413-safe). Last LLM resort.
  // ═══════════════════════════════════════════════════════════════
  for (let attempt = 1; !resultJSON && attempt <= 2; attempt++) {
    try {
      console.log(`  [Persona Agent] Generating persona via Groq (Attempt ${attempt})... (program: ${programCode})`);
      const rawResult = await groqGenerate(systemPrompt, userPrompt, {
        model: "openai/gpt-oss-120b",
        temperature: 0.7,
        maxTokens: 2000, // fits within Groq's 8k TPM — trimmed input + 2k output
        json: true
      });

      resultJSON = safeParseJSON(rawResult);
      if (resultJSON && resultJSON.buyerPersona) {
        break; // Successfully parsed
      } else {
        throw new Error("Invalid or missing JSON fields");
      }
    } catch (err) {
      lastError = err;
      console.warn(`  [Persona Agent] Groq attempt ${attempt} failed: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FALLBACK: static mapping if all providers fail completely
  // ═══════════════════════════════════════════════════════════════
  if (!resultJSON) {
    console.warn(`  [Persona Agent] All providers failed (${lastError?.message || "unknown"}) — using static template fallback.`);
    resultJSON = {
          buyerPersona: `${baseTemplate.audienceCategory} in ${targetLocation}`,
          characterSnapshot: `A typical ${baseTemplate.audienceCategory} navigating the ${programCode} job market in ${targetLocation}. They face immense pressure to secure a stable career.`,
          personaIdentity: { name: baseTemplate.characterSnapshot?.name || "", age: String(baseTemplate.characterSnapshot?.age || ""), educationLevel: baseTemplate.lifeSituation?.education || "", currentCareerStatus: baseTemplate.audienceCategory, location: targetLocation, familyBackground: baseTemplate.lifeSituation?.familyPressure || "", financialBackground: baseTemplate.lifeSituation?.financialCondition || "", oneLineSummary: baseTemplate.characterSnapshot?.identityHeadline || "" },
          buyerVsUser: { user: "The student (attends classes, uses the skills)", economicApprover: "Parents (primary approver)", dynamic: "Student researches, but the fee requires family approval; student brings a parent to counselling.", implication: "Market to the student emotionally, arm them with a rational ROI case for parents." },
          psychographics: { desperatelyWant: "A real career and financial independence", values: "Stability, respect, family pride", aspiresTo: "A corporate job they can be proud of", frustratesThem: "Theory-heavy education with no practical skills", givesThemHope: "Seeing peers with practical skills get hired", howTheySeeSuccess: "Placed in a known company with a real salary", whatScaresThem: "Unemployment, wasting family money, falling behind peers", compareAgainst: "Classmates with internships/placements", transformationSeek: "From uncertain student to placed professional", whyNotAchievedYet: "No practical experience, weak confidence, no guidance" },
          identityBelief: baseTemplate.psychologyLayer?.identityBelief || "I must secure a safe job to make my family proud.",
          deepPainAnalysis: "They struggle with a massive gap between theoretical knowledge and practical employer expectations.",
          problemTheyThinkTheyHave: "I need a course and maybe better English.",
          problemTheyActuallyHave: "Lack of career-conversion capability: practical exposure, confidence signaling, interview communication, professional identity.",
          emotionalFearUnderneath: "Fear of wasting time after graduation and losing family trust.",
          locationAnxiety: `High competition for limited corporate roles in ${targetLocation}.`,
          hiddenFears: baseTemplate.painArchitecture?.hiddenFears || ["Fear of unemployment", "Fear of falling behind peers"],
          liveSituations: baseTemplate.painArchitecture?.liveDailyLifeSituations || ["Comparing themselves on LinkedIn", "Getting rejected after interviews"],
          emotionalTriggers: ["Salary increment promises", "Guaranteed interview calls", "Practical software skills"],
          fearOfInaction: ["Remain unemployed", "Low salary for years", "Career stagnation", "AI job disruption", "Financial dependency"],
          affordabilityConcerns: ["₹50,000 feels big for the family", "Possible with EMI", "Needs family approval", "Seen as investment if ROI is clear"],
          purchaseBarriers: baseTemplate.buyingBehavior?.purchaseBlockers || ["Fear of wasting money", "Parent approval", "Trust in placement promises"],
          objectionsBeforePurchase: { exactObjections: ["Will this really get me a job?", "Is placement support genuine?", "Is it worth ₹50,000?"], triggerEvents: "Graduation approaching, seeing peers get placed", evaluationCriteria: "Placement proof, practical curriculum, salary outcomes, cost" },
          trustFactorsNeeded: baseTemplate.trustArchitecture?.proofRequired ? [baseTemplate.trustArchitecture.proofRequired] : ["Placement proof", "Demo class", "Google reviews"],
          motivationsForBuying: ["Placement guarantee", "Salary-focused messaging", "EMI options"],
          contentConsumptionHabits: { platforms: baseTemplate.contentConsumptionHabits?.platformBehavior || ["YouTube", "Instagram", "LinkedIn"], formatsTrusted: baseTemplate.contentConsumptionHabits?.formatsTrusted ? [baseTemplate.contentConsumptionHabits.formatsTrusted] : ["Short videos", "Step-by-step guides"], attentionSpan: "Short — reels and scrolling" },
          urgentTriggers: baseTemplate.buyingBehavior?.urgencyTriggers || ["Graduation approaching", "Friend got placed", "Family pressure"],
          searchIntentKeywords: { google: baseTemplate.searchArchitecture?.googleSearch || [], aiQueries: baseTemplate.searchArchitecture?.aiSearchQueries || [], theirOwnWords: baseTemplate.voiceOfCustomer?.commonPhrases || [] },
          messagingThatResonates: ["Your degree is the start, not the finish", "Practical skills that employers actually want"],
          bestMarketingAngles: ["Degree-to-career bridge", "Placement-led transformation"],
          offerPositioning: `A complete, practical ${programCode} career program that makes the audience job-ready in the target location.`,
          transformationGoal: { beforeState: baseTemplate.transformationGoal?.beforeState || "Confused, no practical skills", afterState: baseTemplate.transformationGoal?.afterState || "Industry-ready professional with interviews and offers", emotionalGoal: baseTemplate.transformationGoal?.emotionalGoal || "Make parents proud and feel financially independent" },
          voiceOfCustomer: { definingQuote: baseTemplate.voiceOfCustomer?.definingQuote || "", commonPhrases: baseTemplate.voiceOfCustomer?.commonPhrases || [] }
        };
  }

  return {
    buyerPersona: resultJSON.buyerPersona,
    characterSnapshot: resultJSON.characterSnapshot || "",
    personaIdentity: resultJSON.personaIdentity || {},
    buyerVsUser: resultJSON.buyerVsUser || {},
    psychographics: resultJSON.psychographics || {},
    identityBelief: resultJSON.identityBelief,
    painPointAnalysis: resultJSON.deepPainAnalysis,
    problemTheyThinkTheyHave: resultJSON.problemTheyThinkTheyHave || "",
    problemTheyActuallyHave: resultJSON.problemTheyActuallyHave || "",
    emotionalFearUnderneath: resultJSON.emotionalFearUnderneath || "",
    locationAnxiety: resultJSON.locationAnxiety,
    hiddenFears: Array.isArray(resultJSON.hiddenFears) ? resultJSON.hiddenFears : [],
    liveSituations: Array.isArray(resultJSON.liveSituations) ? resultJSON.liveSituations : [],
    emotionalTriggers: Array.isArray(resultJSON.emotionalTriggers) ? resultJSON.emotionalTriggers : [],
    fearOfInaction: Array.isArray(resultJSON.fearOfInaction) ? resultJSON.fearOfInaction : [],
    affordabilityConcerns: Array.isArray(resultJSON.affordabilityConcerns) ? resultJSON.affordabilityConcerns : [],
    purchaseBarriers: Array.isArray(resultJSON.purchaseBarriers) ? resultJSON.purchaseBarriers : [],
    objectionsBeforePurchase: resultJSON.objectionsBeforePurchase || {},
    trustFactorsNeeded: Array.isArray(resultJSON.trustFactorsNeeded) ? resultJSON.trustFactorsNeeded : [],
    motivationsForBuying: Array.isArray(resultJSON.motivationsForBuying) ? resultJSON.motivationsForBuying : [],
    contentConsumptionHabits: resultJSON.contentConsumptionHabits || {},
    urgentTriggers: Array.isArray(resultJSON.urgentTriggers) ? resultJSON.urgentTriggers : [],
    searchIntentKeywords: resultJSON.searchIntentKeywords || {},
    messagingThatResonates: Array.isArray(resultJSON.messagingThatResonates) ? resultJSON.messagingThatResonates : [],
    bestMarketingAngles: Array.isArray(resultJSON.bestMarketingAngles) ? resultJSON.bestMarketingAngles : [],
    offerPositioning: resultJSON.offerPositioning || "",
    transformationGoal: resultJSON.transformationGoal || {},
    voiceOfCustomer: resultJSON.voiceOfCustomer || {},
    // Comprehensive template data (unchanged legacy envelope)
    fullPsychology: baseTemplate.psychologyLayer || {},
    fullPainArchitecture: baseTemplate.painArchitecture || {},
    lifeSituation: baseTemplate.lifeSituation || {},
    buyingBehavior: baseTemplate.buyingBehavior || {},
    program: programCode,
    methodology: {
      approach: "Psychological Persona Enrichment (A-Z buyer journey, JSON enforced)",
      model: "Gemini 3.1 Flash Lite (primary) → Gemma 4 31B → Groq gpt-oss-120b",
      reasoning: `Enriched the base template with the buyer-journey brief, deep localized context for ${targetLocation}, and the ${programCode} program specs using Opportunity Market Intelligence. Built a living profile that drives high-conversion content.`
    }
  };
}

module.exports = personaAgent;