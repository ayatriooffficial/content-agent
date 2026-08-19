/**
 * EMAIL CAMPAIGN APPROVAL ROUTES
 * Second admin approval gate for email campaigns generated from an
 * approved content-calendar slot. Follows the exact same REST contract
 * as blogRoutes.js so approval-dashboard2's generic resource client
 * (src/api.js RESOURCES.email) works unmodified:
 *
 *   GET   /api/emails              -> { success, emails: [...] }
 *   GET   /api/emails/:id          -> { success, email }
 *   PATCH /api/emails/:id/status   -> { status } -> { success, email }
 *
 * Approving an email here does NOT send it immediately — it flips status
 * to "approved", which is the signal the email-bot (the separate "root"
 * project, services/agentCampaignFetcher.js) polls for. Once that bot
 * actually sends the email it marks status "published" itself.
 */
const express = require("express");
const router = express.Router();

const EmailCampaign = require("../models/EmailCampaign");
const { syncSlotStatus } = require("../agents/contentCalendar/calendarSync");
const ContentCalendar = require("../models/ContentCalendar");
const { writeEmailCampaign } = require("../services/excelConnector");

function normalizeEmail(doc) {
  const email = doc.toObject ? doc.toObject() : { ...doc };
  return {
    ...email,
    status: email.status || "pending",
  };
}

// ─── GET /emails ──
router.get("/emails", async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;

    const emails = await EmailCampaign.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, emails: emails.map(normalizeEmail) });
  } catch (error) {
    return res.status(500).json({ error: "Could not fetch email campaigns." });
  }
});

// ─── GET /emails/:id ──
router.get("/emails/:id", async (req, res) => {
  try {
    const email = await EmailCampaign.findById(req.params.id);
    if (!email) return res.status(404).json({ error: "Email campaign not found" });
    return res.status(200).json({ success: true, email: normalizeEmail(email) });
  } catch (error) {
    return res.status(500).json({ error: "Could not fetch email campaign." });
  }
});

// ─── PATCH /emails/:id/status ──
// "approved" here means "cleared to send" — the email-bot scheduler owns
// actually dispatching it and will flip status to "published" once sent.
router.patch("/emails/:id", async (req, res) => {
  try {
    const updates = req.body || {};
    const allowedFields = ["subject", "heading", "tag", "intro", "stats", "bullets", "programs", "program"];
    const cleaned = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) cleaned[key] = value;
    });

    const email = await EmailCampaign.findByIdAndUpdate(req.params.id, cleaned, { new: true });
    if (!email) return res.status(404).json({ error: "Email campaign not found" });
    return res.status(200).json({ success: true, email: normalizeEmail(email) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update email campaign content." });
  }
});

router.patch("/emails/:id/status", async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ["pending", "approved", "rejected", "published"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid email status." });
  }

  try {
    const email = await EmailCampaign.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!email) return res.status(404).json({ error: "Email campaign not found" });

    // ── Excel connector: on approval, write the approved email into the
    //    shared sheet's "Email Messages" tab so the email-bot can send it.
    if (status === "approved") {
      try {
        let calendar = null;
        if (email.calendarId) {
          calendar = email.calendarId.startsWith("CAL_")
            ? await ContentCalendar.findOne({ calendarId: email.calendarId })
            : await ContentCalendar.findById(email.calendarId);
        }
        await writeEmailCampaign(email, calendar);
      } catch (connErr) {
        console.error("❌ Excel connector (email) failed:", connErr.message);
      }
    }

    // Only reflect a terminal outcome back onto the calendar slot.
    // "approved" stays GENERATED on the slot until the email-bot actually
    // sends it (that transition is synced separately, from the root project).
    if (email.calendarId && email.slotKey && status === "rejected") {
      await syncSlotStatus(email.calendarId, email.slotKey, "email", "REJECTED");
    }

    return res.status(200).json({ success: true, email: normalizeEmail(email) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update email campaign status." });
  }
});

module.exports = router;