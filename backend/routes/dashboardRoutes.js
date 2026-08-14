/**
 * DASHBOARD API ROUTES
 * API endpoints for the autonomous intelligence dashboard.
 */
const express = require("express");
const router = express.Router();

const Blog = require("../models/Blog");
const PipelineRun = require("../models/PipelineRun");
const OpportunityScore = require("../models/OpportunityScore");
const MemoryContext = require("../models/MemoryContext");
const ContentCalendar = require("../models/ContentCalendar");

const { executeAutonomousRun, getSchedulerStatus } = require("../scheduler/cronScheduler");
const { runAutonomousPipeline } = require("../agents/autonomousPipeline");
const {
  generateBlogForSlot,
  generateEmailForSlot,
  generateWhatsAppForSlot,
} = require("../agents/contentCalendar/slotContentAgent");

// Maps the ":channel" route param to the matching schedule array + the
// field on the slot that stores a reference to the generated document.
const CHANNEL_SLOT_MAP = {
  blog: { scheduleKey: "websiteBlogs", generatedField: "generatedBlogId", generator: generateBlogForSlot },
  email: { scheduleKey: "emailMessages", generatedField: "generatedEmailId", generator: generateEmailForSlot },
  whatsapp: { scheduleKey: "whatsappMessages", generatedField: "generatedWhatsAppId", generator: generateWhatsAppForSlot },
};

async function findCalendar(id) {
  return id.startsWith("CAL_")
    ? await ContentCalendar.findOne({ calendarId: id })
    : await ContentCalendar.findById(id);
}

function findSlot(calendar, scheduleKey, slotKey) {
  return (calendar.schedule?.[scheduleKey] || []).find((s) => s.slotKey === slotKey);
}

function applySelectedSlotOption(slot, selectedOptionIndex = 0) {
  if (!slot || !Array.isArray(slot.options) || !slot.options.length) return slot;

  const safeIndex = Number.isInteger(selectedOptionIndex) ? selectedOptionIndex : 0;
  const option = slot.options[Math.min(Math.max(safeIndex, 0), slot.options.length - 1)];
  if (!option) return slot;

  if (slot.channel === "WEBSITE") {
    slot.title = option.title || slot.title;
    slot.primaryKeyword = option.primaryKeyword || slot.primaryKeyword || "";
    slot.gapKeywords = Array.isArray(option.gapKeywords) && option.gapKeywords.length ? option.gapKeywords : (slot.gapKeywords || []);
    slot.coreAngle = option.coreAngle || slot.coreAngle || "";
  } else if (slot.channel === "EMAIL") {
    slot.subjectLine = option.subjectLine || slot.subjectLine;
    slot.previewText = option.previewText || slot.previewText || "";
    slot.gapKeywords = Array.isArray(option.gapKeywords) && option.gapKeywords.length ? option.gapKeywords : (slot.gapKeywords || []);
    slot.coreAngle = option.coreAngle || slot.coreAngle || "";
  } else if (slot.channel === "WHATSAPP") {
    slot.whatsappHook = option.whatsappHook || slot.whatsappHook;
    slot.gapKeywords = Array.isArray(option.gapKeywords) && option.gapKeywords.length ? option.gapKeywords : (slot.gapKeywords || []);
    slot.ctaGoal = option.ctaGoal || slot.ctaGoal || "";
  }

  slot.selectedOptionIndex = safeIndex;
  return slot;
}

function normalizeGapKeywords(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeSlotOption(channel, rawOption = {}) {
  const option = { ...rawOption };
  option.gapKeywords = normalizeGapKeywords(option.gapKeywords);

  if (channel === "WEBSITE") {
    option.title = typeof option.title === "string" ? option.title.trim() : option.title;
    option.primaryKeyword = typeof option.primaryKeyword === "string" ? option.primaryKeyword.trim() : option.primaryKeyword || "";
    option.coreAngle = typeof option.coreAngle === "string" ? option.coreAngle.trim() : option.coreAngle || "";
  }

  if (channel === "EMAIL") {
    option.subjectLine = typeof option.subjectLine === "string" ? option.subjectLine.trim() : option.subjectLine;
    option.previewText = typeof option.previewText === "string" ? option.previewText.trim() : option.previewText || "";
    option.coreAngle = typeof option.coreAngle === "string" ? option.coreAngle.trim() : option.coreAngle || "";
  }

  if (channel === "WHATSAPP") {
    option.whatsappHook = typeof option.whatsappHook === "string" ? option.whatsappHook.trim() : option.whatsappHook;
    option.ctaGoal = typeof option.ctaGoal === "string" ? option.ctaGoal.trim() : option.ctaGoal || "";
  }

  return option;
}

function markCalendarViewStatus(calendar, slotKey, status) {
  (calendar.calendarView || []).forEach((day) => {
    (day.items || []).forEach((item) => {
      if (item.slotKey === slotKey) item.status = status;
    });
  });
}

function syncCalendarViewOption(calendar, slotKey, slot) {
  if (!calendar || !slotKey || !slot) return;

  (calendar.calendarView || []).forEach((day) => {
    (day.items || []).forEach((item) => {
      if (item.slotKey !== slotKey) return;

      item.options = Array.isArray(slot.options) ? slot.options.map((option) => ({ ...option })) : [];
      item.selectedOptionIndex = Number.isInteger(slot.selectedOptionIndex) ? slot.selectedOptionIndex : 0;

      if (slot.channel === "WEBSITE") {
        const option = item.options[item.selectedOptionIndex] || item.options[0] || {};
        item.label = option.title || item.label || slot.title || "Untitled";
      } else if (slot.channel === "EMAIL") {
        const option = item.options[item.selectedOptionIndex] || item.options[0] || {};
        item.label = option.subjectLine || item.label || slot.subjectLine || "Untitled";
      } else if (slot.channel === "WHATSAPP") {
        const option = item.options[item.selectedOptionIndex] || item.options[0] || {};
        item.label = option.whatsappHook || item.label || slot.whatsappHook || "Untitled";
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/stats — System-wide statistics
// ═══════════════════════════════════════════════════════════════════
router.get("/stats", async (req, res) => {
  try {
    const totalBlogs = await Blog.countDocuments();
    const autonomousBlogs = await Blog.countDocuments({ generatedBy: "autonomous" });
    const totalRuns = await PipelineRun.countDocuments();
    const successfulRuns = await PipelineRun.countDocuments({ status: "completed" });
    const failedRuns = await PipelineRun.countDocuments({ status: "failed" });

    const latestBlog = await Blog.findOne().sort({ createdAt: -1 }).select("title category audienceCategory createdAt validationScore");
    const latestRun = await PipelineRun.findOne().sort({ startedAt: -1 }).select("runId status selectedAudienceCategory durationMs startedAt");

    const avgValidation = await Blog.aggregate([
      { $group: { _id: null, avg: { $avg: "$validationScore" } } }
    ]);

    // Category distribution
    const categoryDist = await Blog.aggregate([
      { $group: { _id: "$audienceCategory", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Location distribution (Filtered out for UI privacy)
    const locationDist = [];

    const scheduler = getSchedulerStatus();

    return res.json({
      success: true,
      stats: {
        totalBlogs,
        autonomousBlogs,
        totalRuns,
        successfulRuns,
        failedRuns,
        avgValidationScore: Math.round(avgValidation[0]?.avg || 0),
        categoryDistribution: categoryDist,
        locationDistribution: locationDist,
        latestBlog,
        latestRun,
        scheduler
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch dashboard stats." });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/pipeline-runs — History of autonomous runs
// ═══════════════════════════════════════════════════════════════════
router.get("/pipeline-runs", async (req, res) => {
  try {
    const runs = await PipelineRun.find()
      .sort({ startedAt: -1 })
      .limit(20)
      .select("runId runType status selectedAudienceCategory opportunityScore generatedBlogTitle durationMs startedAt completedAt error failedAtStep selectionReasoning");
    
    return res.json({ success: true, runs });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch pipeline runs." });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/pipeline-runs/:runId — Single run with full agent outputs
// ═══════════════════════════════════════════════════════════════════
router.get("/pipeline-runs/:runId", async (req, res) => {
  try {
    const run = await PipelineRun.findOne({ runId: req.params.runId });
    if (!run) return res.status(404).json({ error: "Pipeline run not found." });
    return res.json({ success: true, run });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch pipeline run." });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/opportunities — Current opportunity scores
// ═══════════════════════════════════════════════════════════════════
router.get("/opportunities", async (req, res) => {
  try {
    const latest = await OpportunityScore.find()
      .sort({ analyzedAt: -1 })
      .limit(5);
    
    return res.json({ success: true, opportunities: latest });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch opportunity scores." });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/insights — Latest research/competitor/persona insights
// ═══════════════════════════════════════════════════════════════════
router.get("/insights", async (req, res) => {
  try {
    const latestRun = await PipelineRun.findOne({ status: "completed" })
      .sort({ startedAt: -1 })
      .select("agentOutputs selectedAudienceCategory startedAt");

    const memory = await MemoryContext.findOne({ niche: "ACCOUNTING" });

    return res.json({
      success: true,
      insights: {
        latestAgentOutputs: latestRun?.agentOutputs || null,
        selectedCategory: latestRun?.selectedAudienceCategory || null,
        analyzedAt: latestRun?.startedAt || null,
        memoryStats: memory ? {
          totalTitles: (memory.generatedTitles || []).length,
          totalKeywords: (memory.usedKeywords || []).length,
          totalHooks: (memory.successfulHooks || []).length,
          totalStrategies: (memory.emotionalStrategies || []).length,
          locationPatterns: (memory.locationPatterns || []).length,
          competitorGaps: (memory.competitorGapHistory || []).length,
        } : null
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch insights." });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/dashboard/trigger — Manually trigger autonomous pipeline
// ═══════════════════════════════════════════════════════════════════
router.post("/trigger", async (req, res) => {
  try {
    const scheduler = getSchedulerStatus();
    if (scheduler.isRunning) {
      return res.status(409).json({ error: "Pipeline is already running." });
    }

    // Start pipeline in background (don't await)
    executeAutonomousRun("manual_trigger");

    return res.json({
      success: true,
      message: "Autonomous pipeline triggered. Monitor progress via SSE stream.",
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to trigger pipeline." });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/stream — SSE stream for live pipeline status
// ═══════════════════════════════════════════════════════════════════
router.get("/stream", async (req, res) => {
  // ✅ Bug fix: guard against launching a 2nd pipeline if one is already running
  const schedulerCheck = getSchedulerStatus();
  if (schedulerCheck.isRunning) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ step: "error", status: "blocked", data: { message: "Pipeline is already running. Use /trigger to monitor." } })}\n\n`);
    res.write(`event: done\ndata: [DONE]\n\n`);
    return res.end();
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Start pipeline with SSE writer
  try {
    const result = await runAutonomousPipeline({
      runType: "manual_trigger",
      sseWriter: (chunk) => {
        try { res.write(chunk); } catch (e) { /* client disconnected */ }
      }
    });

    res.write(`event: done\ndata: [DONE]\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ step: "error", status: "failed", data: { message: err.message } })}\n\n`);
    res.end();
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/calendars — List content calendars (most recent first)
// ═══════════════════════════════════════════════════════════════════
router.get("/calendars", async (req, res) => {
  try {
    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }

    const calendars = await ContentCalendar.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 20)
      .select("calendarId campaignName status timeframe summary audienceCategory targetLocation createdAt");

    return res.json({ success: true, calendars });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch content calendars." });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/calendars/:id — Single calendar, ready for calendar UI
// Accepts either the Mongo _id or the human-readable calendarId (CAL_...)
// ═══════════════════════════════════════════════════════════════════
router.get("/calendars/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const calendar = id.startsWith("CAL_")
      ? await ContentCalendar.findOne({ calendarId: id })
      : await ContentCalendar.findById(id);

    if (!calendar) return res.status(404).json({ error: "Content calendar not found." });

    return res.json({ success: true, calendar });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch content calendar." });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PATCH /api/dashboard/calendars/:calendarId/slots/:channel/:slotKey/approve
// FIRST admin approval gate — approves a single calendar slot's metadata
// (title/subject/hook + gap keywords) and immediately generates the real
// content for it (blog / email / whatsapp), saved with status "pending"
// so it lands in the SECOND approval gate (the content review queue).
// ═══════════════════════════════════════════════════════════════════
router.patch("/calendars/:calendarId/slots/:channel/:slotKey/approve", async (req, res) => {
  try {
    const { calendarId, channel, slotKey } = req.params;
    const { selectedOptionIndex = 0 } = req.body || {};
    const channelConfig = CHANNEL_SLOT_MAP[channel];
    if (!channelConfig) {
      return res.status(400).json({ error: "Invalid channel. Use blog, email, or whatsapp." });
    }

    const calendar = await findCalendar(calendarId);
    if (!calendar) return res.status(404).json({ error: "Content calendar not found." });

    const slot = findSlot(calendar, channelConfig.scheduleKey, slotKey);
    if (!slot) return res.status(404).json({ error: `Slot ${slotKey} not found in ${channel} stream.` });

    if (slot.status === "GENERATED" || slot.status === "PUBLISHED") {
      return res.status(409).json({ error: `Slot is already ${slot.status.toLowerCase()}.` });
    }

    applySelectedSlotOption(slot, Number(selectedOptionIndex));
    slot.status = "APPROVED";
    await calendar.save();

    let generatedDoc;
    try {
      generatedDoc = await channelConfig.generator(calendar, slot);
    } catch (genErr) {
      console.error(`❌ Slot content generation failed for ${slotKey}:`, genErr.message);
      // Leave the slot APPROVED (not GENERATED) so the admin can retry.
      return res.status(500).json({ error: `Content generation failed: ${genErr.message}` });
    }

    // Re-fetch — generation can take a while, so read-modify-write against
    // the latest doc instead of the possibly-stale in-memory `calendar`.
    const freshCalendar = await findCalendar(calendarId);
    const freshSlot = findSlot(freshCalendar, channelConfig.scheduleKey, slotKey);
    freshSlot.status = "GENERATED";
    freshSlot[channelConfig.generatedField] = generatedDoc._id;
    markCalendarViewStatus(freshCalendar, slotKey, "GENERATED");
    await freshCalendar.save();

    return res.json({ success: true, calendar: freshCalendar, generated: generatedDoc });
  } catch (error) {
    console.error("❌ Slot approval error:", error);
    return res.status(500).json({ error: "Failed to approve and generate slot content." });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PATCH /api/dashboard/calendars/:calendarId/slots/:channel/:slotKey/reject
// FIRST admin approval gate — rejects a single calendar slot. No content
// is generated for it.
// ═══════════════════════════════════════════════════════════════════
router.patch("/calendars/:calendarId/slots/:channel/:slotKey/reject", async (req, res) => {
  try {
    const { calendarId, channel, slotKey } = req.params;
    const channelConfig = CHANNEL_SLOT_MAP[channel];
    if (!channelConfig) {
      return res.status(400).json({ error: "Invalid channel. Use blog, email, or whatsapp." });
    }

    const calendar = await findCalendar(calendarId);
    if (!calendar) return res.status(404).json({ error: "Content calendar not found." });

    const slot = findSlot(calendar, channelConfig.scheduleKey, slotKey);
    if (!slot) return res.status(404).json({ error: `Slot ${slotKey} not found in ${channel} stream.` });

    slot.status = "REJECTED";
    markCalendarViewStatus(calendar, slotKey, "REJECTED");
    await calendar.save();

    return res.json({ success: true, calendar });
  } catch (error) {
    console.error("❌ Slot rejection error:", error);
    return res.status(500).json({ error: "Failed to reject slot." });
  }
});

router.patch("/calendars/:calendarId/slots/:channel/:slotKey/options/:optionIndex", async (req, res) => {
  try {
    const { calendarId, channel, slotKey, optionIndex } = req.params;
    const channelConfig = CHANNEL_SLOT_MAP[channel];
    if (!channelConfig) {
      return res.status(400).json({ error: "Invalid channel. Use blog, email, or whatsapp." });
    }

    const calendar = await findCalendar(calendarId);
    if (!calendar) return res.status(404).json({ error: "Content calendar not found." });

    const slot = findSlot(calendar, channelConfig.scheduleKey, slotKey);
    if (!slot) return res.status(404).json({ error: `Slot ${slotKey} not found in ${channel} stream.` });

    const index = Number(optionIndex);
    if (!Number.isInteger(index) || index < 0 || !Array.isArray(slot.options) || !slot.options[index]) {
      return res.status(404).json({ error: "Option not found for editing." });
    }

    const editedOption = normalizeSlotOption(channel, req.body?.option || {});
    slot.options[index] = { ...slot.options[index], ...editedOption };
    slot.selectedOptionIndex = index;
    applySelectedSlotOption(slot, index);
    syncCalendarViewOption(calendar, slotKey, slot);
    await calendar.save();

    return res.json({ success: true, calendar });
  } catch (error) {
    console.error("❌ Slot option edit error:", error);
    return res.status(500).json({ error: "Failed to save edited option." });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/dashboard/scheduler — Scheduler status
// ═══════════════════════════════════════════════════════════════════
router.get("/scheduler", async (req, res) => {
  try {
    return res.json({ success: true, scheduler: getSchedulerStatus() });
  } catch (error) {
    return res.status(500).json({ error: "Failed to get scheduler status." });
  }
});

module.exports = router;