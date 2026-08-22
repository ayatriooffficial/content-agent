/**
 * WHATSAPP CAMPAIGN APPROVAL ROUTES
 * Second admin approval gate for WhatsApp messages generated from an
 * approved content-calendar slot. Follows the exact same REST contract
 * as blogRoutes.js / emailRoutes.js so approval-dashboard2's generic
 * resource client (src/api.js RESOURCES.whatsapp) works unmodified:
 *
 *   GET   /api/whatsapp              -> { success, whatsapp: [...] }
 *   GET   /api/whatsapp/:id          -> { success, whatsapp }
 *   PATCH /api/whatsapp/:id/status   -> { status } -> { success, whatsapp }
 *
 * There is no live WhatsApp sending integration yet ("whatsapp is not
 * present as of now"), so unlike email there is nothing external to poll
 * for. Approving here auto-completes straight to "published" — the same
 * one-click behaviour as blogs — so the process is fully streamlined
 * end-to-end. Wire an actual WhatsApp Business API dispatch call where
 * marked below once that channel exists.
 */
const express = require("express");
const router = express.Router();

const WhatsAppCampaign = require("../models/WhatsAppCampaign");
const { syncSlotStatus } = require("../agents/contentCalendar/calendarSync");
const ContentCalendar = require("../models/ContentCalendar");
const { writeWhatsAppCampaign } = require("../services/excelConnector");

function normalizeWhatsApp(doc) {
  const wa = doc.toObject ? doc.toObject() : { ...doc };
  return {
    ...wa,
    status: wa.status || "pending",
  };
}

// ─── GET /whatsapp ──
router.get("/whatsapp", async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;

    const messages = await WhatsAppCampaign.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, whatsapp: messages.map(normalizeWhatsApp) });
  } catch (error) {
    return res.status(500).json({ error: "Could not fetch WhatsApp campaigns." });
  }
});

// ─── GET /whatsapp/:id ──
router.get("/whatsapp/:id", async (req, res) => {
  try {
    const message = await WhatsAppCampaign.findById(req.params.id);
    if (!message) return res.status(404).json({ error: "WhatsApp campaign not found" });
    return res.status(200).json({ success: true, whatsapp: normalizeWhatsApp(message) });
  } catch (error) {
    return res.status(500).json({ error: "Could not fetch WhatsApp campaign." });
  }
});

// ─── PATCH /whatsapp/:id/status ──
router.patch("/whatsapp/:id", async (req, res) => {
  try {
    const updates = req.body || {};
    const allowedFields = ["audienceSegment", "headline", "opening", "body", "bulletPoints", "ctaText", "ctaUrlPath", "ctaReasoning", "closing", "whatsappMessage", "summary", "tone", "metadata"];
    const cleaned = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) cleaned[key] = value;
    });

    const message = await WhatsAppCampaign.findByIdAndUpdate(req.params.id, cleaned, { new: true });
    if (!message) return res.status(404).json({ error: "WhatsApp campaign not found" });
    return res.status(200).json({ success: true, whatsapp: normalizeWhatsApp(message) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update WhatsApp campaign content." });
  }
});

function normalizeStatus(raw) {
  const s = String(raw || "").toLowerCase().trim();
  if (s === "approve" || s === "approved") return "approved";
  if (s === "reject" || s === "rejected") return "rejected";
  if (s === "publish" || s === "published") return "published";
  if (s === "pending") return "pending";
  return null;
}

router.patch("/whatsapp/:id/status", async (req, res) => {
  const rawStatus = req.body?.status;
  const status = normalizeStatus(rawStatus);

  if (!status) {
    return res.status(400).json({ error: "Invalid WhatsApp status." });
  }

  try {
    const message = await WhatsAppCampaign.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!message) return res.status(404).json({ error: "WhatsApp campaign not found" });

    // ── Excel connector: on approval or publish, write the approved message into the
    //    shared sheet's "Messages" tab so the whatsapp-bot can send it.
    if (status === "approved" || status === "published") {
      try {
        let calendar = null;
        if (message.calendarId) {
          calendar = message.calendarId.startsWith("CAL_")
            ? await ContentCalendar.findOne({ calendarId: message.calendarId })
            : await ContentCalendar.findById(message.calendarId);
        }
        await writeWhatsAppCampaign(message, calendar);
      } catch (connErr) {
        console.error("❌ Excel connector (whatsapp) failed:", connErr.message);
      }
    }

    if (message.calendarId && message.slotKey) {
      if (status === "rejected") {
        await syncSlotStatus(message.calendarId, message.slotKey, "whatsapp", "REJECTED");
      } else if (status === "published") {
        await syncSlotStatus(message.calendarId, message.slotKey, "whatsapp", "PUBLISHED");
      } else if (status === "approved") {
        await syncSlotStatus(message.calendarId, message.slotKey, "whatsapp", "GENERATED");
      }
    }

    return res.status(200).json({ success: true, whatsapp: normalizeWhatsApp(message) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update WhatsApp campaign status." });
  }
});

module.exports = router;