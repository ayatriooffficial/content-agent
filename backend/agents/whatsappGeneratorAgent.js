const { generateBest } = require("./clients/providerRouter");
const safeParseJSON = require("./jsonParser/jsonParser");
const { journeyStagePrompt, programContextPrompt } = require("../data/buyerJourneyIntel");

function normalizeList(value, limit = 0) {
  const items = Array.isArray(value) ? value.filter(Boolean) : [];
  return limit > 0 ? items.slice(0, limit) : items;
}

function joinList(value, fallback = "") {
  const items = normalizeList(value);
  return items.length ? items.join("; ") : fallback;
}

/**
 * Deterministic keyword bolding for WhatsApp (*word* format).
 * Mirrors the email system's BOLD_KEYWORDS + word-boundary logic so
 * short keywords (EY, PwC, GST, TDS, Meta) don't false-match inside
 * words, and every bold is a clean single *keyword*.
 */
const BOLD_KEYWORDS = [
  "Charters Union of Business", "Charters Union", "Certified Business Accountant",
  "Digital Growth & Marketing", "Technology & Business Management",
  "CBA™", "DGM™", "TBM™", "AI Career Engine", "7 countries", "7 Countries",
  "100% In-Class Paid Internships", "in-class paid internships", "in-class paid internship",
  "SAP S/4HANA", "TallyPrime", "GST", "TDS", "GA4", "Meta", "Google Ads", "ROAS",
  "KPMG", "PwC", "EY", "Deloitte", "Saudi Aramco", "₹5,555", "₹16,000",
  "No-Cost EMI", "scholarship", "Scholarship", "success fee", "Success Fee",
  "97.7%", "92%", "98%", "95%", "placement rate", "Placement Rate",
  "26.5 LPA", "24.5 LPA", "38.5 LPA", "CTC", "salary jump", "Salary Jump",
  "3.05x", "3.05X", "KVS"
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function boldWhatsAppKeywords(text) {
  if (!text || typeof text !== "string") return "";

  // Split into segments: existing *bold* spans stay untouched; only the
  // plain-text segments get keyword bolding. This prevents re-bolding a
  // keyword that already sits inside a bolded heading/span.
  const segments = String(text).split(/(\*[^*]+\*)/g);
  const sorted = [...BOLD_KEYWORDS].sort((a, b) => b.length - a.length);

  const boldSegment = (seg) => {
    let out = seg;
    for (const kw of sorted) {
      const needsWordBoundary = kw.replace(/[^a-zA-Z0-9]/g, "").length <= 4;
      const escaped = escapeRegex(kw);
      // Don't match if the keyword is adjacent to (or inside) an existing
      // bold boundary on either side.
      const pattern = needsWordBoundary
        ? `(?<![\\w*])${escaped}(?![\\w*])`
        : `${escaped}`;
      const re = new RegExp(`(?<![\\w*])${pattern}(?![\\w*])`, "gi");
      out = out.replace(re, `*${kw}*`);
    }
    return out;
  };

  return segments.map((p) => (p.startsWith("*") && p.endsWith("*") ? p : boldSegment(p))).join("");
}

/**
 * Grammar guard: "in-class internship" is the correct idiomatic phrase.
 * The LLM occasionally writes "on-class" / "on class" — normalize it so
 * the typo never reaches the sheet or the phone.
 */
function normalizeGrammar(text) {
  if (!text || typeof text !== "string") return text;
  return String(text)
    .replace(/\bon[- ]class\b/gi, "in-class")
    .replace(/\bIn[- ]class\b/g, "In-class");
}

/**
 * STAGE-SPECIFIC COPYWRITING FRAMEWORK (buyer-journey grounded).
 * Each stage uses a proven direct-response formula + the journey file's
 * 7 counterparts (user action, touchpoints, emotional state, pain points,
 * opportunity, education environment, learning objective).
 */
function stageFramework(funnelStage, objective, slotKey) {
  const stage = funnelStage || "1_AWARENESS";
  const frameworks = {
    "1_AWARENESS": `STAGE: Awareness (${stage})
COPYWRITING FRAMEWORK: PAS — Problem → Agitate → (curiosity gap, NO solution yet)
- Open with the audience's exact problem in THEIR OWN WORDS (from Quora/Reddit/Google research below).
- Agitate: make the pain feel real and specific (family pressure, wasted years, salary shame).
- END with a curiosity gap that makes them want the answer. Do NOT reveal the solution or push enrollment.
- Tone: empathetic, educational, a mentor who "gets it".`,
    "2_ENGAGEMENT": `STAGE: Engagement (${stage})
COPYWRITING FRAMEWORK: Proof + Before/After (AIDA Interest/Desire)
- Open with a micro-hook tied to proof (a real number, a real outcome, a real recruiter).
- Show PROOF: placements, CTC, faculty, recruiters — from the LIVE website data only.
- Contrast BEFORE (stuck/confused) vs AFTER (placed/confident) in one tight line.
- INVITE A REPLY: end with a question that asks them to respond (e.g., "Want the breakdown?").
- Tone: credible, concrete, peer-to-peer.`,
    "3_CONVERSION": `STAGE: Conversion (${stage})
COPYWRITING FRAMEWORK: AIDA Desire/Action + honest urgency
- Open with a decisive, benefit-driven line (deadline, cohort, scholarship, seats).
- Remove friction: EMI, duration, application steps (from LIVE website data).
- Clear single CTA: apply / talk to a counselor / claim scholarship. Honest urgency — no fake scarcity.
- Tone: confident, direct, helpful — like a counselor closing a real conversation.`,
  };
  return `${frameworks[stage] || frameworks["1_AWARENESS"]}
OBJECTIVE (from calendar): ${objective || ""}
DIVERSITY: This is slot "${slotKey || "unknown"}" in a 6-message sequence per course. Your hook, opening, bullets, and structure MUST differ from every other slot. Never repeat a phrasing another slot already used.
\n=== BUYER JOURNEY STAGE CONTEXT ===
${journeyStagePrompt(stage)}`;
}

async function whatsappGeneratorAgent(blueprint, persona, research, competitor, blogResult, context = {}) {
  const blogTitle = blogResult?.title || blueprint.blogTitle || "";
  const course = context.course || blueprint.course || "CBA";
  const websiteDomain = process.env.NEXT_PUBLIC_SITE_URL || "https://chartersunion.com";
  const helplinePhone = "+91 9836465083";

  // Fetch LIVE website data so the message revolves around the real offers
  const { getWebsiteContext } = require("../services/websiteContext");
  const website = await getWebsiteContext(course);
  const websiteContextText = website?.context
    ? `\n=== LIVE WEBSITE DATA (Charters Union) — PRIMARY SOURCE OF TRUTH ===\n${website.context}\n`
    : "";

  const programBlock = context.programSpec ? programContextPrompt(course) : "";

  const systemPrompt = `You are a senior WhatsApp campaign strategist for CHARTERS UNION — an industry-led business education brand offering CBA™ (Certified Business Accountant), DGM™ (Digital Growth & Marketing), and TBM™ (Technology & Business Management).

You write the way top D2C education brands (upGrad, Great Learning, Masters' Union) do: human, specific, outcome-driven, never corporate-bland, never templated.

=== CHANNEL SEPARATION (MANDATORY) ===
Email already covers macro degree gaps, comparison tables, and formal scholarship essays.
You MUST NOT write about those email-owned topics.
You MUST write exclusively about WhatsApp's unique angle:
- Stage 1 (Awareness): 1:1 Tool diagnostic & career roadmap or day-in-the-life weekly routine (practical tool labs vs theoretical lectures from LIVE WEBSITE DATA).
- Stage 2 (Engagement): Single verified proof byte (placement metrics and named recruiters from LIVE WEBSITE DATA) or direct 1:1 practicing mentor access.
- Stage 3 (Conversion): Plain-language batch logistics (start dates, evening/weekend flexibility, and starting EMI from LIVE WEBSITE DATA) & Round 1 seat reservation.

${websiteContextText}
CRITICAL RULES:
- Output ONLY valid JSON. No markdown, no prose, no code fences.
- NO artificial quote blocks (>). Open directly with conversational counselor message.
- Keep the message concise, conversational, and mobile-friendly (under 110 words).
- Ground EVERY claim in the LIVE WEBSITE DATA above. NEVER invent programs, fees, stats, placements, or faculty.
- Use only real URLs: ${websiteDomain}, ${websiteDomain}/career-path, ${websiteDomain}/about, ${websiteDomain}/apply.
- Do NOT mention city/state names in the message body.
- The message MUST follow the stage framework below. NEVER mix stages.
- Write for the ${course} course ONLY: ${programBlock ? "use its program context (promise, objections, trust factors) for the topic; never reference the other course's concerns." : ""}`;

  const userPrompt = `Write ONE direct 1:1 WhatsApp campaign message for Charters Union promoting its real programs (CBA/DGM/TBM) to this specific audience.

${stageFramework(context.funnelStage, context.objective, context.slotKey)}

${programBlock}

=== STRATEGIC BLUEPRINT ===
Blog Title: ${blogTitle}
Emotional Hook: ${blueprint.emotionalHook || blueprint.emotionalTone || ""}
Emotional Angle: ${blueprint.emotionalAngle || ""}
Transformation: ${blueprint.transformationStory || blueprint.contentAngle || ""}
Trust Strategy: ${blueprint.trustBuildingStrategy || ""}
Primary CTA: ${blueprint.ctaStrategy || ""}
Target Keywords: ${joinList(blueprint.targetKeywords)}

=== AUDIENCE PSYCHOLOGY (from research) ===
Reader: ${persona.buyerPersona || "Accounting learner"}
Character Snapshot: ${persona.characterSnapshot || ""}
Identity Belief: ${persona.identityBelief || ""}
Hidden Fears: ${joinList(persona.hiddenFears)}
Fear of Inaction: ${joinList(persona.fearOfInaction)}
Live Situations: ${joinList(persona.liveSituations, 3)}
Emotional Triggers: ${joinList(persona.emotionalTriggers)}
Objections They Hold: ${joinList(persona.objectionsBeforePurchase?.exactObjections || persona.purchaseBarriers)}
Trust Factors They Need: ${joinList(persona.trustFactorsNeeded, 4)}
Messaging That Resonates: ${joinList(persona.messagingThatResonates, 3)}
Their Own Words (Quora/Reddit/Google voice): ${joinList(research.redditVoicePhrases)} ${joinList(research.aiSearchQueries)}
Buyer-Vs-User: ${persona.buyerVsUser?.dynamic || ""}
Transformation: "${persona.transformationGoal?.beforeState || ""}" → "${persona.transformationGoal?.afterState || ""}"

=== PROOF INTELLIGENCE (use only what's in LIVE WEBSITE DATA) ===
Trust Signals: ${joinList(research.trustSignals)}
Trending Topics: ${joinList(research.trendInsights)}

=== COMPETITOR GAPS ===
Emotional Gaps: ${joinList(competitor.emotionalGaps)}
Blind Spots: ${joinList(competitor.competitorBlindSpots)}

=== WHATSAPP CONTEXT ===
*** MANDATORY: APPROVED HOOK FROM ADMIN CALENDAR SELECTION ***
Approved Hook (YOU MUST BUILD THE COUNSELOR OPENING AND BULLETS AROUND THIS EXACT HOOK): "${context.suggestedHook || context.approvedHook || context.whatsappHook || blueprint.coreAngle || ""}"
${blogTitle ? `Related Blog Angle: "${blogTitle}"` : ""}

WHATSAPP FORMATTING RULES (MANDATORY):
- Use WhatsApp formatting syntax ONLY:
  - Bold: *text* (for headings, key concepts, numbers, and CTAs)
  - Italics: _text_ (for emphasis, questions, and tone)
  - Bullet List: • *Topic:* description

The "whatsappMessage" field MUST follow this exact 7-part visual layout (MANDATORY, in order):
1. INTRO: "*{NAME},*" — a warm personal greeting line (e.g. "Dear {NAME}," / "Hi {NAME},"). NOT just the bare name.
2. BODY: 2 concise conversational sentences addressing the topic directly (NO quote block >).
3. PROBLEM HEADING: a standalone bold section heading naming the exact pain (e.g. "*The Real Corporate Gap:*" / "*Why applications get rejected:*"). Dynamic per slot — NEVER write "Problem is this" or "Solution is this".
4. POINTS HEADING: a standalone bold section heading introducing the key points below (e.g. "*Session Focus:*" / "*What's included:*"). Dynamic per slot.
5. KEY POINTS: 2-3 bullets, each starting with "• *Topic:* Real practical detail" from LIVE WEBSITE DATA. Each bullet MUST pack a REAL number/fact (fees, placement %, CTC, salary jump, tools, recruiters, faculty, student name) — short but dense, ≤ 20 words each, covering: the core problem, the real fix, and a proof point.
6. SOLUTION: introduced by a bold heading followed by 1-2 tight lines naming how Charters Union fixes this specific concern (grounded in LIVE WEBSITE DATA — tools, internships, placements, financing). The solution heading MUST be dynamic and vary per slot — NEVER repeat the same one across slots. Stage-appropriate examples:
   - Awareness: "*How Charters Union closes this gap:*" / "*Where the fix starts:*" / "*What actually changes:*"
   - Engagement: "*How our students bridge this:*" / "*The proof it works:*" / "*What placements look like:*"
   - Conversion: "*How the numbers work for you:*" / "*How you can start:*" / "*Your next step, de-risked:*"
   Never write a bare "Solution is..." — always a bold heading first.
7. FOOTER: single-line:
*Visit:* ${websiteDomain} | *Apply:* ${websiteDomain}/apply | *Call:* ${helplinePhone}

Output EXACTLY this JSON structure:
{
  "audienceSegment": "string",
  "headline": "string (the punchy headline)",
  "intro": "string (warm personal greeting with {NAME})",
  "counselorOpening": "string (conversational body, 2 sentences, no quote box)",
  "problemHeading": "string (standalone bold section heading naming the exact pain, e.g. '*The Real Corporate Gap:*')",
  "pointsHeading": "string (standalone bold section heading above the bullets, e.g. '*Session Focus:*')",
  "bulletPoints": ["• *Topic:* Real practical detail", "• *Topic:* Real practical detail"],
  "solutionHeading": "string (standalone bold heading before the solution, DYNAMIC per slot — e.g. '*How Charters Union closes this gap:*' / '*The proof it works:*' / '*How you can start:*'. NEVER the same heading across slots)",
  "solution": "string (1-2 lines naming Charters Union's concrete fix, grounded in LIVE WEBSITE DATA)",
  "closingQuestion": "string (the closing question or prompt)",
  "whatsappMessage": "the FULL 7-part structured WhatsApp message: intro, body, problemHeading, pointsHeading, bullets, solutionHeading, solution, closing CTA, and single-line footer — in that exact order",
  "summary": "2 sentence summary of the WhatsApp strategy",
  "tone": "string",
  "wordCount": 75,
  "ctaText": "string",
  "ctaUrlPath": "string",
  "metadata": {
    "blogTitle": "string",
    "targetKeywords": ["keyword 1", "keyword 2"],
    "competitorBlindSpots": ["gap 1", "gap 2"]
  }
}`;

  let raw = "";
  try {
    console.log(`  [WhatsApp Generator Agent] Generating campaign copy for slot ${context.slotKey || "?"} (stage: ${context.funnelStage || "?"})...`);
    raw = await generateBest(systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens: 1024,
      json: true,
      caller: `WhatsApp slot ${context.slotKey || "?"}`,
      // Priority chain: Gemini (instant 2s, 1M context) → Groq → NVIDIA → OpenRouter
      order: ["Gemini-3.5-Flash-Lite", "Gemini-3.1-Flash-Lite", "Groq", "NVIDIA", "OpenRouter"],
      groqModel: "openai/gpt-oss-120b",
      nvidiaModel: "minimaxai/minimax-m3",
      openRouterModel: "google/gemma-4-31b-it:free",
    });
    console.log(`  [WhatsApp Generator Agent] ✅ Raw output received for slot ${context.slotKey || "?"} (${raw.split(" ").length} tokens) — parsing JSON...`);
  } catch (err) {
    console.error(`  [WhatsApp Generator Agent] ❌ ALL providers failed for slot ${context.slotKey || "?"}: ${err.message}`);
    // NO hardcoded fallback — surface failure so the slot is marked GENERATION FAILED
    throw new Error(`WhatsApp content generation failed: ${err.message}`);
  }

  const parsed = safeParseJSON(raw);
  if (!parsed || !parsed.headline || !Array.isArray(parsed.bulletPoints)) {
    console.error(`  [WhatsApp Generator Agent] ❌ Invalid JSON from winning provider for slot ${context.slotKey || "?"}. Raw head:`, raw.slice(0, 300));
    throw new Error("WhatsApp content generation failed: invalid JSON from all providers");
  }

  console.log(`  [WhatsApp Generator Agent] ✅ Valid JSON parsed for slot ${context.slotKey || "?"} — headline: "${parsed.headline?.slice(0, 60)}"`);

  // Deterministic keyword bolding + grammar guard on the final message.
  const finalMessage = boldWhatsAppKeywords(normalizeGrammar(parsed.whatsappMessage || ""));

  return {
    campaignType: parsed.campaignType || context.campaignType || "blog_promotion",
    audienceSegment: parsed.audienceSegment || context.audienceCategory || persona.buyerPersona || "Accounting audience",
    headline: parsed.headline,
    opening: parsed.opening || "",
    body: parsed.body || "",
    intro: parsed.intro || "",
    problemHeading: parsed.problemHeading || "",
    pointsHeading: parsed.pointsHeading || "",
    solutionHeading: parsed.solutionHeading || "",
    solution: parsed.solution || "",
    bulletPoints: normalizeList(parsed.bulletPoints, 3),
    ctaText: parsed.ctaText || context.ctaText || "Read the full article",
    ctaUrlPath: parsed.ctaUrlPath || context.ctaUrlPath || "/blogs",
    ctaReasoning: parsed.ctaReasoning || "",
    closing: parsed.closing || "",
    whatsappMessage: finalMessage,
    summary: parsed.summary || blogResult?.summary || blueprint.contentDirection || "",
    tone: parsed.tone || "clear and conversational",
    wordCount: parseInt(parsed.wordCount, 10) || 60,
    metadata: {
      blogTitle: parsed.metadata?.blogTitle || blogTitle || blueprint.blogTitle || "",
      targetKeywords: normalizeList(parsed.metadata?.targetKeywords || blueprint.targetKeywords, 5),
      competitorBlindSpots: normalizeList(parsed.metadata?.competitorBlindSpots || competitor.competitorBlindSpots, 3),
    },
    methodology: {
      approach: "WhatsApp Strategy Synthesis (Multi-Provider, Buyer-Journey Enforced)",
      reasoning: "Converted the blueprint into a stage-specific WhatsApp campaign using PAS/AIDA frameworks, persona research voice, and live website proof.",
      inputs: ["Blueprint", "Persona", "Research", "Competitor Analysis", "Live Website Data", "Funnel Stage"],
    }
  };
}

module.exports = whatsappGeneratorAgent;
module.exports.boldWhatsAppKeywords = boldWhatsAppKeywords;
module.exports.normalizeGrammar = normalizeGrammar;
