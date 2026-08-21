/**
 * excelConnector.js — writes approved Email/WhatsApp campaigns from the
 * content-agent into the shared Google Sheet tabs, so the whatsapp-bot and
 * email-bot can pick them up and send them.
 *
 * Tabs:
 *   - "Messages"        (WhatsApp) : Course | Stage | Day | Slot | Time | Score From | Score To | Content
 *   - "Email Messages"  (Email)    : Course | Stage | Day | Slot | Time | Subject | Content
 *
 * Uses the same service account as the WhatsApp bot:
 *   charters-sheets@charters-union.iam.gserviceaccount.com
 * Credentials come from the content-agent .env (copied from the bot env):
 *   SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY
 */

const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const SHEET_ID = process.env.SHEET_ID || "1bAO5B_OEQGWpFNLIJKLvj0ju0ogGk85N7NmNU6DORv4";
const SERVICE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "charters-sheets@charters-union.iam.gserviceaccount.com";
const PRIVATE_KEY = String(process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

const WHATSAPP_HEADERS = ["Course", "Stage", "Day", "Slot", "Time", "Score From", "Score To", "Content"];
const EMAIL_HEADERS = ["Course", "Stage", "Day", "Slot", "Time", "Subject", "Content"];

const auth = new JWT({
  email: SERVICE_EMAIL,
  key: PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const doc = new GoogleSpreadsheet(SHEET_ID, auth);
let docReady = false;

async function ensureDoc() {
  if (!docReady) {
    await doc.loadInfo();
    docReady = true;
  }
  return doc;
}

async function ensureTab(title, headers) {
  const d = await ensureDoc();
  let sheet = d.sheetsByTitle[title];
  if (!sheet) {
    sheet = await d.addSheet({ title, headerValues: headers });
    console.log(`   ↳ Excel tab "${title}" created with headers`);
  } else {
    // Ensure header row exists (first row)
    await sheet.loadCells("A1:H1");
    const a1 = sheet.getCell(0, 0).value;
    if (!a1) {
      await sheet.setHeaderRow(headers);
      console.log(`   ↳ Excel tab "${title}" header seeded`);
    }
  }
  return sheet;
}

function stageLabel(funnelStage) {
  const map = {
    "1_AWARENESS": "Awareness",
    "2_ENGAGEMENT": "Engagement",
    "3_CONVERSION": "Conversion",
  };
  return map[funnelStage] || funnelStage || "";
}

/**
 * Builds an email body from the EmailCampaign doc (intro + stats + bullets).
 */
function buildEmailContent(email) {
  const parts = [];
  if (email.intro) parts.push(email.intro);
  if (Array.isArray(email.stats) && email.stats.length) {
    parts.push(email.stats.map((s) => `${s.label}: ${s.value}`).join("\n"));
  }
  if (Array.isArray(email.bullets) && email.bullets.length) {
    parts.push(email.bullets.map((b) => `• ${b}`).join("\n"));
  }
  return parts.filter(Boolean).join("\n\n");
}

/**
 * Renders WhatsApp content from the WhatsAppCampaign doc.
 */
function buildWhatsAppContent(wa) {
  const parts = [];
  if (wa.headline) parts.push(wa.headline);
  if (wa.opening) parts.push(wa.opening);
  if (wa.body) parts.push(wa.body);
  if (Array.isArray(wa.bulletPoints) && wa.bulletPoints.length) {
    parts.push(wa.bulletPoints.map((b) => `• ${b}`).join("\n"));
  }
  if (wa.ctaText) parts.push(`${wa.ctaText}${wa.ctaUrlPath ? ` — ${wa.ctaUrlPath}` : ""}`);
  if (wa.closing) parts.push(wa.closing);
  return parts.filter(Boolean).join("\n\n");
}

/**
 * Writes an approved WhatsApp campaign to the "Messages" tab.
 * Dedupes by calendarId+slotKey so the same campaign isn't written twice.
 * Course column is now filled (CBA/DGM) — TBM leads receive the CBA rows
 * (mirror rows), per the business decision.
 */
async function writeWhatsAppCampaign(wa, calendar) {
  try {
    const sheet = await ensureTab("Messages", WHATSAPP_HEADERS);

    // Dedupe: skip if this calendarId+slotKey already exists
    const rows = await sheet.getRows();
    const dup = rows.some(
      (r) =>
        String(r.get("Time") || "").includes(`${wa.calendarId}::${wa.slotKey}`) ||
        (r._rawData && r._rawData.join("|").includes(`${wa.calendarId}::${wa.slotKey}`))
    );
    if (dup) {
      console.log(`   ⏭️  WhatsApp campaign ${wa.slotKey} already in Excel — skip`);
      return { written: false, reason: "duplicate" };
    }

    const slotInfo = findSlotInfo(calendar, "whatsapp", wa.slotKey);
    const day = slotInfo?.scheduledDay || 1;
    const slot = slotInfo?.slot || 1;
    const stage = stageLabel(slotInfo?.funnelStage || wa.funnelStage);
    const time = formatTime(slotInfo?.scheduledTimestamp, slot);

    const content = buildWhatsAppContent(wa);
    const course = slotInfo?.course || wa.course || "CBA";

    // Primary course row + TBM mirror row (TBM leads receive CBA content)
    const coursesToWrite = course === "CBA" ? ["CBA", "TBM"] : [course];

    for (const targetCourse of coursesToWrite) {
      await sheet.addRow([
        targetCourse,
        stage,
        String(day),
        String(slot),
        time,
        "", // Score From
        "", // Score To
        content,
        `${wa.calendarId}::${wa.slotKey}::${targetCourse}` // hidden dedupe marker in col I
      ]);
      console.log(`   ✅ WhatsApp campaign ${wa.slotKey} → Messages tab (${targetCourse})`);
    }
    return { written: true };
  } catch (err) {
    console.error(`   ❌ Excel write failed (WhatsApp ${wa.slotKey}):`, err.message);
    return { written: false, reason: err.message };
  }
}

/**
 * Writes an approved Email campaign to the "Email Messages" tab.
 * Course column is now filled (CBA/DGM) — TBM leads receive the CBA rows
 * (mirror rows), per the business decision.
 */
async function writeEmailCampaign(email, calendar) {
  try {
    const sheet = await ensureTab("Email Messages", EMAIL_HEADERS);

    const rows = await sheet.getRows();
    const dup = rows.some((r) =>
      r._rawData && r._rawData.join("|").includes(`${email.calendarId}::${email.slotKey}`)
    );
    if (dup) {
      console.log(`   ⏭️  Email campaign ${email.slotKey} already in Excel — skip`);
      return { written: false, reason: "duplicate" };
    }

    const slotInfo = findSlotInfo(calendar, "email", email.slotKey);
    const day = slotInfo?.scheduledDay || 1;
    const slot = slotInfo?.slot || 1;
    const stage = stageLabel(slotInfo?.funnelStage || email.funnelStage);
    const time = formatTime(slotInfo?.scheduledTimestamp, slot);

    const content = buildEmailContent(email);
    const course = slotInfo?.course || email.course || "CBA";

    // Primary course row + TBM mirror row (TBM leads receive CBA content)
    const coursesToWrite = course === "CBA" ? ["CBA", "TBM"] : [course];

    for (const targetCourse of coursesToWrite) {
      await sheet.addRow([
        targetCourse,
        stage,
        String(day),
        String(slot),
        time,
        email.subject || "",
        content,
        `${email.calendarId}::${email.slotKey}::${targetCourse}` // hidden dedupe marker in col H
      ]);
      console.log(`   ✅ Email campaign ${email.slotKey} → Email Messages tab (${targetCourse})`);
    }
    return { written: true };
  } catch (err) {
    console.error(`   ❌ Excel write failed (Email ${email.slotKey}):`, err.message);
    return { written: false, reason: err.message };
  }
}

/**
 * Finds a slot's metadata in the calendar (for a given channel + slotKey).
 */
function findSlotInfo(calendar, channel, slotKey) {
  if (!calendar) return null;
  const scheduleKey =
    channel === "email" ? "emailMessages" : channel === "whatsapp" ? "whatsappMessages" : "websiteBlogs";
  const slots = calendar.schedule?.[scheduleKey] || [];
  return slots.find((s) => s.slotKey === slotKey) || null;
}

function formatTime(iso, slot) {
  if (!iso) return slot === 2 ? "18:00" : "10:00";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

module.exports = { writeWhatsAppCampaign, writeEmailCampaign };
