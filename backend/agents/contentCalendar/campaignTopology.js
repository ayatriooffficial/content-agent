// campaignTopology.js
//
// Builds the slot map that drives the Content Calendar Agent.
//
//   • BLOGS      -> 2 posts per calendar week (independent SEO stream, full 15 days)
//   • EMAIL      -> 12 messages: 6 CBA + 6 DGM (3 stages x 3 days x 2 slots/day
//                   per course) — Awareness→Engagement→Conversion
//   • WHATSAPP   -> 12 messages: 6 CBA + 6 DGM (same 3-stage funnel per course)
//
// The messaging streams follow the company's 3-stage funnel:
//   Stage 1 (Awareness)   -> Day 1, 2 messages per course
//   Stage 2 (Engagement)  -> Day 2, 2 messages per course
//   Stage 3 (Conversion)  -> Day 3, 2 messages per course
//
// Each slot's content MUST justify its stage name (see stage-justifying
// objectives + prompt rules in contentCalendarAgent.js). Every messaging
// slot also carries a `course` tag (CBA|DGM) so CBA leads receive the CBA
// copy, DGM leads the DGM copy (TBM falls back to CBA rows in the sheet).
// Slot keys are course-unique (email_1 vs email_dgm_1) so the calendar
// dedupe-by-slotKey and sheet dedupe marker never collide.

const { journeyStagePrompt } = require("../../data/buyerJourneyIntel");

const CALENDAR_LENGTH_DAYS = 15;   // Total span the calendar plans for
const BLOGS_PER_WEEK = 2;          // Blog cadence
const MESSAGING_DAYS = 3;          // 3-stage funnel window (3 days)
const MESSAGES_PER_DAY = 2;        // 2 messages/day per channel per course
const TOTAL_MESSAGES = MESSAGING_DAYS * MESSAGES_PER_DAY; // 6 (per channel per course)
const COURSES = ["CBA", "DGM"];    // Both courses get their own messaging stream

const STAGES = {
  1: "1_AWARENESS",
  2: "2_ENGAGEMENT",
  3: "3_CONVERSION",
};

/**
 * Spreads `count` items as evenly as possible across dayOffsets 1..totalDays.
 * Returns an array of dayOffsets (1-indexed), length === count.
 */
function spreadAcrossDays(count, totalDays) {
  if (count <= 0 || totalDays <= 0) return [];
  const offsets = [];
  for (let i = 0; i < count; i++) {
    const position = totalDays <= 1
      ? 1
      : 1 + Math.round((i * (totalDays - 1)) / Math.max(count - 1, 1));
    offsets.push(Math.min(Math.max(position, 1), totalDays));
  }
  return offsets;
}

/**
 * Builds the BLOG stream: BLOGS_PER_WEEK posts for every 7-day block inside
 * the calendar window. Blogs span the full 15-day calendar.
 */
function buildBlogSlots(calendarLengthDays, blogsPerWeek) {
  const slots = [];
  let slotIndex = 1;
  let dayCursor = 1;

  while (dayCursor <= calendarLengthDays) {
    const weekStart = dayCursor;
    const weekEnd = Math.min(weekStart + 6, calendarLengthDays);
    const daysInWeek = weekEnd - weekStart + 1;
    const quota = daysInWeek >= 7
      ? blogsPerWeek
      : Math.max(daysInWeek >= 2 ? 1 : 0, Math.round(blogsPerWeek * (daysInWeek / 7)));

    const offsetsWithinWeek = spreadAcrossDays(quota, daysInWeek)
      .map(offset => weekStart + offset - 1);

    offsetsWithinWeek.forEach(dayOffset => {
      slots.push({
        slotKey: `blog_${slotIndex}`,
        dayOffset,
        channel: "WEBSITE",
        type: "BLOG",
        course: "CBA", // blogs are public SEO — tagged CBA by default
        purpose: pickBlogPurpose(slotIndex)
      });
      slotIndex++;
    });

    dayCursor = weekEnd + 1;
  }

  return slots;
}

function pickBlogPurpose(index) {
  const purposes = [
    "Industry Shift / Primary SEO Pillar",
    "Practical Tool & Skill Masterclass",
    "Local Market Benchmark & Salary/ROI Guide",
    "Common Industry Errors & How to Fix Them",
    "Advanced Technical Roadmap",
    "Comprehensive Resource Hub & Future Trends"
  ];
  return purposes[(index - 1) % purposes.length];
}

/**
 * Stage-justifying objectives per channel — the copy generated for each
 * slot MUST match the stage's funnel purpose. Appends the buyer-journey
 * stage's 7 counterparts so downstream generators stay psychologically
 * grounded per stage.
 */
function buildStageObjectives(baseObjectives) {
  const enriched = {};
  Object.entries(baseObjectives).forEach(([stageKey, objectives]) => {
    const journeyBlock = journeyStagePrompt(stageKey);
    enriched[stageKey] = objectives.map((o) => `${o}\n\nJOURNEY CONTEXT (stage ${stageKey}):\n${journeyBlock}`);
  });
  return enriched;
}

const STAGE_OBJECTIVES = {
  EMAIL: buildStageObjectives({
    "1_AWARENESS": [
      "Morning Focus (Slot 1): The Macro Perspective & Industry Shift — educate on the real-world career challenge, why traditional degrees fall short, pure informational value with ZERO enrollment push.",
      "Evening Focus (Slot 2): The Actionable Skill Breakdown — concrete competencies modern top recruiters expect, practical case-study importance, informational awareness tone without hard selling."
    ],
    "2_ENGAGEMENT": [
      "Morning Focus (Slot 1): Curriculum & Mentorship Architecture — practical live case study model, corporate mentors, comparison table with conventional programs.",
      "Evening Focus (Slot 2): Concrete Outcomes & Recruiter Proof — verified placement stats, hiring partners (KPMG, PwC, EY, Deloitte), salary benchmarks, soft invitation to reply or ask a question."
    ],
    "3_CONVERSION": [
      "Morning Focus (Slot 1): Transparent Admission Roadmap & Financial Support — upcoming batch start dates, scholarship evaluation, EMI affordability details.",
      "Evening Focus (Slot 2): Final Action & Counselor Consultation — direct application steps, upcoming batch seat allocation, booking an admissions advisory session."
    ]
  }),
  WHATSAPP: buildStageObjectives({
    "1_AWARENESS": [
      "Morning Focus (Slot 1): 1:1 Tool Diagnostic & Career Roadmap — conversational check-in on practical tool baseline from live program data, link to /career-path, ZERO hard selling.",
      "Evening Focus (Slot 2): Day-in-the-Life & Practical Weekly Structure — hands-on practical lab simulation vs passive lectures from live program format, invite 'Reply WEEK'."
    ],
    "2_ENGAGEMENT": [
      "Morning Focus (Slot 1): Single Verified Proof Byte & Recruiter Outcomes — audited placement metrics and hiring partners from live data, invite 'Reply PROOF'.",
      "Evening Focus (Slot 2): 1:1 Practicing Industry Mentor Access — mock interviews and executive coaching from live faculty data, invite 'Reply CALL'."
    ],
    "3_CONVERSION": [
      "Morning Focus (Slot 1): Plain-Language Logistics, Batch Schedule & Flexible EMI — upcoming start dates, schedule flexibility, and starting EMI from live fee data, invite 'Reply ELIGIBLE'.",
      "Evening Focus (Slot 2): Round 1 Fast-Track Seat Allocation Notice — 3-step evaluation and transparent seat reservation link."
    ]
  })
};

/**
 * Builds a 3-stage messaging stream (EMAIL or WHATSAPP) for ONE course:
 * 6 slots = Stage1(Day1, 2 slots) → Stage2(Day2, 2 slots) → Stage3(Day3, 2 slots).
 * slotKey gets a `_${course.toLowerCase()}` suffix for every course after CBA
 * so keys stay globally unique (email_1, email_1_dgm, ...).
 */
function buildStageStream({ channel, type, keyPrefix, objectives, course }) {
  const slots = [];
  let slotIndex = 1;

  for (let stage = 1; stage <= 3; stage++) {
    const funnelStage = STAGES[stage];
    const dayOffset = stage; // Day 1, 2, 3
    const stageObjectives = objectives[funnelStage];

    for (let slot = 1; slot <= MESSAGES_PER_DAY; slot++) {
      const objectiveIdx = (slot - 1) % stageObjectives.length;
      const courseSuffix = course === "CBA" ? "" : `_${course.toLowerCase()}`;
      slots.push({
        slotKey: `${keyPrefix}_${slotIndex}${courseSuffix}`,
        dayOffset,
        channel,
        type,
        course,
        funnelStage,
        slot,                       // 1 or 2 within the day
        objective: stageObjectives[objectiveIdx],
        sameDayIndex: slot - 1      // 0 or 1 → stagger send time
      });
      slotIndex++;
    }
  }

  return slots;
}

function generateCampaignTopology(options = {}) {
  const calendarLengthDays = options.calendarLengthDays || CALENDAR_LENGTH_DAYS;
  const blogsPerWeek = options.blogsPerWeek || BLOGS_PER_WEEK;

  const blogSlots = buildBlogSlots(calendarLengthDays, blogsPerWeek);

  const emailSlots = COURSES.flatMap((course) =>
    buildStageStream({
      channel: "EMAIL",
      type: "EMAIL",
      keyPrefix: course === "CBA" ? "email" : "email",
      objectives: STAGE_OBJECTIVES.EMAIL,
      course
    })
  );

  const whatsappSlots = COURSES.flatMap((course) =>
    buildStageStream({
      channel: "WHATSAPP",
      type: "WHATSAPP",
      keyPrefix: "wa",
      objectives: STAGE_OBJECTIVES.WHATSAPP,
      course
    })
  );

  return [...blogSlots, ...emailSlots, ...whatsappSlots];
}

// Default topology: 15-day span, 2 blogs/week, 6 CBA + 6 DGM emails,
// 6 CBA + 6 DGM WhatsApp, each in a 3-stage (Awareness → Engagement →
// Conversion) 3-day funnel.
const CAMPAIGN_TOPOLOGY = generateCampaignTopology();

module.exports = {
  CAMPAIGN_TOPOLOGY,
  generateCampaignTopology,
  CALENDAR_LENGTH_DAYS,
  BLOGS_PER_WEEK,
  MESSAGING_DAYS,
  MESSAGES_PER_DAY,
  TOTAL_MESSAGES,
  STAGES,
  COURSES,
};