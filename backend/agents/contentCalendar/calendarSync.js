/**
 * CALENDAR SYNC
 * Small helper so the content calendar's per-slot status stays in lockstep
 * with the real Blog / EmailCampaign / WhatsAppCampaign documents that get
 * generated and reviewed for each slot.
 *
 * Flow reminder:
 *   PENDING_ADMIN_APPROVAL (calendar metadata) --admin approves slot-->
 *   APPROVED --content generated--> GENERATED --admin approves content-->
 *   PUBLISHED   (or REJECTED at either gate)
 */
const ContentCalendar = require("../../models/ContentCalendar");

const CHANNEL_SCHEDULE_KEYS = {
  blog: "websiteBlogs",
  email: "emailMessages",
  whatsapp: "whatsappMessages",
};

/**
 * Update one slot's status (and its mirrored calendarView chip) after the
 * generated Blog/EmailCampaign/WhatsAppCampaign document changes state.
 * Safe to call with a missing calendar/slot — it just no-ops.
 *
 * @param {string} calendarId - ContentCalendar.calendarId (e.g. "CAL_...")
 * @param {string} slotKey - e.g. "blog_1", "email_3", "wa_2"
 * @param {"blog"|"email"|"whatsapp"} channel
 * @param {"APPROVED"|"REJECTED"|"GENERATED"|"PUBLISHED"} status
 */
async function syncSlotStatus(calendarId, slotKey, channel, status) {
  if (!calendarId || !slotKey) return;

  const scheduleKey = CHANNEL_SCHEDULE_KEYS[channel];
  if (!scheduleKey) return;

  try {
    const calendar = calendarId.startsWith("CAL_")
      ? await ContentCalendar.findOne({ calendarId })
      : await ContentCalendar.findById(calendarId);

    if (!calendar) return;

    const slot = (calendar.schedule?.[scheduleKey] || []).find((s) => s.slotKey === slotKey);
    if (slot) slot.status = status;

    (calendar.calendarView || []).forEach((day) => {
      (day.items || []).forEach((item) => {
        if (item.slotKey === slotKey) item.status = status;
      });
    });

    await calendar.save();
  } catch (err) {
    // Never let a sync failure break the caller's primary action
    // (e.g. approving a blog should still succeed even if this fails).
    console.warn(`⚠️ Could not sync calendar slot ${slotKey} to ${status}:`, err.message);
  }
}

module.exports = { syncSlotStatus, CHANNEL_SCHEDULE_KEYS };