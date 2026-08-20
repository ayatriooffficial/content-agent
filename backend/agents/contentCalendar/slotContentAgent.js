/**
 * SLOT CONTENT AGENT
 * Generates the actual Blog / Email / WhatsApp content for ONE approved
 * calendar slot at a time. This is what the first admin approval gate
 * (calendar metadata: title/subject/hook + gap keywords) triggers.
 *
 * Every generated document is saved with status "pending" so it lands in
 * the SECOND admin approval gate (the actual content review queue in
 * approval-dashboard2), instead of being auto-published.
 *
 * Context (persona/research/competitor/blueprint) is reconstructed from the
 * PipelineRun that produced the calendar — the autonomous pipeline already
 * stores every agent's full output on it (agentOutputs.*), so nothing needs
 * to be regenerated, only reused and specialised per slot.
 */
const PipelineRun = require("../../models/PipelineRun");
const Blog = require("../../models/Blog");
const EmailCampaign = require("../../models/EmailCampaign");
const WhatsAppCampaign = require("../../models/WhatsAppCampaign");

const blogGeneratorAgent = require("../blogGeneratorAgent");
const whatsappGeneratorAgent = require("../whatsappGeneratorAgent");
const validationAgent = require("../validationAgent");

/**
 * Pulls the intelligence produced earlier in the pipeline (persona,
 * research, competitor, orchestrator blueprint) so slot-level generation
 * doesn't have to re-run those agents.
 */
async function loadPipelineContext(calendar) {
  const run = calendar.pipelineRunId
    ? await PipelineRun.findOne({ runId: calendar.pipelineRunId })
    : null;

  if (!run) {
    throw new Error(
      `PipelineRun "${calendar.pipelineRunId}" not found — cannot reconstruct persona/research/competitor context for this calendar.`
    );
  }

  const outputs = run.agentOutputs || {};
  return {
    run,
    persona: outputs.personaIntelligence || {},
    research: outputs.researchIntelligence || {},
    competitor: outputs.competitorIntelligence || {},
    blueprint: outputs.orchestratorBlueprint || {},
  };
}

/** Merge the base orchestrator blueprint with slot-specific overrides. */
function buildSlotBlueprint(baseBlueprint, overrides = {}) {
  return { ...baseBlueprint, ...overrides };
}

/**
 * Generate & save the full blog post for one approved "websiteBlogs" slot.
 * @returns {Promise<import("mongoose").Document>} saved Blog document
 */
async function generateBlogForSlot(calendar, slot) {
  console.log(`\n📝 [Slot Content Agent] Generating BLOG for slot ${slot.slotKey} (stage: ${slot.funnelStage || "SEO"})...`);
  const { persona, research, competitor, blueprint } = await loadPipelineContext(calendar);

  const slotBlueprint = buildSlotBlueprint(blueprint, {
    blogTitle: slot.title || blueprint.blogTitle,
    targetKeywords: [slot.primaryKeyword, ...(slot.gapKeywords || [])].filter(Boolean).length
      ? [slot.primaryKeyword, ...(slot.gapKeywords || [])].filter(Boolean)
      : blueprint.targetKeywords,
    contentDirection: slot.coreAngle || blueprint.contentDirection,
    contentAngle: slot.coreAngle || blueprint.contentAngle,
  });

  const blogResult = await blogGeneratorAgent(slotBlueprint, persona, research, competitor);
  const validationResult = await validationAgent(blogResult, slotBlueprint, persona, research, competitor);
  const readingTime = Math.max(1, Math.ceil((blogResult.wordCount || 0) / 200));

  const blog = new Blog({
    title: blogResult.title,
    content: blogResult.content,
    summary: blogResult.summary,
    metaDescription: blogResult.metaDescription,
    h1: blogResult.h1,
    h2s: blogResult.h2s,
    category: blogResult.category,
    status: "pending", // second admin approval gate (content review)
    tags: blogResult.tags,
    faq: blogResult.faq,
    cta: blogResult.cta,
    wordCount: blogResult.wordCount,
    readingTime,
    businessContext: calendar.businessContext,
    validationScore: validationResult.score,
    description: `${calendar.businessContext?.companyName || ""} | ${calendar.businessContext?.domain || ""}`,
    audienceCategory: calendar.audienceCategory,
    targetLocation: calendar.targetLocation,
    generatedBy: "autonomous",
    pipelineRunId: calendar.pipelineRunId,
    calendarId: calendar.calendarId,
    slotKey: slot.slotKey,
    seoKeywords: slotBlueprint.targetKeywords || [],
    emotionalHook: blueprint.emotionalHook || "",
    createdAt: new Date(),
  });

  await blog.save();
  console.log(`✅ [Slot Content Agent] Blog generated for slot ${slot.slotKey}: "${blog.title}"`);
  return blog;
}

/**
 * Generate & save the email campaign for one approved "emailMessages" slot.
 * @returns {Promise<import("mongoose").Document>} saved EmailCampaign document
 */
function normalizeRootUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return "http://localhost:6001";
  if (/^https?:\/\//i.test(value)) return value.replace(/\/$/, "");
  if (/^\d+$/.test(value)) return `http://localhost:${value}`;
  return `http://${value.replace(/^\/+/, "").replace(/\/$/, "")}`;
}

async function generateEmailForSlot(calendar, slot) {
  console.log(`\n📧 [Slot Content Agent] Generating EMAIL for slot ${slot.slotKey} (stage: ${slot.funnelStage || "?"})...`);
  const { persona, research, competitor, blueprint } = await loadPipelineContext(calendar);

  const slotBlueprint = buildSlotBlueprint(blueprint, {
    targetKeywords: (slot.gapKeywords || []).length ? slot.gapKeywords : blueprint.targetKeywords,
    contentDirection: slot.coreAngle || blueprint.contentDirection,
  });

  const ROOT = normalizeRootUrl(process.env.ROOT_EMAIL_SERVER || process.env.ROOT_SERVER_URL || "http://127.0.0.1:6001");
  const url = `${ROOT}/api/emails/generate`;
  const pipelineContext = { persona, research, competitor, blueprint };
  const payload = {
    kind: "intro",
    name: calendar.campaignName || "Student",
    email: "",
    course: slot.coreAngle || "",
    viewerLevel: "NO_ACTIVITY",
    session: 1,
    question: null,
    suggestedSubject: slot.subjectLine,
    suggestedPreview: slot.previewText,
    pipelineRunId: calendar.pipelineRunId || "",
    calendarId: calendar.calendarId || "",
    slotKey: slot.slotKey || "",
    context: {
      ...pipelineContext,
      slot: {
        ...slot,
        title: slot.title || "",
        subjectLine: slot.subjectLine || "",
        previewText: slot.previewText || "",
        coreAngle: slot.coreAngle || "",
        gapKeywords: Array.isArray(slot.gapKeywords) ? slot.gapKeywords : [],
        primaryKeyword: slot.primaryKeyword || "",
        optionIndex: slot.optionIndex || 0,
        type: slot.type || "email",
        funnelStage: slot.funnelStage || "",   // 1_AWARENESS / 2_ENGAGEMENT / 3_CONVERSION
        objective: slot.objective || "",       // stage-justifying objective from topology
        slotKey: slot.slotKey || "",
      },
      calendar: {
        campaignName: calendar.campaignName || "",
        audienceCategory: calendar.audienceCategory || "",
        targetLocation: calendar.targetLocation || "",
        timeline: calendar.timeline || "",
        businessContext: calendar.businessContext || {}
      }
    },
  };

  // Retry once on transient failures (all free providers can be briefly down)
  let response = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000), // 60s — providers chain can take ~30s
      });
      if (response.ok) break;
      console.warn(`⚠️ Root email generation returned ${response.status} (attempt ${attempt}/2) — retrying...`);
    } catch (fetchErr) {
      console.warn(`⚠️ Root email generation fetch failed (attempt ${attempt}/2): ${fetchErr.message}`);
      if (fetchErr.cause) {
        console.warn(`🔍 DEBUG - Fetch Cause:`, fetchErr.cause);
      }
    }
    if (attempt === 1) await new Promise(r => setTimeout(r, 3000));
  }

  if (!response) {
    throw new Error(`Root email generation failed: fetch to ${url} failed after 2 attempts`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`❌ Root email generation returned ${response.status} for ${url}: ${body}`);
    throw new Error(`Root email generation failed: HTTP ${response.status} from ${url}`);
  }

  const result = await response.json().catch(() => ({ success: false, error: "invalid json response" }));
  if (!result || !result.success || !result.id) {
    throw new Error(result?.error || "Root email generation failed");
  }

  const emailCampaign = new EmailCampaign({
    tag: result.email?.tag || "FOLLOWUP",
    subject: result.email?.subject || result.subject || slot.subjectLine,
    heading: result.email?.heading || "",
    intro: result.email?.intro || "",
    stats: result.email?.stats || [],
    bullets: result.email?.bullets || [],
    programs: result.email?.programs || [],
    program: result.email?.program || null,
    status: "pending",
    calendarId: calendar.calendarId,
    slotKey: slot.slotKey,
    pipelineRunId: calendar.pipelineRunId,
    createdAt: new Date(),
  });

  await emailCampaign.save();
  console.log(`✅ [Slot Content Agent] Email generated for slot ${slot.slotKey}: "${emailCampaign.subject}"`);
  return emailCampaign;
}

/**
 * Generate & save the WhatsApp campaign for one approved "whatsappMessages" slot.
 * No live WhatsApp sending integration exists yet — this only produces and
 * stores the message so the approval flow/logic is complete end-to-end.
 * @returns {Promise<import("mongoose").Document>} saved WhatsAppCampaign document
 */
async function generateWhatsAppForSlot(calendar, slot) {
  console.log(`\n💬 [Slot Content Agent] Generating WHATSAPP for slot ${slot.slotKey} (stage: ${slot.funnelStage || "?"})...`);
  const { persona, research, competitor, blueprint } = await loadPipelineContext(calendar);

  const slotBlueprint = buildSlotBlueprint(blueprint, {
    targetKeywords: (slot.gapKeywords || []).length ? slot.gapKeywords : blueprint.targetKeywords,
    contentDirection: slot.whatsappHook || blueprint.contentDirection,
  });

  // whatsappGeneratorAgent's positional `blogResult` arg is only used for
  // optional fallback fields (title/summary) — there is no linked blog for
  // a standalone WhatsApp slot, so pass an empty object.
  const whatsappResult = await whatsappGeneratorAgent(slotBlueprint, persona, research, competitor, {}, {
    audienceCategory: calendar.audienceCategory,
    targetLocation: calendar.targetLocation,
    ctaUrlPath: "/blogs",
    campaignType: "blog_promotion",
    suggestedHook: slot.whatsappHook,
    ctaGoal: slot.ctaGoal,
    coreAngle: slot.coreAngle || slotBlueprint.contentAngle || "",
    funnelStage: slot.funnelStage || "",        // 1_AWARENESS / 2_ENGAGEMENT / 3_CONVERSION
    objective: slot.objective || "",            // stage-justifying objective from topology
    slotKey: slot.slotKey || "",                // for per-slot diversity (avoid repeating other slots)
  });

  const whatsappCampaign = new WhatsAppCampaign({
    audienceSegment: whatsappResult.audienceSegment,
    headline: whatsappResult.headline,
    opening: whatsappResult.opening,
    body: whatsappResult.body,
    bulletPoints: whatsappResult.bulletPoints,
    ctaText: whatsappResult.ctaText,
    ctaUrlPath: whatsappResult.ctaUrlPath,
    ctaReasoning: whatsappResult.ctaReasoning,
    closing: whatsappResult.closing,
    whatsappMessage: whatsappResult.whatsappMessage,
    summary: whatsappResult.summary,
    tone: whatsappResult.tone,
    wordCount: whatsappResult.wordCount,
    metadata: whatsappResult.metadata,
    status: "pending", // second admin approval gate (content review)
    audienceCategory: calendar.audienceCategory,
    targetLocation: calendar.targetLocation,
    pipelineRunId: calendar.pipelineRunId,
    calendarId: calendar.calendarId,
    slotKey: slot.slotKey,
    createdAt: new Date(),
  });

  await whatsappCampaign.save();
  console.log(`✅ [Slot Content Agent] WhatsApp message generated for slot ${slot.slotKey}`);
  return whatsappCampaign;
}

module.exports = {
  generateBlogForSlot,
  generateEmailForSlot,
  generateWhatsAppForSlot,
};