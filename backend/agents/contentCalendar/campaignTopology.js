// campaignTopology.js
//
// Builds the slot map that drives the Content Calendar Agent.
// The topology is generated dynamically (instead of hardcoded) so the
// cadence rules stay correct no matter how many days the calendar covers:
//
//   • BLOGS      -> 2 posts per calendar week (independent SEO stream)
//   • EMAIL      -> 5 messages, only within the next NEAR_TERM_WINDOW_DAYS days
//   • WHATSAPP   -> 5 messages, only within the next NEAR_TERM_WINDOW_DAYS days
//
// Blogs are planned across the full calendar because they have a longer
// production lead time. Email/WhatsApp are kept to a short rolling window
// (next 3 days) because they are time-sensitive/reactive — later batches
// are generated in the next cycle (the opportunity agent already re-runs
// research every 15 days, and shorter messaging cycles can call this same
// generator again with a fresh startDate).

const CALENDAR_LENGTH_DAYS = 15;   // Total span the calendar plans for
const BLOGS_PER_WEEK = 2;          // Blog cadence
const NEAR_TERM_WINDOW_DAYS = 3;   // Email/WhatsApp planning window
const EMAILS_IN_WINDOW = 5;        // Email messages inside that window
const WHATSAPP_IN_WINDOW = 5;      // WhatsApp messages inside that window

/**
 * Spreads `count` items as evenly as possible across dayOffsets 1..totalDays.
 * Returns an array of dayOffsets (1-indexed), length === count.
 * Guarantees items never bunch onto a single day unless count > totalDays.
 */
function spreadAcrossDays(count, totalDays) {
  if (count <= 0 || totalDays <= 0) return [];

  const offsets = [];
  // Evenly space items using the classic "step" distribution so they land
  // on different days first, then start doubling up only once every day
  // has been used at least once.
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
 * the calendar window. A trailing partial week (< 7 days left) still gets
 * blog coverage, proportional to how many days remain in it (minimum 1 if
 * at least 2 days remain), so the tail of the calendar is never left empty.
 */
function buildBlogSlots(calendarLengthDays, blogsPerWeek) {
  const slots = [];
  let slotIndex = 1;
  let dayCursor = 1;

  while (dayCursor <= calendarLengthDays) {
    const weekStart = dayCursor;
    const weekEnd = Math.min(weekStart + 6, calendarLengthDays);
    const daysInWeek = weekEnd - weekStart + 1;

    // Full (or near-full) week -> full quota. Short trailing week -> scaled quota.
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

/**
 * Rotating set of strategic purposes so blog slots stay varied regardless
 * of how many total blog slots end up being generated.
 */
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
 * Builds a near-term messaging stream (EMAIL or WHATSAPP): `count` slots
 * spread across the first `windowDays` days only, alternating funnel stage
 * between Awareness and Engagement, staggered by time-of-day so same-day
 * slots don't collide.
 */
function buildNearTermSlots({ channel, type, keyPrefix, count, windowDays, objectives }) {
  const dayOffsets = spreadAcrossDays(count, windowDays);
  const slots = [];

  // Track how many slots have already landed on a given day so we can
  // stagger their time-of-day later in contentCalendarAgent.js.
  const dayOccurrence = {};

  dayOffsets.forEach((dayOffset, i) => {
    dayOccurrence[dayOffset] = (dayOccurrence[dayOffset] || 0) + 1;

    slots.push({
      slotKey: `${keyPrefix}_${i + 1}`,
      dayOffset,
      channel,
      type,
      // First half of the window = Awareness, second half = Engagement
      funnelStage: i < Math.ceil(count / 2) ? "1_AWARENESS" : "2_ENGAGEMENT",
      objective: objectives[i % objectives.length],
      // Which occurrence (0-indexed) this is on its day, used to offset
      // send time so multiple same-day messages don't share a timestamp.
      sameDayIndex: dayOccurrence[dayOffset] - 1
    });
  });

  return slots;
}

const EMAIL_OBJECTIVES = [
  "Highlight Industry Reality & Unaddressed Pain Points",
  "Expose Cost of Inaction & Hidden Mistakes",
  "Mindset Shift & Solutions Teaser",
  "Deliver Framework & Actionable Educational Value",
  "Share Breakdown / Case Study Insights"
];

const WHATSAPP_OBJECTIVES = [
  "Short Punchy Shock Stat & Curiosity Hook",
  "Micro-Insight & 'Did You Know?' Observation",
  "Myth vs. Reality Quick Comparison",
  "Actionable 3-Bullet Micro Cheatsheet",
  "Community Insight & Quick-Reply Poll Question"
];

function generateCampaignTopology(options = {}) {
  const calendarLengthDays = options.calendarLengthDays || CALENDAR_LENGTH_DAYS;
  const blogsPerWeek = options.blogsPerWeek || BLOGS_PER_WEEK;
  const nearTermWindowDays = Math.min(
    options.nearTermWindowDays || NEAR_TERM_WINDOW_DAYS,
    calendarLengthDays
  );
  const emailsInWindow = options.emailsInWindow || EMAILS_IN_WINDOW;
  const whatsappInWindow = options.whatsappInWindow || WHATSAPP_IN_WINDOW;

  const blogSlots = buildBlogSlots(calendarLengthDays, blogsPerWeek);

  const emailSlots = buildNearTermSlots({
    channel: "EMAIL",
    type: "EMAIL",
    keyPrefix: "email",
    count: emailsInWindow,
    windowDays: nearTermWindowDays,
    objectives: EMAIL_OBJECTIVES
  });

  const whatsappSlots = buildNearTermSlots({
    channel: "WHATSAPP",
    type: "WHATSAPP",
    keyPrefix: "wa",
    count: whatsappInWindow,
    windowDays: nearTermWindowDays,
    objectives: WHATSAPP_OBJECTIVES
  });

  return [...blogSlots, ...emailSlots, ...whatsappSlots];
}

// Default topology used by the Content Calendar Agent:
// 15-day span, 2 blogs/week across the whole span, 5 emails + 5 WhatsApp
// messages restricted to the next 3 days only.
const CAMPAIGN_TOPOLOGY = generateCampaignTopology();

module.exports = {
  CAMPAIGN_TOPOLOGY,
  generateCampaignTopology,
  CALENDAR_LENGTH_DAYS,
  BLOGS_PER_WEEK,
  NEAR_TERM_WINDOW_DAYS,
  EMAILS_IN_WINDOW,
  WHATSAPP_IN_WINDOW
};