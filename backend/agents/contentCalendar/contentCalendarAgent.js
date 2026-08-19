/**
 * CONTENT CALENDAR AGENT
 * Converts raw market research into a structured 15-day 3-stream execution blueprint.
 * 
 * Streams:
 * 1. Website Blogs (6 posts - Independent SEO)
 * 2. Email Messages (6 mails - Stage 1 Awareness & Stage 2 Engagement)
 * 3. WhatsApp Messages (6 messages - Stage 1 Awareness & Stage 2 Engagement)
 * 
 * Output: Metadata only (Titles, Subject Lines, WhatsApp Hooks, Gap Keywords, Angles).
 *
 * CHANGE LOG (this revision):
 * - Options within a slot are no longer allowed to be near-duplicates of each other.
 *   A similarity check + regeneration pass now runs on every slot's options,
 *   whether they came from the LLM or from the fallback generator.
 * - The 15-day window is no longer treated as 15 isolated slots. A narrative
 *   outline of the whole campaign is fed to the LLM so day N is written with
 *   awareness of what day N-1 (and earlier) already said, and each output item
 *   now carries a `previousAngle` field pointing at the prior item in its own
 *   channel so downstream systems (or a human editor) can see the throughline.
 */

const { CAMPAIGN_TOPOLOGY } = require("./campaignTopology");
const { groqGenerate } = require("../clients/groqClient");
const safeParseJSON = require("../jsonParser/jsonParser");

// Distinct "voice" each option in a 3-option set must take. Used both to steer
// the LLM and to regenerate a fallback option when two options collide.
const OPTION_STYLES = ["standard", "creative", "urgency"];

function buildDefaultOptionSet(type, seedData = {}) {
  const base = seedData || {};

  if (type === "blog") {
    return [
      {
        style: "standard",
        title: base.title || "A Practical Growth Playbook for Modern Marketers",
        primaryKeyword: base.primaryKeyword || "content marketing strategy",
        gapKeywords: Array.isArray(base.gapKeywords) && base.gapKeywords.length ? base.gapKeywords : ["digital marketing", "lead generation"],
        coreAngle: base.coreAngle || "A direct, practical strategy that improves visibility and helps the audience act faster."
      },
      {
        style: "creative",
        title: "The Real Story Behind Sustainable Business Growth",
        primaryKeyword: "local business growth",
        gapKeywords: Array.isArray(base.gapKeywords) && base.gapKeywords.length ? [...base.gapKeywords].reverse() : ["customer acquisition", "brand authority"],
        coreAngle: "A narrative-driven angle that turns search traffic into higher-intent engagement through a relatable story."
      },
      {
        style: "urgency",
        title: "Why This Growth Move Can't Wait Any Longer",
        primaryKeyword: "expert marketing insights",
        gapKeywords: Array.isArray(base.gapKeywords) && base.gapKeywords.length ? base.gapKeywords.slice(1).concat(base.gapKeywords[0]) : ["content strategy", "careers marketing"],
        coreAngle: "An urgency-led, data-backed angle that earns trust fast and pushes the reader to act now, not later."
      }
    ];
  }

  if (type === "email") {
    return [
      {
        style: "standard",
        subjectLine: base.subjectLine || "A Sharper Way to Reach Your Audience",
        previewText: base.previewText || "A practical, easy-to-scan update with real value for your audience.",
        gapKeywords: Array.isArray(base.gapKeywords) && base.gapKeywords.length ? base.gapKeywords : ["email funnel", "customer education"],
        coreAngle: base.coreAngle || "Build awareness with a clear, useful insight that feels timely and relevant."
      },
      {
        style: "creative",
        subjectLine: "Here's a Story Worth Sharing...",
        previewText: "A short, human anecdote that leads naturally into the offer.",
        gapKeywords: Array.isArray(base.gapKeywords) && base.gapKeywords.length ? [...base.gapKeywords].reverse() : ["buyer motivation", "decision support"],
        coreAngle: "Make the audience feel the problem is real through a narrative hook, then show the solution is easy to act on."
      },
      {
        style: "urgency",
        subjectLine: "Don't Miss This Limited-Time Update",
        previewText: "A time-boxed, benefit-forward email built to convert now.",
        gapKeywords: Array.isArray(base.gapKeywords) && base.gapKeywords.length ? base.gapKeywords.slice(1).concat(base.gapKeywords[0]) : ["brand trust", "lead engagement"],
        coreAngle: "Use an urgency-driven angle that highlights scarcity or timeliness while keeping the CTA sharp."
      }
    ];
  }

  return [
    {
      style: "standard",
      whatsappHook: base.whatsappHook || "Quick insight: less noise, more action.",
      gapKeywords: Array.isArray(base.gapKeywords) && base.gapKeywords.length ? base.gapKeywords : ["mobile engagement", "quick win"],
      ctaGoal: base.ctaGoal || "spark reply and drive a simple next step"
    },
    {
      style: "creative",
      whatsappHook: "True story from the field 👇",
      gapKeywords: Array.isArray(base.gapKeywords) && base.gapKeywords.length ? [...base.gapKeywords].reverse() : ["audience pain points", "thought leadership"],
      ctaGoal: "keep the conversation moving with a light, curiosity-driven CTA"
    },
    {
      style: "urgency",
      whatsappHook: "⏳ This closes soon — don't miss it",
      gapKeywords: Array.isArray(base.gapKeywords) && base.gapKeywords.length ? base.gapKeywords.slice(1).concat(base.gapKeywords[0]) : ["social proof", "lead response"],
      ctaGoal: "create urgency and encourage an immediate reply"
    }
  ];
}

/**
 * Cheap, dependency-free text similarity check (word-overlap ratio, 0-1).
 * Good enough to catch "these two options are basically the same sentence"
 * without needing an embeddings call.
 */
function textSimilarity(a = "", b = "") {
  const normalize = (s) => String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const wordsA = normalize(a);
  const wordsB = normalize(b);
  if (!wordsA.length || !wordsB.length) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let overlap = 0;
  setA.forEach(w => { if (setB.has(w)) overlap += 1; });

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : overlap / union;
}

function primaryTextOf(option, type) {
  if (type === "blog") return `${option.title || ""} ${option.coreAngle || ""}`;
  if (type === "email") return `${option.subjectLine || ""} ${option.coreAngle || ""}`;
  return `${option.whatsappHook || ""} ${option.ctaGoal || ""}`;
}

const SIMILARITY_THRESHOLD = 0.55; // above this, two options are treated as near-duplicates

/**
 * Walks a 3-option array and rewrites any option that is too similar to an
 * earlier one in the array, so every slot genuinely offers 3 different
 * takes instead of 3 rewordings of the same idea. Works regardless of
 * whether the options came from the LLM or the deterministic fallback.
 */
function ensureOptionsDistinct(options, type, seedData, slotKey, dayOffset) {
  const result = options.map(opt => ({ ...opt }));

  for (let i = 1; i < result.length; i++) {
    for (let j = 0; j < i; j++) {
      const sim = textSimilarity(primaryTextOf(result[i], type), primaryTextOf(result[j], type));
      if (sim >= SIMILARITY_THRESHOLD) {
        const styleIndex = i % OPTION_STYLES.length;
        const regenerated = buildDefaultOptionSet(type, seedData, slotKey, dayOffset)[styleIndex];
        // Force a hard textual distinction even if the regenerated fallback
        // still happens to collide (e.g. thin seed data) by tagging the style.
        const stillSimilar = textSimilarity(primaryTextOf(regenerated, type), primaryTextOf(result[j], type)) >= SIMILARITY_THRESHOLD;
        result[i] = stillSimilar
          ? tagOptionWithStyle(regenerated, type, OPTION_STYLES[styleIndex])
          : regenerated;
        break;
      }
    }
  }

  return result;
}

function tagOptionWithStyle(option, type, style) {
  const tagged = { ...option, style };
  const label = style === "creative" ? "The story angle" : style === "urgency" ? "The urgent take" : "The direct take";
  if (type === "blog") tagged.title = `${label}: ${tagged.title}`;
  if (type === "email") tagged.subjectLine = `${label}: ${tagged.subjectLine}`;
  if (type === "whatsapp") tagged.whatsappHook = `${label} — ${tagged.whatsappHook}`;
  return tagged;
}

function fillMissingOptionVariants(item, type, fallbackKey, dayOffset) {
  const normalized = { ...item };
  normalized.options = Array.isArray(normalized.options) && normalized.options.length
    ? normalized.options.slice(0, 3)
    : buildDefaultOptionSet(type, normalized, fallbackKey, dayOffset);

  while (normalized.options.length < 3) {
    normalized.options.push(buildDefaultOptionSet(type, normalized, fallbackKey, dayOffset)[normalized.options.length]);
  }

  normalized.options = ensureOptionsDistinct(normalized.options, type, normalized, fallbackKey, dayOffset);

  return normalized;
}

function normalizeCalendarStrategy(rawStrategy) {
  if (!rawStrategy || typeof rawStrategy !== "object") return {
    campaignName: "15-Day Multi-Channel Campaign",
    blogs: [],
    emails: [],
    whatsappMessages: [],
  };

  const nested = rawStrategy.strategy || rawStrategy.contentCalendar || rawStrategy.calendar || rawStrategy;
  const blogs = Array.isArray(nested.blogs)
    ? nested.blogs
    : Array.isArray(nested.websiteBlogs)
      ? nested.websiteBlogs
      : Array.isArray(nested.blog)
        ? nested.blog
        : [];

  const emails = Array.isArray(nested.emails)
    ? nested.emails
    : Array.isArray(nested.emailMessages)
      ? nested.emailMessages
      : Array.isArray(nested.email)
        ? nested.email
        : [];

  const whatsappMessages = Array.isArray(nested.whatsappMessages)
    ? nested.whatsappMessages
    : Array.isArray(nested.whatsapp)
      ? nested.whatsapp
      : Array.isArray(nested.whatsAppMessages)
        ? nested.whatsAppMessages
        : [];

  return {
    campaignName: nested.campaignName || rawStrategy.campaignName || "15-Day Multi-Channel Campaign",
    blogs: blogs.map((item, index) => ({
      ...item,
      slotKey: item.slotKey || item.key || `blog_${index + 1}`,
    })),
    emails: emails.map((item, index) => ({
      ...item,
      slotKey: item.slotKey || item.key || `email_${index + 1}`,
    })),
    whatsappMessages: whatsappMessages.map((item, index) => ({
      ...item,
      slotKey: item.slotKey || item.key || `wa_${index + 1}`,
    })),
  };
}

function mergeStrategyWithTopology(llmStrategy) {
  const strategy = normalizeCalendarStrategy(llmStrategy);

  const buildMap = (list) => new Map((list || []).map(item => [item.slotKey || item.key, item]));

  const blogMap = buildMap(strategy.blogs);
  const emailMap = buildMap(strategy.emails);
  const whatsappMap = buildMap(strategy.whatsappMessages);

  const blogSlots = CAMPAIGN_TOPOLOGY.filter(slot => slot.channel === "WEBSITE").map(slot => {
    const existing = blogMap.get(slot.slotKey) || {};
    const merged = fillMissingOptionVariants({
      ...existing,
      slotKey: slot.slotKey,
      title: existing.title || "A High-Intent SEO Angle Backed by Market Research",
      primaryKeyword: existing.primaryKeyword || "growth marketing",
      gapKeywords: Array.isArray(existing.gapKeywords) && existing.gapKeywords.length ? existing.gapKeywords : ["search intent", "local visibility"],
      coreAngle: existing.coreAngle || "A strategic angle that balances search intent, proven business value, and audience trust."
    }, "blog", slot.slotKey, slot.dayOffset);
    return merged;
  });

  const emailSlots = CAMPAIGN_TOPOLOGY.filter(slot => slot.channel === "EMAIL").map(slot => {
    const existing = emailMap.get(slot.slotKey) || {};
    const merged = fillMissingOptionVariants({
      ...existing,
      slotKey: slot.slotKey,
      subjectLine: existing.subjectLine || "An Update Worth Your Attention",
      previewText: existing.previewText || "Practical value in a short, readable format.",
      gapKeywords: Array.isArray(existing.gapKeywords) && existing.gapKeywords.length ? existing.gapKeywords : ["audience insight", "lead education"],
      coreAngle: existing.coreAngle || "A relevant message that feels useful, personal, and easy to act on."
    }, "email", slot.slotKey, slot.dayOffset);
    return merged;
  });

  const whatsappSlots = CAMPAIGN_TOPOLOGY.filter(slot => slot.channel === "WHATSAPP").map(slot => {
    const existing = whatsappMap.get(slot.slotKey) || {};
    const merged = fillMissingOptionVariants({
      ...existing,
      slotKey: slot.slotKey,
      whatsappHook: existing.whatsappHook || "A short, high-value message for your audience.",      gapKeywords: Array.isArray(existing.gapKeywords) && existing.gapKeywords.length ? existing.gapKeywords : ["quick engagement", "funnel trigger"],
      ctaGoal: existing.ctaGoal || "spark a reply and keep momentum"
    }, "whatsapp", slot.slotKey, slot.dayOffset);
    return merged;
  });

  return {
    campaignName: strategy.campaignName || "15-Day Multi-Channel Campaign",
    blogs: blogSlots,
    emails: emailSlots,
    whatsappMessages: whatsappSlots,
  };
}

/**
 * Builds a plain-text, day-ordered outline of every slot in the topology so
 * the LLM can see the whole 15-day arc before writing any single slot. This
 * is what lets day 3 acknowledge day 1's theme instead of starting cold.
 */
function buildNarrativeOutline(topology) {
  const byDay = {};
  [...topology]
    .sort((a, b) => a.dayOffset - b.dayOffset)
    .forEach(slot => {
      if (!byDay[slot.dayOffset]) byDay[slot.dayOffset] = [];
      byDay[slot.dayOffset].push(`${slot.channel} (${slot.slotKey}${slot.funnelStage ? `, ${slot.funnelStage}` : ""})`);
    });

  return Object.keys(byDay)
    .sort((a, b) => Number(a) - Number(b))
    .map(day => `Day ${day}: ${byDay[day].join(" | ")}`)
    .join("\n");
}

/**
 * Main Content Calendar Generator
 * @param {Object|string} marketResearchData - Full campaign context including businessContext,
 * personaResult, researchResult, competitorResult, memoryResult, and blueprint, or a legacy string payload.
 * @param {string} startDateISO - Campaign start date in ISO format (e.g., "2026-08-10T00:00:00.000Z")
 * @returns {Promise<Object>} Complete structured payload ready for Admin Approval Queue
 */
async function runContentCalendarAgent(marketResearchData = {}, startDateISO = new Date().toISOString()) {
  console.log("Calendar Agent] Starting 15-day 3-stream blueprint generation...");

  const normalizedContext = typeof marketResearchData === "object" && marketResearchData !== null
    ? marketResearchData
    : { marketResearchData };

  const businessContext = normalizedContext.businessContext || {};
  const personaResult = normalizedContext.personaResult || {};
  const researchResult = normalizedContext.researchResult || {};
  const competitorResult = normalizedContext.competitorResult || {};
  const memoryResult = normalizedContext.memoryResult || {};
  const blueprint = normalizedContext.blueprint || {};
  const fallbackMarketContext = normalizedContext.marketResearchData || normalizedContext;

  // 1. Build System & User Prompts
  const systemPrompt = `You are a Chief Content Officer and SEO/Funnel Strategist.
Your job is to generate a high-converting 15-day Content Calendar matrix based on the full campaign brief, not just a generic content prompt.

STRICT OPERATIONAL RULES:
1. Return strictly valid JSON matching the requested schema. No conversational filler or markdown wrapper outside JSON.
2. DO NOT write full articles or long messages. Only generate TITLES, SUBJECT LINES, WHATSAPP HOOKS, CORE ANGLES, and GAP KEYWORDS.
3. Observe channel segregation:
   - BLOGS: Focus purely on organic search intent and keyword coverage. Ignore funnel stage logic.
   - EMAILS: Follow the 3-stage funnel — Stage 1 (Awareness, Day 1): educate, NO enrollment push; Stage 2 (Engagement, Day 2): proof + interaction (placement/faculty/ROI, invite reply); Stage 3 (Conversion, Day 3): clear CTA + urgency (batch deadline, apply now) without fake scarcity.
   - WHATSAPP: Follow the same 3-stage funnel with mobile-first hook formats — Stage 1 hooks curiosity (no hard sell), Stage 2 delivers micro-proof + invites reply, Stage 3 pushes a direct, honest CTA.
4. Extract long-tail gap keywords relevant to local market needs.
5. Use the provided business context, persona, research, competitor signals, memory insights, and orchestrator blueprint as the actual source of truth for the campaign arc.
6. OPTION DIVERSITY (STRICT): You MUST generate exactly 3 genuinely different options for every slot's 'options' array:
   - Option A = standard/direct framing.
   - Option B = creative/story-driven framing.
   - Option C = analytical/urgency-driven framing.
   These are not allowed to share the same title/subject/hook wording, the same primary keyword, or near-identical core angles. If two of your own options would read as interchangeable to a human editor, rewrite one of them until they clearly diverge in both topic framing and keyword focus.
7. DAY-TO-DAY CONTINUITY (STRICT): The 15 days are one continuous campaign, not 15 isolated pieces. Treat each channel's own sequence (blogs vs blogs, emails vs emails, whatsapp vs whatsapp) as chapters of one story:
   - Do not repeat the same core angle across days in the same channel.
   - Later days should reference, build on, escalate, or answer an objection raised by an earlier day in that channel (e.g. Day 1 introduces a problem, a later day shows proof/solution, a later still day adds urgency or social proof).
   - Stage 1 (Awareness) items should set up themes that Stage 2 (Engagement) items in the same channel then deepen or convert, and Stage 3 (Conversion) items must close with a clear, honest call to action.
   You will be given a day-by-day outline of every slot in the campaign below — use it to plan this progression before writing.`;

  const narrativeOutline = buildNarrativeOutline(CAMPAIGN_TOPOLOGY);
  const CONTEXT_LIMIT = 2500; // per-context truncation — keeps the request under Groq's size limit
  const safeStringify = (value) => {
    if (value === undefined || value === null) return "null";
    try {
      return JSON.stringify(value, null, 2).substring(0, CONTEXT_LIMIT);
    } catch (error) {
      return String(value).substring(0, CONTEXT_LIMIT);
    }
  };

  const userPrompt = `Generate strategy metadata for each slot in the campaign topology below using the actual campaign context.

=== BUSINESS CONTEXT ===
${safeStringify(businessContext)}

=== PERSONA CONTEXT ===
${safeStringify(personaResult)}

=== RESEARCH CONTEXT ===
${safeStringify(researchResult)}

=== COMPETITOR CONTEXT ===
${safeStringify(competitorResult)}

=== MEMORY CONTEXT ===
${safeStringify(memoryResult)}

=== ORCHESTRATOR BLUEPRINT ===
${safeStringify(blueprint)}

=== RAW MARKET RESEARCH CONTEXT ===
${safeStringify(fallbackMarketContext)}

=== 15-DAY NARRATIVE FLOW (plan progression across these before writing any single slot) ===
${narrativeOutline}

=== CAMPAIGN TOPOLOGY SLOTS ===
${JSON.stringify(
  CAMPAIGN_TOPOLOGY.map(({ slotKey, channel, type, dayOffset, funnelStage, slot }) => ({
    slotKey, channel, type, dayOffset, funnelStage, slot,
  })),
  null,
  2
)}

=== REQUIRED JSON OUTPUT SCHEMA ===
Return ONLY a JSON object formatted exactly like this:
{
  "campaignName": "Descriptive Strategy Title",
  "blogs": [
    {
      "slotKey": "blog_1",
      "title": "SEO Optimized Blog Title",
      "primaryKeyword": "main kw",
      "gapKeywords": ["gap kw 1", "gap kw 2"],
      "coreAngle": "Strategic angle explaining why this article ranks and attracts search traffic, and how it connects to the day before/after it in this channel",
      "options": [
        {
          "title": "Option A title",
          "primaryKeyword": "option a kw",
          "gapKeywords": ["gap kw 1", "gap kw 2"],
          "coreAngle": "Option A angle (standard/direct)"
        },
        {
          "title": "Option B title",
          "primaryKeyword": "option b kw",
          "gapKeywords": ["gap kw 3", "gap kw 4"],
          "coreAngle": "Option B angle (creative/story-driven, genuinely different topic framing from A)"
        },
        {
          "title": "Option C title",
          "primaryKeyword": "option c kw",
          "gapKeywords": ["gap kw 5", "gap kw 6"],
          "coreAngle": "Option C angle (analytical/urgency-driven, genuinely different topic framing from A and B)"
        }
      ]
    }
  ],
  "emails": [
    {
      "slotKey": "email_1",
      "subjectLine": "Compelling Subject Line",
      "previewText": "Opening preview snippet",
      "gapKeywords": ["gap kw 1", "gap kw 2"],
      "coreAngle": "Strategic angle driving awareness or engagement, and how it builds on the prior email in this channel",
      "options": [
        {
          "subjectLine": "Option A subject",
          "previewText": "Option A preview",
          "gapKeywords": ["gap kw 1", "gap kw 2"],
          "coreAngle": "Option A angle (standard/direct)"
        },
        {
          "subjectLine": "Option B subject",
          "previewText": "Option B preview",
          "gapKeywords": ["gap kw 3", "gap kw 4"],
          "coreAngle": "Option B angle (creative/story-driven, genuinely different from A)"
        },
        {
          "subjectLine": "Option C subject",
          "previewText": "Option C preview",
          "gapKeywords": ["gap kw 5", "gap kw 6"],
          "coreAngle": "Option C angle (analytical/urgency-driven, genuinely different from A and B)"
        }
      ]
    }
  ],
  "whatsappMessages": [
    {
      "slotKey": "wa_1",
      "whatsappHook": "First 1-2 lines formatted for mobile attention span",
      "gapKeywords": ["gap kw 1", "gap kw 2"],
      "ctaGoal": "Intended action (e.g. spark reply, vote in poll, drive discussion)",
      "options": [
        {
          "whatsappHook": "Option A hook",
          "gapKeywords": ["gap kw 1", "gap kw 2"],
          "ctaGoal": "Option A CTA"
        },
        {
          "whatsappHook": "Option B hook",
          "gapKeywords": ["gap kw 3", "gap kw 4"],
          "ctaGoal": "Option B CTA"
        },
        {
          "whatsappHook": "Option C hook",
          "gapKeywords": ["gap kw 5", "gap kw 6"],
          "ctaGoal": "Option C CTA"
        }
      ]
    }
  ]
}`;

  try {
    // 2. Call LLM (Using Groq/Llama-3.3-70b or Claude/GPT-4o equivalent)
    const rawOutput = await groqGenerate(systemPrompt, userPrompt, {
      model: "openai/gpt-oss-20b",
      temperature: 0.6,
      maxTokens: 3000
    });

    // 3. Parse JSON safely
    const parsed = safeParseJSON(rawOutput);
    const llmStrategy = mergeStrategyWithTopology(parsed);

    if (!Array.isArray(llmStrategy.blogs) || !Array.isArray(llmStrategy.emails) || !Array.isArray(llmStrategy.whatsappMessages)) {
      console.error("[Calendar Agent] Raw LLM payload rejected:", JSON.stringify(rawOutput).slice(0, 2000));
      throw new Error("Invalid output layout from LLM: Missing 'blogs', 'emails', or 'whatsappMessages' arrays.");
    }

    // 4. Weave Exact Timestamps and Admin Approval Metadata
    const finalPayload = weaveAdminApprovalPayload(llmStrategy, startDateISO);

    console.log(`✅ [Calendar Agent] Successfully generated Calendar ID: ${finalPayload.calendarId}`);
    return finalPayload;

  } catch (err) {
    console.error("❌ [Calendar Agent] Error generating content calendar:", err.message);
    throw err;
  }
}

/**
 * Deterministically merges LLM strategy output with CAMPAIGN_TOPOLOGY dates.
 *
 * Hardened against a partial/mismatched LLM response: any item whose
 * slotKey doesn't match a real topology slot is skipped instead of
 * crashing the whole calendar (topo.dayOffset on undefined used to throw).
 */
function normalizeOptionList(options, fallbackValues, fallbackBuilder, type, slotKey, dayOffset) {
  const cleanOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const built = !cleanOptions.length
    ? [fallbackBuilder({ ...fallbackValues, optionIndex: 0 })]
    : cleanOptions.slice(0, 3).map((option, index) => fallbackBuilder({
        ...fallbackValues,
        ...(option || {}),
        optionIndex: index,
      }));

  // Guarantee the final 3 options actually differ from each other, even if
  // the LLM (or the fallback path above) produced near-identical text.
  return built.length > 1
    ? ensureOptionsDistinct(built, type, fallbackValues, slotKey, dayOffset)
    : built;
}

function getSelectedOption(options, selectedOptionIndex) {
  const safeOptions = Array.isArray(options) && options.length ? options : [];
  if (!safeOptions.length) return null;
  const index = Number.isInteger(selectedOptionIndex) ? selectedOptionIndex : 0;
  return safeOptions[Math.min(Math.max(index, 0), safeOptions.length - 1)] || safeOptions[0];
}

function weaveAdminApprovalPayload(llmStrategy, startDateISO) {
  const baseDate = new Date(startDateISO);

  // Map Blogs (Default time: 09:00 AM IST)
  const websiteBlogs = (llmStrategy.blogs || [])
    .filter(blog => CAMPAIGN_TOPOLOGY.find(t => t.slotKey === blog.slotKey))
    .map(blog => {
      const topo = CAMPAIGN_TOPOLOGY.find(t => t.slotKey === blog.slotKey);
      const pubDate = calculateDate(baseDate, topo.dayOffset, 9, 0);
      const options = normalizeOptionList(blog.options, blog, (item) => ({
        title: item.title || blog.title || `Blog option ${item.optionIndex + 1}`,
        primaryKeyword: item.primaryKeyword || blog.primaryKeyword || "",
        gapKeywords: Array.isArray(item.gapKeywords) ? item.gapKeywords : (Array.isArray(blog.gapKeywords) ? blog.gapKeywords : []),
        coreAngle: item.coreAngle || blog.coreAngle || "",
      }), "blog", blog.slotKey, topo.dayOffset);
      const selected = getSelectedOption(options, blog.selectedOptionIndex || 0);

      return {
        slotKey: blog.slotKey,
        scheduledDay: topo.dayOffset,
        scheduledTimestamp: pubDate.toISOString(),
        channel: "WEBSITE",
        title: selected.title || blog.title,
        primaryKeyword: selected.primaryKeyword || blog.primaryKeyword || "",
        gapKeywords: selected.gapKeywords || blog.gapKeywords || [],
        coreAngle: selected.coreAngle || blog.coreAngle || "",
        options,
        selectedOptionIndex: 0,
        status: "PENDING_ADMIN_APPROVAL"
      };
    })
    .sort((a, b) => a.scheduledDay - b.scheduledDay);
  linkNarrativeThread(websiteBlogs, "title");

  // Map Emails (Default time: 11:00 AM IST, staggered +20 min per same-day slot)
  const emailMessages = (llmStrategy.emails || [])
    .filter(email => CAMPAIGN_TOPOLOGY.find(t => t.slotKey === email.slotKey))
    .map(email => {
      const topo = CAMPAIGN_TOPOLOGY.find(t => t.slotKey === email.slotKey);
      const staggerMinutes = (topo.sameDayIndex || 0) * 20;
      const sendDate = calculateDate(baseDate, topo.dayOffset, 11, staggerMinutes);
      const options = normalizeOptionList(email.options, email, (item) => ({
        subjectLine: item.subjectLine || email.subjectLine || `Email option ${item.optionIndex + 1}`,
        previewText: item.previewText || email.previewText || "",
        gapKeywords: Array.isArray(item.gapKeywords) ? item.gapKeywords : (Array.isArray(email.gapKeywords) ? email.gapKeywords : []),
        coreAngle: item.coreAngle || email.coreAngle || "",
      }), "email", email.slotKey, topo.dayOffset);
      const selected = getSelectedOption(options, email.selectedOptionIndex || 0);

      return {
        slotKey: email.slotKey,
        scheduledDay: topo.dayOffset,
        scheduledTimestamp: sendDate.toISOString(),
        channel: "EMAIL",
        funnelStage: topo.funnelStage,
        slot: topo.slot || 1,
        subjectLine: selected.subjectLine || email.subjectLine,
        previewText: selected.previewText || email.previewText || "",
        gapKeywords: selected.gapKeywords || email.gapKeywords || [],
        coreAngle: selected.coreAngle || email.coreAngle || "",
        options,
        selectedOptionIndex: 0,
        status: "PENDING_ADMIN_APPROVAL"
      };
    })
    .sort((a, b) => new Date(a.scheduledTimestamp) - new Date(b.scheduledTimestamp));
  linkNarrativeThread(emailMessages, "subjectLine");

  // Map WhatsApp Messages (Default time: 04:30 PM IST, staggered +15 min per same-day slot)
  const whatsappMessages = (llmStrategy.whatsappMessages || [])
    .filter(wa => CAMPAIGN_TOPOLOGY.find(t => t.slotKey === wa.slotKey))
    .map(wa => {
      const topo = CAMPAIGN_TOPOLOGY.find(t => t.slotKey === wa.slotKey);
      const staggerMinutes = (topo.sameDayIndex || 0) * 15;
      const sendDate = calculateDate(baseDate, topo.dayOffset, 16, 30 + staggerMinutes);
      const options = normalizeOptionList(wa.options, wa, (item) => ({
        whatsappHook: item.whatsappHook || wa.whatsappHook || `WhatsApp option ${item.optionIndex + 1}`,
        gapKeywords: Array.isArray(item.gapKeywords) ? item.gapKeywords : (Array.isArray(wa.gapKeywords) ? wa.gapKeywords : []),
        ctaGoal: item.ctaGoal || wa.ctaGoal || "",
      }), "whatsapp", wa.slotKey, topo.dayOffset);
      const selected = getSelectedOption(options, wa.selectedOptionIndex || 0);

      return {
        slotKey: wa.slotKey,
        scheduledDay: topo.dayOffset,
        scheduledTimestamp: sendDate.toISOString(),
        channel: "WHATSAPP",
        funnelStage: topo.funnelStage,
        slot: topo.slot || 1,
        whatsappHook: selected.whatsappHook || wa.whatsappHook,
        gapKeywords: selected.gapKeywords || wa.gapKeywords || [],
        ctaGoal: selected.ctaGoal || wa.ctaGoal || "",
        options,
        selectedOptionIndex: 0,
        status: "PENDING_ADMIN_APPROVAL"
      };
    })
    .sort((a, b) => new Date(a.scheduledTimestamp) - new Date(b.scheduledTimestamp));
  linkNarrativeThread(whatsappMessages, "whatsappHook");

  const calendarView = buildCalendarView({ websiteBlogs, emailMessages, whatsappMessages });

  return {
    calendarId: `CAL_${Date.now()}`,
    campaignName: llmStrategy.campaignName || "15-Day Multi-Channel Campaign",
    status: "PENDING_ADMIN_APPROVAL",
    timeframe: "15 Days",
    createdAt: new Date().toISOString(),
    summary: {
      totalBlogs: websiteBlogs.length,
      totalEmails: emailMessages.length,
      totalWhatsAppMessages: whatsappMessages.length,
      activeFunnelStages: ["1_AWARENESS", "2_ENGAGEMENT", "3_CONVERSION"]
    },
    schedule: {
      websiteBlogs,
      emailMessages,
      whatsappMessages
    },
    // Pre-grouped by calendar date (YYYY-MM-DD) so the frontend can render
    // a day-by-day calendar view without having to merge/sort the three
    // streams itself.
    calendarView
  };
}

/**
 * Walks a chronologically-sorted stream (blogs, or emails, or whatsapp — each
 * channel threaded separately) and stamps every item after the first with a
 * `previousAngle` pointer back at the prior item's headline field. This makes
 * the day-to-day progression explicit in the payload itself, so a human
 * reviewer (or a downstream long-form writer agent) can see at a glance what
 * each day is building on, and can catch it immediately if two days drifted
 * back into saying the same thing.
 */
function linkNarrativeThread(items, headlineField) {
  items.forEach((item, index) => {
    item.previousAngle = index === 0
      ? null
      : {
          slotKey: items[index - 1].slotKey,
          scheduledDay: items[index - 1].scheduledDay,
          headline: items[index - 1][headlineField] || null,
          coreAngle: items[index - 1].coreAngle || null,
        };
  });
  return items;
}

/**
 * Groups all scheduled items (blogs + emails + whatsapp) by their local
 * calendar date and returns them sorted chronologically, both at the date
 * level and within each date. Shape:
 * [
 *   {
 *     date: "2026-08-11",
 *     items: [
 *       { slotKey, channel, time: "09:00", scheduledTimestamp, label, status, funnelStage }
 *     ]
 *   },
 *   ...
 * ]
 */
function buildCalendarView({ websiteBlogs, emailMessages, whatsappMessages }) {
  const allItems = [
    ...websiteBlogs.map(b => ({
      slotKey: b.slotKey,
      channel: b.channel,
      scheduledTimestamp: b.scheduledTimestamp,
      label: b.title,
      status: b.status,
      funnelStage: null,
      options: b.options || [],
      selectedOptionIndex: b.selectedOptionIndex ?? 0,
      previousAngle: b.previousAngle || null
    })),
    ...emailMessages.map(e => ({
      slotKey: e.slotKey,
      channel: e.channel,
      scheduledTimestamp: e.scheduledTimestamp,
      label: e.subjectLine,
      status: e.status,
      funnelStage: e.funnelStage,
      options: e.options || [],
      selectedOptionIndex: e.selectedOptionIndex ?? 0,
      previousAngle: e.previousAngle || null
    })),
    ...whatsappMessages.map(w => ({
      slotKey: w.slotKey,
      channel: w.channel,
      scheduledTimestamp: w.scheduledTimestamp,
      label: w.whatsappHook,
      status: w.status,
      funnelStage: w.funnelStage,
      options: w.options || [],
      selectedOptionIndex: w.selectedOptionIndex ?? 0,
      previousAngle: w.previousAngle || null
    }))
  ];

  const byDate = {};
  allItems.forEach(item => {
    const dateKey = item.scheduledTimestamp.slice(0, 10); // YYYY-MM-DD
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push({
      ...item,
      time: new Date(item.scheduledTimestamp).toISOString().slice(11, 16) // HH:MM (UTC)
    });
  });

  return Object.keys(byDate)
    .sort()
    .map(date => ({
      date,
      items: byDate[date].sort(
        (a, b) => new Date(a.scheduledTimestamp) - new Date(b.scheduledTimestamp)
      )
    }));
}

/**
 * Helper to compute target timestamp offset from base date
 */
function calculateDate(baseDate, dayOffset, hours, minutes) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + (dayOffset - 1));
  date.setHours(hours, minutes, 0, 0);
  return date;
}

module.exports = runContentCalendarAgent;
module.exports.normalizeCalendarStrategy = normalizeCalendarStrategy;
module.exports.weaveAdminApprovalPayload = weaveAdminApprovalPayload;
module.exports.default = runContentCalendarAgent;