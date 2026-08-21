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

  // Fetch LIVE website data so the message revolves around the real offers
  const { getWebsiteContext } = require("../services/websiteContext");
  const website = await getWebsiteContext();
  const websiteContextText = website?.context
    ? `\n=== LIVE WEBSITE DATA (Charters Union) — PRIMARY SOURCE OF TRUTH ===\n${website.context}\n`
    : "";

  const programBlock = context.programSpec ? programContextPrompt(course) : "";

  const systemPrompt = `You are a senior WhatsApp campaign strategist for CHARTES UNION OF BUSINESS — an industry-led business education brand offering CBA™ (Certified Business Accountant), DGM™ (Digital Growth & Marketing), and TBM™ (Technology & Business Management).

You write the way top D2C education brands (upGrad, Great Learning, MasterUnion) do: human, specific, outcome-driven, never corporate-bland, never templated.

${websiteContextText}
CRITICAL RULES:
- Output ONLY valid JSON. No markdown, no prose, no code fences.
- Keep the message concise, conversational, and mobile-friendly (under 180 words).
- Ground EVERY claim in the LIVE WEBSITE DATA above. NEVER invent programs, fees, stats, placements, or faculty.
- Use the persona's real research voice (Quora/Reddit/Google phrases) — the message must sound like it was written for ONE person, not a broadcast.
- Do NOT mention city/state names in the message body.
- The message MUST follow the stage framework below. NEVER mix stages.
- Write for the ${course} course ONLY: ${programBlock ? "use its program context (promise, objections, trust factors) for the topic; never reference the other course's concerns." : ""}`;

  const userPrompt = `Write ONE WhatsApp campaign message for Charters Union of Business promoting its real programs (CBA/DGM/TBM) to this specific audience.

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
*** MANDATORY: THE APPROVED HOOK BELOW IS LAW ***
Approved Hook (USE VERBATIM as the headline — do NOT invent a different topic): ${context.suggestedHook || ""}
CTA Goal: ${context.ctaGoal || ""}
Core Angle: ${context.coreAngle || ""}
Audience Category: ${context.audienceCategory || persona.buyerPersona || "Accounting audience"}
CTA URL Path: ${context.ctaUrlPath || "/blogs"}
Course: ${course}

Output EXACTLY this JSON structure:
{
  "audienceSegment": "string",
  "headline": "EXACTLY the Approved Hook above, verbatim — do not rephrase or change topic",
  "opening": "string (first line, written around the approved hook)",
  "body": "string (2-4 sentences following the stage framework, around the approved hook)",
  "bulletPoints": ["point 1", "point 2", "point 3"],
  "whatsappMessage": "the FULL WhatsApp message as clean plain text starting with the approved hook (headline + body + CTA, no markdown, no **, no *)",
  "summary": "2 sentence summary of the WhatsApp strategy",
  "tone": "string",
  "wordCount": 60,
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
      maxTokens: 3500,
      json: true,
      caller: `WhatsApp slot ${context.slotKey || "?"}`,
      // WhatsApp chain: OpenRouter (Gemma 31B) → NVIDIA (MiniMax M3) → Groq (fast) → slow extras.
      // NO Gemini — Gemini is Phase-1 only (research/calendar), not content.
      order: ["OpenRouter", "NVIDIA", "Groq", "OpenRouter-Nemotron", "NVIDIA-GptOss"],
      openRouterModel: "google/gemma-4-31b-it:free",
      openRouterNemotronModel: "nvidia/nemotron-3-ultra-550b-a55b:free",
      nvidiaModel: "minimaxai/minimax-m3",
      nvidiaGptOssModel: "openai/gpt-oss-120b",
      groqModel: "openai/gpt-oss-120b",
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

  return {
    campaignType: parsed.campaignType || context.campaignType || "blog_promotion",
    audienceSegment: parsed.audienceSegment || context.audienceCategory || persona.buyerPersona || "Accounting audience",
    headline: parsed.headline,
    opening: parsed.opening || "",
    body: parsed.body || "",
    bulletPoints: normalizeList(parsed.bulletPoints, 3),
    ctaText: parsed.ctaText || context.ctaText || "Read the full article",
    ctaUrlPath: parsed.ctaUrlPath || context.ctaUrlPath || "/blogs",
    ctaReasoning: parsed.ctaReasoning || "",
    closing: parsed.closing || "",
    whatsappMessage: parsed.whatsappMessage || "",
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
