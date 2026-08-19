const { groqGenerate } = require("./clients/groqClient");
const safeParseJSON = require("./jsonParser/jsonParser");

function normalizeList(value, limit = 0) {
  const items = Array.isArray(value) ? value.filter(Boolean) : [];
  return limit > 0 ? items.slice(0, limit) : items;
}

function joinList(value, fallback = "") {
  const items = normalizeList(value);
  return items.length ? items.join("; ") : fallback;
}

function buildFallbackWhatsApp(blueprint, persona, research, competitor, blogResult, context = {}) {
  // Slot-aware fallback: prefer the approved hook/title from the calendar
  // so even when AI fails, each slot's message is about ITS OWN topic.
  const approvedHook = context.suggestedHook || context.whatsappHook || "";
  const headline = approvedHook
    ? approvedHook
    : blueprint.blogTitle
      ? `New insights on ${blueprint.blogTitle}`
      : "A practical update for your audience";

  const ctaText = context.ctaText || "Read the full article";
  const ctaUrlPath = context.ctaUrlPath || "/blogs";

  const angle = context.coreAngle || blueprint.contentDirection || blueprint.contentAngle || "";

  return {
    campaignType: context.campaignType || "blog_promotion",
    audienceSegment: context.audienceCategory || persona.buyerPersona || "Accounting audience",
    headline,
    opening: `Built for ${persona.buyerPersona || "your audience"} who want a clearer next step.`,
    body: angle
      ? `${angle}${research.aiSearchQueries?.length ? ` If you are asking about ${joinList(research.aiSearchQueries, "practical accounting guidance")}, this message points you to a focused article that explains the path forward.` : ""}`
      : `If they are asking about ${joinList(research.aiSearchQueries, "practical accounting guidance")}, this message points them to a focused article that explains the path forward.`,
    bulletPoints: normalizeList([
      blueprint.emotionalAngle,
      blueprint.trustBuildingStrategy,
      (competitor.emotionalGaps || [])[0],
    ]).slice(0, 3),
    ctaText,
    ctaUrlPath,
    ctaReasoning: "This CTA keeps the message direct and easy to act on inside WhatsApp.",
    closing: "Short, useful, and tied to the reader's current concern.",
    whatsappMessage: [
      headline,
      "",
      angle || blueprint.emotionalHook || "A concise update built from the latest content strategy.",
      "",
      `Why it matters: ${blueprint.transformationStory || "it gives a practical next step instead of vague advice."}`,
      "",
      `Read more: ${ctaUrlPath}`,
    ].join("\n"),
    summary: blogResult.summary || blueprint.contentDirection || "A compact WhatsApp campaign that drives the reader to the full article.",
    tone: "clear, conversational, and action-oriented",
    wordCount: 60,
    metadata: {
      blogTitle: blogResult.title || blueprint.blogTitle || "",
      targetKeywords: normalizeList(blueprint.targetKeywords, 5),
      competitorBlindSpots: normalizeList(competitor.competitorBlindSpots, 3),
    }
  };
}

async function whatsappGeneratorAgent(blueprint, persona, research, competitor, blogResult, context = {}) {
  const blogTitle = blogResult?.title || blueprint.blogTitle || "";

  // Fetch LIVE website data so the message revolves around the real offers
  const { getWebsiteContext } = require("../services/websiteContext");
  const website = await getWebsiteContext();
  const websiteContextText = website?.context
    ? `\n=== LIVE WEBSITE DATA (Charters Union) — USE THIS AS THE PRIMARY SOURCE OF TRUTH ===\n${website.context}\n`
    : "";

  const systemPrompt = `You are a senior WhatsApp campaign strategist for CHARTES UNION OF BUSINESS — an industry-led business education brand offering CBA™ (Certified Business Accountant), DGM™ (Digital Growth & Marketing), and TBM™ (Technology & Business Management).
${websiteContextText}
CRITICAL RULES:
- Output ONLY valid JSON. No markdown, no prose, no code fences.
- Keep the message concise, conversational, and mobile-friendly.
- Ground every claim in the LIVE WEBSITE DATA (programs, fees, placements, faculty, testimonials). Do NOT invent stats, guarantees, or unsupported claims.
- Do not mention city or state names in the message body.
- All array fields must be actual JSON arrays of strings.`;

  const userPrompt = `Create a WhatsApp campaign for Charters Union of Business that promotes its real programs (CBA/DGM/TBM) to the same audience.

=== STRATEGIC BLUEPRINT ===
Blog Title: ${blogTitle}
Emotional Hook: ${blueprint.emotionalHook || blueprint.emotionalTone || ""}
Emotional Angle: ${blueprint.emotionalAngle || ""}
Transformation: ${blueprint.transformationStory || blueprint.contentAngle || ""}
Trust Strategy: ${blueprint.trustBuildingStrategy || ""}
Sections: ${joinList(blueprint.sectionsToCover)}
Primary CTA: ${blueprint.ctaStrategy || ""}
Target Keywords: ${joinList(blueprint.targetKeywords)}

=== AUDIENCE PSYCHOLOGY ===
Reader: ${persona.buyerPersona || "Accounting learner"}
Identity Belief: ${persona.identityBelief || ""}
Hidden Fears: ${joinList(persona.hiddenFears)}
Live Situations: ${joinList(persona.liveSituations, 3)}
Emotional Triggers: ${joinList(persona.emotionalTriggers)}

=== RESEARCH INTELLIGENCE ===
AI Search Queries: ${joinList(research.aiSearchQueries)}
Trust Signals: ${joinList(research.trustSignals)}
Trending Topics: ${joinList(research.trendInsights)}

=== COMPETITOR GAPS ===
Emotional Gaps: ${joinList(competitor.emotionalGaps)}
Trust Gaps: ${joinList(competitor.trustGaps)}
Blind Spots: ${joinList(competitor.competitorBlindSpots)}

=== WHATSAPP CONTEXT ===
Campaign Type: ${context.campaignType || "blog_promotion"}
Audience Category: ${context.audienceCategory || persona.buyerPersona || "Accounting audience"}
CTA URL Path: ${context.ctaUrlPath || "/blogs"}

Write a WhatsApp message that:
1. Opens with a short, human headline.
2. Uses one clear emotional hook.
3. Summarizes the article value without sounding like a blog excerpt.
4. Includes 2-3 concise bullet points or value points.
5. Ends with one clear CTA.

Output EXACTLY this JSON structure:
{
  "audienceSegment": "string",
  "headline": "string",
  "opening": "string",
  "body": "string",
  "bulletPoints": ["point 1", "point 2", "point 3"],
  "whatsappMessage": "full WhatsApp message as clean plain text",
  "summary": "2 sentence summary of the WhatsApp strategy",
  "tone": "string",
  "wordCount": 60,
  "metadata": {
    "blogTitle": "string",
    "targetKeywords": ["keyword 1", "keyword 2"],
    "competitorBlindSpots": ["gap 1", "gap 2"]
  }
}`;

  let raw = "";

  try {
    console.log("  [WhatsApp Generator Agent] Generating WhatsApp campaign copy...");
    raw = await groqGenerate(
      "You are a concise WhatsApp strategist for accounting education content. You transform strategic blog intelligence into a compact, persuasive mobile message that feels human and specific.",
      userPrompt,
      { model: "openai/gpt-oss-120b", temperature: 0.65, maxTokens: 4000, json: true }
    );
  } catch (err) {
    console.error("WhatsApp Generator Agent — Groq generation failed:", err.message);
    return buildFallbackWhatsApp(blueprint, persona, research, competitor, blogResult || {}, context);
  }

  const parsed = safeParseJSON(raw);
  if (!parsed || !parsed.headline || !Array.isArray(parsed.bulletPoints)) {
    return buildFallbackWhatsApp(blueprint, persona, research, competitor, blogResult || {}, context);
  }

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
      approach: "WhatsApp Strategy Synthesis (JSON Enforced)",
      reasoning: "Converted the blog strategy into a compact WhatsApp campaign using persona psychology, research signals, and competitor gaps.",
      inputs: ["Blueprint", "Persona", "Research", "Competitor Analysis", "Blog Output"]
    }
  };
}

module.exports = whatsappGeneratorAgent;