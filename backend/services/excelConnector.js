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
 * Resolves the slot number for a campaign slot.
 * Prefers the calendar slot metadata, else parses it from the slotKey
 * (wa_2, email_2_dgm, wa_1_cba → 2, 2, 1). Falls back to 1.
 */
function resolveSlotNumber(slotKey, slotInfo) {
  if (slotInfo && slotInfo.slot) return Number(slotInfo.slot);
  const m = String(slotKey || "").match(/_(\d+)$/);
  if (m) return Number(m[1]) || 1;
  return 1;
}

/**
 * Normalizes a baked-in real first name on the greeting line to the
 * {name} placeholder, preserving WhatsApp line breaks: the greeting sits
 * on its own line, followed by one blank line, then the body.
 */
function normalizeWhatsAppGreeting(content) {
  const lines = String(content || "").split(/\r?\n/);
  const first = (lines[0] || "").trim();

  // Already a placeholder — leave untouched.
  if (/\{\s*name\s*\}/i.test(first)) return content;

  let greeting = null;
  let inlineRest = "";

  // 1) "Hi Anirban," / "Hello Suman!" / "Hey *Om*," (optionally followed
  //    by body text on the same line).
  const greet = first.match(/^(\*?)(?:Hi|Hello|Hey)\s+\*?[A-Za-z][\w.'-]*\*?\s*[,!]?[ \t]*(.*)$/i);
  if (greet) {
    const star = greet[1] || "";
    greeting = `${star}{name}${star ? "*" : ""},`;
    inlineRest = (greet[2] || "").trim();
  } else if (/^(\*?)[A-Za-z][\w.'-]*\*?[ \t]*[,!][ \t]*\*?$/.test(first)) {
    // 2) Bare name greeting: "*Anirban,*" / "Anirban," / "Suman!"
    const star = /^\*/.test(first) ? "*" : "";
    greeting = `${star}{name}${star ? "*" : ""},`;
  }

  if (!greeting) return content;

  const restLines = lines.slice(1);
  while (restLines.length && restLines[0].trim() === "") restLines.shift();

  const rebuilt = [greeting];
  if (inlineRest) {
    rebuilt.push("", inlineRest, ...restLines);
  } else if (restLines.length) {
    rebuilt.push("", ...restLines);
  }
  return rebuilt.join("\n");
}

/**
 * Renders WhatsApp content from the WhatsAppCampaign doc.
 * Normalizes a baked-in real first name in the greeting line to the
 * {name} placeholder so every lead receives their own name.
 */
function buildWhatsAppContent(wa) {
  let content = "";
  if (wa.whatsappMessage && typeof wa.whatsappMessage === "string" && wa.whatsappMessage.trim()) {
    content = wa.whatsappMessage.trim();
  } else {
    const parts = [];
    if (wa.headline) parts.push(wa.headline);
    if (wa.intro) parts.push(wa.intro);
    if (wa.opening) parts.push(wa.opening);
    if (wa.body) parts.push(wa.body);
    if (Array.isArray(wa.bulletPoints) && wa.bulletPoints.length) {
      parts.push(wa.pointsHeading ? wa.pointsHeading : "");
      parts.push(wa.bulletPoints.map((b) => `• ${b}`).join("\n"));
    }
    // SOLUTION HEADING: dynamic bold heading before the solution bullets.
    if (wa.solutionHeading) parts.push(wa.solutionHeading);
    const solutionPoints = Array.isArray(wa.solutionPoints) && wa.solutionPoints.length
      ? wa.solutionPoints.map((s) => `• ${s}`).join("\n")
      : wa.solution || "";
    if (solutionPoints) parts.push(solutionPoints);
    if (wa.ctaText) parts.push(`${wa.ctaText}${wa.ctaUrlPath ? ` — ${wa.ctaUrlPath}` : ""}`);
    if (wa.closing) parts.push(wa.closing);
    content = parts.filter(Boolean).join("\n\n");
  }

  // Deterministic keyword bolding + grammar guard (same as the generator).
  const { boldWhatsAppKeywords, normalizeGrammar } = require("../agents/whatsappGeneratorAgent");
  content = boldWhatsAppKeywords(normalizeGrammar(content));

  content = stripBodyNames(content);

  return normalizeWhatsAppGreeting(content);
}

/**
 * Defensive guard: removes a baked-in real person's name that the AI wrote
 * at the start of a BODY line (e.g. "Anirban, did you know...") — the name
 * is only allowed in the {name} greeting on line 1.
 */
function stripBodyNames(content) {
  if (!content || typeof content !== "string") return content;
  const lines = String(content).split(/\r?\n/);
  // Keep line 1 (the greeting) untouched — it's normalized to {name} later.
  for (let i = 1; i < lines.length; i++) {
    const t = lines[i].trim();
    // "Anirban, did you know..." / "Anirban, ..." / "*Anirban,* ..."
    // Guard: the "name" must be a plausible first name (2-20 letters) and the
    // remainder must not look like a URL/footer (so "Visit: https://..." stays).
    const m = t.match(/^(\*?)([A-Z][a-zA-Z.'-]{1,19})\*?\s*[,:][ \t]+(.+)$/);
    if (m) {
      const name = m[2];
      const rest = m[3].trim();
      // Skip if it's a section heading ("Visit:", "Apply:") or a URL line.
      if (/^(https?:\/\/|www\.)/i.test(rest)) continue;
      if (/^(visit|apply|call|reply|explore|want|ready|would|are|is|does)\b/i.test(name)) continue;
      lines[i] = rest.charAt(0).toUpperCase() + rest.slice(1);
    }
  }
  return lines.join("\n");
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

    const slotInfo = findSlotInfo(calendar, "whatsapp", wa.slotKey);
    const day = slotInfo?.scheduledDay || 1;
    const slot = resolveSlotNumber(wa.slotKey, slotInfo);
    const stage = stageLabel(slotInfo?.funnelStage || wa.funnelStage);
    const time = formatTime(slotInfo?.scheduledTimestamp, slot);
    const content = buildWhatsAppContent(wa);

    let course = String(slotInfo?.course || wa.course || "").trim().toUpperCase();
    if (!course) {
      if (String(wa.slotKey || "").toLowerCase().includes("dgm")) course = "DGM";
      else if (String(wa.slotKey || "").toLowerCase().includes("tbm")) course = "TBM";
      else course = "CBA";
    }

    const rows = await sheet.getRows();
    const existingRow = rows.find((r) => {
      const c = String(r.get("Course") || r._rawData?.[0] || "").trim().toUpperCase();
      const d = String(r.get("Day") || r._rawData?.[2] || "").trim();
      const s = String(r.get("Slot") || r._rawData?.[3] || "").trim();
      return c === course && d === String(day) && s === String(slot);
    });

    if (existingRow) {
      existingRow.set("Stage", stage);
      existingRow.set("Time", time);
      existingRow.set("Content", content);
      await existingRow.save();
      console.log(`   🔄 Updated WhatsApp campaign in Messages tab for ${course} Day ${day} Slot ${slot}`);
    } else {
      await sheet.addRow({
        Course: course,
        Stage: stage,
        Day: String(day),
        Slot: String(slot),
        Time: time,
        "Score From": "",
        "Score To": "",
        Content: content,
      });
      console.log(`   ✅ Added WhatsApp campaign to Messages tab for ${course} Day ${day} Slot ${slot}`);
    }

    return { written: true };
  } catch (err) {
    console.error(`   ❌ Excel write failed (WhatsApp ${wa.slotKey}):`, err.message);
    return { written: false, reason: err.message };
  }
}

/**
 * Writes an approved Email campaign to the "Email Messages" tab.
 * Writes ONLY the exact approved course without copy-pasting to other courses.
 */
async function writeEmailCampaign(email, calendar) {
  try {
    const sheet = await ensureTab("Email Messages", EMAIL_HEADERS);

    const slotInfo = findSlotInfo(calendar, "email", email.slotKey);
    const day = slotInfo?.scheduledDay || 1;
    const slot = resolveSlotNumber(email.slotKey, slotInfo);
    const stage = stageLabel(slotInfo?.funnelStage || email.funnelStage);
    const time = formatTime(slotInfo?.scheduledTimestamp, slot);
    const content = buildEmailContent(email);

    let course = String(slotInfo?.course || email.course || "").trim().toUpperCase();
    if (!course) {
      if (String(email.slotKey || "").toLowerCase().includes("dgm")) course = "DGM";
      else if (String(email.slotKey || "").toLowerCase().includes("tbm")) course = "TBM";
      else course = "CBA";
    }

    const rows = await sheet.getRows();
    const existingRow = rows.find((r) => {
      const c = String(r.get("Course") || r._rawData?.[0] || "").trim().toUpperCase();
      const d = String(r.get("Day") || r._rawData?.[2] || "").trim();
      const s = String(r.get("Slot") || r._rawData?.[3] || "").trim();
      return c === course && d === String(day) && s === String(slot);
    });

    if (existingRow) {
      existingRow.set("Stage", stage);
      existingRow.set("Time", time);
      existingRow.set("Subject", email.subject || "");
      existingRow.set("Content", content);
      await existingRow.save();
      console.log(`   🔄 Updated Email campaign in Email Messages tab for ${course} Day ${day} Slot ${slot}`);
    } else {
      await sheet.addRow({
        Course: course,
        Stage: stage,
        Day: String(day),
        Slot: String(slot),
        Time: time,
        Subject: email.subject || "",
        Content: content,
      });
      console.log(`   ✅ Added Email campaign to Email Messages tab for ${course} Day ${day} Slot ${slot}`);
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
