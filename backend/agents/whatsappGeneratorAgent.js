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

  // Split into segments: existing *bold* spans, *_bold+italic_* spans, and
  // * *_`Keyword`:_* subheading units stay untouched — only the plain-text
  // segments get keyword bolding. This prevents re-bolding a keyword that
  // already sits inside a heading or subheading (nested stars break WhatsApp).
  // Note: "* " (bullet star + space) must NOT count as a bold span — a bold
  // span never has a space right after its opening star.
  const segments = String(text).split(/(\*[^*\s][^*]*\*)/g);
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

  const isProtectedSpan = (p) => {
    const t = String(p || "");
    return (t.startsWith("*") && t.endsWith("*")) || (t.startsWith("*_") && t.endsWith("_*"));
  };

  let result = segments.map((p) => (isProtectedSpan(p) ? p : boldSegment(p))).join("");

  // Cleanup pass: collapse "**A*, *B**" artifacts from adjacent bolded keywords
  // into clean single "*A* / *B*" spans.
  result = result.replace(/\*\*([^*]+?)\*/g, "*$1").replace(/\*([^*]+?)\*\*/g, "*$1*");

  return result;
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
COPYWRITING FRAMEWORK: PAS — Problem → Agitate → (curiosity gap, NO solution reveal, NO enrollment push)
- Open with the audience's exact problem in THEIR OWN WORDS (from Quora/Reddit/Google research below).
- Agitate: make the pain feel real and specific (family pressure, wasted years, salary shame).
- PLANT THE PRODUCT: include ONE tight line that names the Charters Union program for this course (e.g. the CBA™ or DGM™ program) and the specific gap it exists to close — so the lead knows WHO is talking to them, without any sales pitch. This line comes after the pain, before the points heading.
- END with a curiosity gap that makes them want the answer. Do NOT reveal the solution, fees, or push enrollment.
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
- NEVER write a real person's name anywhere except the INTRO greeting line which uses the {NAME} placeholder. The BODY must never contain any person's name (no "Anirban,", no "Suman", no student names, no faculty names as a greeting). Use "you" / "your" instead.
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
  - ONLY single-star bold, like *bold* (one asterisk on each side). NO underscore italics, NO backtick monospace, NO combined asterisk+underscore. Plain bold only.
  - Section headings use plain bold ending with a colon, like *Heading Text:*. NEVER use underscores inside or around the heading.
  - Bullet lines use plain bold for the keyword only, like * *Topic Keyword* :* short detail. That is: one star + space, bold keyword, space + colon, space, plain detail. NEVER use backticks, NEVER use underscores.
  - Bold important keywords EVERYWHERE — in the intro, the bullets, the solution, and the closing question. Let the context guide you: tools, numbers/stats, outcomes, program names (CBA™/DGM™/TBM™ with full forms), recruiters, USPs. The reader should see bolded key phrases in EVERY section — never a long stretch of plain text.
  - Use the FULL course form somewhere in the body when first naming the program, e.g. "*CBA™ (Certified Business Accountant)*", "*DGM™ (Digital Growth & Marketing)*", "*TBM™ (Technology & Business Management)*". The acronym alone is not enough for a reader who doesn't know it.
- These are STRUCTURE patterns — the actual heading words and bullet keywords MUST be chosen fresh per slot from the LIVE WEBSITE DATA. NEVER copy a heading or keyword from this prompt into the output.
- The body carries the story. The bullets carry facts. Bullets NEVER carry the story — each bullet states a single, short, factual point.

The "whatsappMessage" field MUST follow this exact 6-part visual layout (MANDATORY, in order). There is exactly ONE heading before the bullets and ONE heading before the solution — NEVER stack two headings back-to-back:
1. INTRO: "*{NAME},*" — a warm personal greeting line (e.g. "Dear {NAME}," / "Hi {NAME},"). NOT just the bare name.
2. BODY: 100–110 characters total (about 1-2 short lines on mobile) — HARD LIMIT, never longer. Opens with a hook AND weaves the pain/concern directly INTO the sentences. Include ONE product-planting line that names the program with its FULL FORM (e.g. "*CBA™ (Certified Business Accountant)*"). Bold 1-2 key phrases inside the body. NO separate pain heading before or inside the body.
3. POINTS HEADING: ONE standalone *Heading Text:* (plain bold, ending with colon). Dynamic per slot — NEVER repeat the same heading across slots, NEVER write "Problem is this". Choose the heading from the LIVE WEBSITE DATA topic for this slot.
4. KEY POINTS: EXACTLY 3 bullets — each * *Topic Keyword* :* short detail (plain bold keyword, no backticks, no underscores). Each bullet is ≤ 50 characters, ONE short factual point, NO storytelling. Each bullet MUST pack a REAL number/fact from the LIVE WEBSITE DATA (fees, placement %, CTC, salary jump, tools, recruiters, faculty, student name). Use whatever numbers/facts are in the LIVE WEBSITE DATA — do NOT reuse the same ones across slots.
5. SOLUTION: *Heading Text:* (plain bold, signals an ANSWER) followed by EXACTLY 3 bullets — same format as the points. Each bullet ≤ 50 characters, ONE short factual point, NO storytelling. Names ONE concrete way Charters Union solves the pain (curriculum, tools, internships, placements, financing, mentorship), grounded in LIVE WEBSITE DATA. Choose DIFFERENT proof points per slot so no two slots repeat the same facts. The solution heading MUST clearly signal an ANSWER/SOLUTION — it must NOT sound like a problem, gap, or neutral statement.
6. FOOTER: single-line:
*Visit:* ${websiteDomain} | *Apply:* ${websiteDomain}/apply | *Call:* ${helplinePhone}

Output EXACTLY this JSON structure:
{
  "audienceSegment": "string",
  "headline": "string (the punchy headline)",
  "intro": "string (warm personal greeting with {NAME})",
  "counselorOpening": "string (conversational body, 100-110 chars max, hook + pain woven INTO the sentences, product-planting line with full course form, 1-2 bolded phrases, plain *bold* only — no italic, no code, no nested stars)",
  "pointsHeading": "string (ONE standalone *Heading Text:* plain bold heading above the bullets, ending with colon, chosen to match this slot's LIVE WEBSITE DATA topic)",
  "bulletPoints": ["* *Topic Keyword* :* short fact from LIVE WEBSITE DATA", "* *Topic Keyword* :* short fact from LIVE WEBSITE DATA", "* *Topic Keyword* :* short fact from LIVE WEBSITE DATA"],
  "solutionHeading": "string (standalone *Heading Text:* plain bold heading, DYNAMIC per slot — NEVER the same heading across slots, must signal an ANSWER/SOLUTION)",
  "solutionPoints": ["* *Topic Keyword* :* fix detail", "* *Topic Keyword* :* fix detail", "* *Topic Keyword* :* fix detail"],
  "closingQuestion": "string (the closing question or prompt)",
  "whatsappMessage": "the FULL 6-part structured WhatsApp message: intro, body, pointsHeading, bullets, solutionHeading, solutionPoints (bulleted), closing CTA, and single-line footer — in that exact order. Awareness messages include ONE product-planting line naming the program after the body.",
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
    pointsHeading: parsed.pointsHeading || "",
    solutionHeading: parsed.solutionHeading || "",
    solution: Array.isArray(parsed.solutionPoints) ? parsed.solutionPoints.join("\n") : (parsed.solution || ""),
    solutionPoints: normalizeList(parsed.solutionPoints, 3),
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
