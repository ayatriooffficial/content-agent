// campaignTopology.js
//
// Builds the slot map that drives the Content Calendar Agent.
//
//   • BLOGS      -> 2 posts per calendar week (independent SEO stream, full 15 days)
//   • EMAIL      -> 6 messages: 3 stages x 3 days x 2 slots/day (Awareness→Engagement→Conversion)
//   • WHATSAPP   -> 6 messages: 3 stages x 3 days x 2 slots/day (Awareness→Engagement→Conversion)
//
// The messaging streams follow the company's 3-stage funnel:
//   Stage 1 (Awareness)   -> Day 1, 2 messages
//   Stage 2 (Engagement)  -> Day 2, 2 messages
//   Stage 3 (Conversion)  -> Day 3, 2 messages
// Each slot's content MUST justify its stage name (see stage-justifying
// objectives below + prompt rules in contentCalendarAgent.js).

const CALENDAR_LENGTH_DAYS = 15;   // Total span the calendar plans for
const BLOGS_PER_WEEK = 2;          // Blog cadence
const MESSAGING_DAYS = 3;          // 3-stage funnel window (3 days)
const MESSAGES_PER_DAY = 2;        // 2 messages/day per channel
const TOTAL_MESSAGES = MESSAGING_DAYS * MESSAGES_PER_DAY; // 6

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
 * slot MUST match the stage's funnel purpose.
 */
const STAGE_OBJECTIVES = {
  EMAIL: {
    "1_AWARENESS": [
      "Introduce the career problem/opportunity — pure education, NO enrollment push",
      "Surface the industry reality & why the audience should care (awareness only)",
      "Educate on what the program is and why it matters — informational tone"
    ],
    "2_ENGAGEMENT": [
      "Deliver proof: placement outcomes, faculty, ROI — invite a reply/question",
      "Share stats, bullets, testimonials — deepen interest and invite interaction",
      "Ask a question / CTA to reply for more details (engagement focus)"
    ],
    "3_CONVERSION": [
      "Drive action: upcoming batch, deadlines, seats filling — clear apply CTA",
      "Fees/EMI/scholarship + apply link + soft urgency (no fake scarcity)",
      "Final call to apply or talk to a counselor — conversion focus"
    ]
  },
  WHATSAPP: {
    "1_AWARENESS": [
      "Short punchy hook about the career problem — educate, no hard sell",
      "'Did you know?' observation that builds awareness of the opportunity",
      "Myth vs reality quick comparison — informational, awareness only"
    ],
    "2_ENGAGEMENT": [
      "Micro-insight with proof (placement/faculty/ROI) — invite a reply",
      "Actionable 3-bullet cheatsheet + question to engage",
      "Community insight + quick-reply poll question (engagement focus)"
    ],
    "3_CONVERSION": [
      "Urgent but honest CTA: batch deadline, seats filling — 'Apply now'",
      "Direct 'talk to a counselor' / apply link push (conversion focus)",
      "Final call with clear next step — no fake urgency"
    ]
  }
};

/**
 * Builds a 3-stage messaging stream (EMAIL or WHATSAPP):
 * 6 slots = Stage1(Day1, 2 slots) → Stage2(Day2, 2 slots) → Stage3(Day3, 2 slots).
 */
function buildStageStream({ channel, type, keyPrefix, objectives }) {
  const slots = [];
  let slotIndex = 1;

  for (let stage = 1; stage <= 3; stage++) {
    const funnelStage = STAGES[stage];
    const dayOffset = stage; // Day 1, 2, 3
    const stageObjectives = objectives[funnelStage];

    for (let slot = 1; slot <= MESSAGES_PER_DAY; slot++) {
      const objectiveIdx = (slot - 1) % stageObjectives.length;
      slots.push({
        slotKey: `${keyPrefix}_${slotIndex}`,
        dayOffset,
        channel,
        type,
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

  const emailSlots = buildStageStream({
    channel: "EMAIL",
    type: "EMAIL",
    keyPrefix: "email",
    objectives: STAGE_OBJECTIVES.EMAIL
  });

  const whatsappSlots = buildStageStream({
    channel: "WHATSAPP",
    type: "WHATSAPP",
    keyPrefix: "wa",
    objectives: STAGE_OBJECTIVES.WHATSAPP
  });

  return [...blogSlots, ...emailSlots, ...whatsappSlots];
}

// Default topology: 15-day span, 2 blogs/week, 6 emails + 6 WhatsApp
// in a 3-stage (Awareness → Engagement → Conversion) 3-day funnel.
const CAMPAIGN_TOPOLOGY = generateCampaignTopology();

module.exports = {
  CAMPAIGN_TOPOLOGY,
  generateCampaignTopology,
  CALENDAR_LENGTH_DAYS,
  BLOGS_PER_WEEK,
  MESSAGING_DAYS,
  MESSAGES_PER_DAY,
  TOTAL_MESSAGES,
  STAGES
};
