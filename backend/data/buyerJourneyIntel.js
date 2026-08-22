/**
 * buyerJourneyIntel.js
 * ------------------------------------------------------------------
 * The company's buyer-journey intelligence module, condensed from the
 * `actual byer journey.txt` brief (Buyer Persona + Customer Journey).
 *
 * Pure static DATA — no LLM calls here. Every agent renders the prompt
 * blocks it needs via the helpers below, so the buyer-journey psychology
 * (3-stage funnel, 7 counterparts per stage, messaging pillars, offer
 * hooks, objections, trust factors) is available everywhere WITHOUT
 * duplicating prompt text across agents.
 *
 * The funnels in the system are:
 *   1_AWARENESS  -> journey Awareness  (educate, no sell)
 *   2_ENGAGEMENT -> journey Interest + Consideration (proof, nurture)
 *   3_CONVERSION -> journey Decision   (honest CTA)
 * Post-Purchase/Advocacy stages are intentionally out of scope.
 */

const OFFER_CONTEXT = {
  brand: "Charters Union of Business",
  courseName: "Certified Business Accountant (CBA)",
  targetAudience: [
    "First-year college students",
    "Second-year college students",
    "Final-year college students",
    "Fresh graduates",
    "Unemployed graduates",
    "Early-career strugglers",
  ],
  courseTopic: "Job readiness (practical accounting + English + interview skills)",
  price: "₹35,000 – ₹50,000",
  duration: "7 months",
  deliveryFormat: "In-class / on-campus / hybrid",
  region: "Kolkata / Howrah / near Kolkata city",
  promisedOutcomes: [
    "Job placement",
    "Job readiness",
    "Jobs at global companies",
    "Improved English speaking",
    "Interview readiness",
    "Professional confidence",
    "Career growth",
  ],
};

/**
 * The 3 active funnel stages, each with the journey file's 7 counterparts:
 * User Action, Engagement Touchpoints, Emotional State, Pain Points,
 * Opportunity, Education Environment, Learning Objective.
 */
const JOURNEY_STAGES = {
  "1_AWARENESS": {
    stageLabel: "Awareness (Discovery)",
    copyFramework: "PAS — Problem → Agitate → Curiosity gap. NO solution reveal, NO enrollment push.",
    userAction:
      "Scrolling Instagram/YouTube/Google, seeing an ad or a peer post, stopping on a pain-driven or aspiration-driven hook.",
    engagementTouchpoints:
      "Instagram Reels/ads, YouTube ads & shorts, Google SEO results, AI-overview answers, peer referrals, WhatsApp forwards from college groups.",
    emotionalState:
      "Confused, slightly anxious about the future, curious but not ready to act; comparing themselves with placed peers.",
    painPoints:
      "Degree feels worthless, no practical skills, no idea what companies expect, fear of wasting time after graduation.",
    opportunity:
      "Scroll-stopping hooks that name their exact fear (pattern interrupts), pure education with NO sales pressure, establishing the institute as the guide.",
    educationEnvironment:
      "College campus, home, peer WhatsApp/Telegram groups, social media algorithm feeding career content.",
    learningObjective:
      "Understand that 'degree alone doesn't get hired' and that a job-ready skills gap exists and can be fixed.",
  },
  "2_ENGAGEMENT": {
    stageLabel: "Interest + Consideration (Lead Nurturing)",
    copyFramework: "Proof + Before/After — deliver evidence, invite a reply.",
    userAction:
      "Clicking through to the landing page / blog, saving posts, asking questions on WhatsApp/email, comparing institutes.",
    engagementTouchpoints:
      "Landing page, blogs, WhatsApp/Email/SMS nurturing sequence, success stories, salary proof, myth-busting content, retargeting ads.",
    emotionalState:
      "Hopeful but skeptical; needs proof this is real, needs to feel 'this is exactly for me', afraid of wasting money.",
    painPoints:
      "Placement claims feel fake, ₹50,000 is a big family decision, unsure if the course is practical or just another theory institute.",
    opportunity:
      "Trust signals (placement proof, parent-facing brochure, demo class), objection handling flows, before/after transformation stories, a reply-inviting question.",
    educationEnvironment:
      "Home with parents involved in the decision, college peer groups, review platforms, WhatsApp groups.",
    learningObjective:
      "Believe the institute delivers real job outcomes (placement + practical skills + English + interview) and is worth the investment.",
  },
  "3_CONVERSION": {
    stageLabel: "Decision (Conversion)",
    copyFramework: "AIDA Desire/Action + honest urgency — clear single CTA, no fake scarcity.",
    userAction:
      "Attending counselling/demo, bringing parents, checking EMI/scholarship, applying or booking a seat.",
    engagementTouchpoints:
      "Counseling call, demo class, parent counselling session, campus visit, WhatsApp/email final CTA, application page.",
    emotionalState:
      "Urgent but nervous about making the wrong choice; needs reassurance + a logical ROI case to carry home to parents.",
    painPoints:
      "Fee objections, fear of failing the course, fear of false placement promises, 'will my parents approve?'",
    opportunity:
      "Remove friction: EMI options, scholarship, clear 7-month roadmap, placement support framing, limited-seat honesty, direct 'talk to a counselor' CTA.",
    educationEnvironment:
      "Family decision table, guardian influence, campus/admissions office, one-on-one counseling.",
    learningObjective:
      "Believe the course is an investment with a clear ROI timeline, and the next step (apply / counselling) is safe and easy.",
  },
};

const TRANSFORMATION_FRAME = {
  before:
    "I am confused, lost, and scared about my career — degree but no practical skills, no direction, pressure at home.",
  after:
    "I trust this institute, I see a clear path, and I'm ready to invest in my future.",
};

const MESSAGING_PILLARS = [
  "Degree is the start, not the finish",
  "Practical skills > theory — job-ready from day one",
  "Placement-led transformation (before/after stories)",
  "English speaking + interview confidence included",
  "Global company readiness",
  "Faculty-guided, not self-study chaos",
];

const OFFER_HOOKS = [
  "\"Your degree got you the interview — we get you the job.\"",
  "From 'just another graduate at home' to placed professional.",
  "What ₹50,000 can return: a career, not just a certificate.",
  "7 months to job-ready — here's the exact week-by-week roadmap.",
  "Employers aren't asking for your marksheet. They're asking for practical skills.",
  "Desperate to prove your degree wasn't wasted? Start here.",
  "The placement guarantee question, answered honestly.",
  "Your parents are about to spend ₹50,000. Give them a reason to say yes.",
  "Job-ready accounting + English + interviews — in one program.",
  "Because 'I'll figure it out after graduation' doesn't work anymore.",
];

const SALES_TALKING_POINTS = [
  "Anchor on the transformation, not the course: uncertain student → placed professional.",
  "Bring the parent into the conversation: ROI timeline, placement records with company names + salaries, EMI options.",
  "Resolve the #1 objection first: 'Will I actually get placed?' — show verified placement proof, not promises.",
  "De-risk the decision: demo class, free counselling, scholarship, transparent curriculum.",
  "Urgency without fear: honest batch deadlines and limited seats — never fake scarcity.",
  "End every conversation with one clear next step (demo/counselling/application).",
];

const SHARED_OBJECTIONS = [
  "\"Will this really get me a job?\"",
  "\"Is the placement support genuine or just marketing?\"",
  "\"What if I fail / can't keep up?\"",
  "\"₹50,000 is too expensive for my family.\"",
  "\"I can learn this free on YouTube.\"",
  "\"Already tried another institute and it didn't work.\"",
  "\"Can AI replace this skill anyway?\"",
  "\"Do I need strong English already?\"",
  "\"Is this just theory like college?\"",
  "\"Will companies actually value this certificate?\"",
];

const TRUST_FACTORS = [
  "Real placement records with company names + salary figures",
  "Student success stories from similar backgrounds (Kolkata/Hindi/Bengali speaking)",
  "Demo class / free counselling session",
  "Parent-facing brochure + parent counselling session",
  "Transparent curriculum + clear 7-month roadmap",
  "Faculty who have worked in real companies",
  "Google reviews + local proof",
  "Internship + live projects + portfolio building",
  "EMI / scholarship / installment options",
  "Spoken English + interview training visibly included",
];

const SEARCH_INTENT_EXAMPLES = {
  google: [
    "best accounting course in Kolkata for job",
    "job-ready finance course after B.Com",
    "placement guaranteed accounting course",
    "practical accounting training with internship",
    "high salary skills after B.Com",
  ],
  aiQueries: [
    "What should I learn to get an accounting job as a fresher?",
    "Is a B.Com degree enough to get a job in India?",
    "How fast can I get a job after a 7-month accounting course?",
    "Is Tally/GST training enough to get hired?",
  ],
  redditQuoraVoice: [
    "I have degree knowledge but not practical knowledge",
    "I don't know where to start",
    "Applied to 40 jobs on Naukri and got zero callbacks",
    "My English is weak, will that block me?",
    "Is placement support ever real?",
  ],
  platforms: [
    "Google Search", "YouTube", "Instagram (Reels)", "WhatsApp groups",
    "Telegram study groups", "LinkedIn (observing)", "Quora", "Reddit",
    "Naukri/Internshala/Indeed (discouraged by rejections)",
  ],
};

/** Competitor groups from the end of the buyer journey file. */
const COMPETITOR_GROUPS = {
  accounting: [
    { name: "ICA Job Guarantee", url: "https://www.icajobguarantee.com/", category: "Job Guarantee Programs" },
    { name: "Ready Accountant", url: "https://readyaccountant.com/", category: "Practical Accounting Training" },
    { name: "GTIA India", url: "https://www.gtiaindia.org/", category: "Global Accounting Education" },
    { name: "Plutus Education", url: "https://plutuseducation.com/", category: "Finance Education" },
    { name: "Imarticus Learning", url: "https://imarticus.org/school-of-finance-and-business/", category: "Finance & Business School" },
    { name: "Miles Education", url: "https://www.mileseducation.com/caira", category: "CA/CPA Training" },
    { name: "Stride School AI", url: "https://strideschool.ai/", category: "AI-Powered Education" },
    { name: "GCC School", url: "https://www.gccschool.com/", category: "Commerce Coaching" },
    { name: "IMA (CMA Certification)", url: "https://in.imanet.org/en/IMA-Certifications/CMA-Certification", category: "CMA Certification" },
  ],
  digitalMarketing: [
    { name: "Digital Scholar", url: "https://digitalscholar.in/", category: "Digital Marketing Course" },
    { name: "IIDE", url: "https://iide.co/", category: "Digital Marketing Institute" },
    { name: "PIIDM", url: "https://piidm.com/", category: "Digital Marketing Course" },
    { name: "DSIM", url: "https://www.dsim.in/", category: "Digital Marketing Course" },
    { name: "NIHT", url: "https://www.nihtdigitalmarketing.com/", category: "Digital Marketing Course" },
    { name: "MyIDCM", url: "https://www.myidcm.com/", category: "Digital Marketing Course" },
    { name: "SkillCircle", url: "https://skillcircle.in/", category: "Digital Marketing Course" },
    { name: "Outskill", url: "https://www.outskill.com/", category: "Career Programs" },
    { name: "Kolkata Digital Marketing Institute", url: "https://kolkatadigitalmarketinginstitute.com/", category: "Local DM Institute" },
    { name: "Kraftshala", url: "https://www.kraftshala.com/", category: "Marketing Launchpad" },
    { name: "MICA AI-Powered DMC", url: "https://www.mica.ac.in/online-programmes/advanced-certificate-in-ai-powered-digital-marketing-communication/", category: "Online Certificate" },
  ],
  pgManagement: [
    { name: "Masters Union", url: "https://mastersunion.org/", category: "PG Management" },
    { name: "TETR", url: "https://tetr.com/", category: "PG Business School" },
    { name: "MESA School", url: "https://mesaschool.co/", category: "Business School" },
    { name: "Vedam", url: "https://www.vedam.org/", category: "PG Management" },
    { name: "Altera Institute", url: "https://alterainstitute.com/", category: "Tech & Business" },
    { name: "LIT School", url: "https://www.litschool.in/", category: "Leadership & Tech" },
    { name: "ASM IB School", url: "https://asmibschool.com/admission/", category: "PG Management" },
    { name: "Scaler School of Business", url: "https://www.scaler.com/school-of-business/", category: "Tech Business Program" },
    { name: "Bower School", url: "https://bowerschool.com/", category: "PG Management" },
    { name: "NextLeap", url: "https://nextleap.app/", category: "Tech Career Program" },
    { name: "Polaris Campus", url: "https://polariscampus.com/", category: "PG Management" },
    { name: "PW IOI Management", url: "https://www.pwioi.com/management/bba-management-program?courseId=67fec09232e42cadfe4234f5", category: "Management Program" },
  ],
};

/**
 * Per-program specs. CBA = journey file's main course; DGM = digital
 * marketing stream; TBM = reuses CBA psychology/content for now (per
 * business decision). Course facts (fees/placement) are pulled LIVE from
 * the website data at generation time — only the psychology is static here.
 */
const PROGRAM_SPECS = {
  CBA: {
    code: "CBA",
    label: "Certified Business Accountant",
    domain: "accounting / finance / job-readiness",
    corePromise:
      "Practical accounting skills (SAP S/4HANA, TallyPrime, GST/TDS) + English + AI Career Engine + 100% in-class paid internship across 7 countries with 97.7% placement rate and ₹26.5 LPA average CTC.",
    keyOutcomes: [
      "97.7% Placement Rate",
      "₹26.5 LPA Average CTC (3.05x jump)",
      "SAP S/4HANA & TallyPrime Practical Certification",
      "100% In-Class Paid Internship across 7 countries",
      "Spoken English & Big 4 Interview Readiness",
      "Weekly AI Career Engine progress scoring"
    ],
    commonObjections: SHARED_OBJECTIONS,
    trustFactors: [
      "97.7% placement rate with verified offer letters",
      "₹26.5 LPA average CTC with Big 4 recruiters (KPMG, PwC, EY, Deloitte, Saudi Aramco)",
      "100% in-class paid internship across India, Dubai, US, Singapore, Saudi Arabia, Qatar, Canada",
      "1:1 mentorship from the top 1% CA/CMA/CFA professionals & Fortune 500 CXOs",
      "No-cost EMI starting from ₹5,555/month and ₹16,000 Round 1 scholarships",
      "Placement success-fee model where institute carries placement risk"
    ],
    searchIntents: SEARCH_INTENT_EXAMPLES,
    competitorGroup: "accounting",
    personaDomain: "accounting",
  },
  DGM: {
    code: "DGM",
    label: "Digital Growth & Marketing",
    domain: "digital marketing / growth / performance marketing",
    corePromise:
      "Hands-on performance marketing (supervised live ad spend, GA4, Meta/Google ads, AI automations) + 100% in-class paid internship with 92% placement rate and ₹24.5 LPA average CTC.",
    keyOutcomes: [
      "92% Placement Rate",
      "₹24.5 LPA Average CTC (2.5x salary hike)",
      "Supervised Live Meta & Google Ad Spend with ROAS targets",
      "AI Marketing Automations & GA4 Analytics",
      "100% In-Class Paid Internship across 7 countries",
      "Portfolio of real client campaigns"
    ],
    commonObjections: [
      "\"Isn't digital marketing saturated / just a trend?\"",
      "\"I can learn it free from YouTube / reels.\"",
      "\"Will AI replace performance marketers?\"",
      "\"No portfolio — who will hire me?\"",
      "\"Do I need to be creative/technical to do this?\"",
    ],
    trustFactors: [
      "92% placement rate with top brands (Google, Amazon, Flipkart, Zomato, GrowthX)",
      "₹24.5 LPA average CTC (2.5x salary hike over entry freelancing)",
      "Real ad-budget execution with mentor oversight, not theoretical case studies",
      "100% in-class paid internship across 7 international tech hubs",
      "1:1 mentorship from Growth Heads and CMOs",
      "No-cost EMI starting from ₹5,555/month"
    ],
    searchIntents: {
      google: [
        "digital marketing course in Kolkata for freshers",
        "best digital marketing institute with placement",
        "digital marketing salary for beginners",
        "performance marketing career path",
        "digital marketing course with internship",
      ],
      aiQueries: [
        "Is digital marketing a good career in 2026?",
        "How do I get a digital marketing job without experience?",
        "What skills do I need for performance marketing?",
      ],
      redditQuoraVoice: [
        "Everyone says digital marketing is saturated — is it true?",
        "How do I build a marketing portfolio as a fresher?",
        "Can AI really do all marketing now?",
      ],
      platforms: ["YouTube", "Instagram", "LinkedIn", "Google", "Quora", "Reddit", "WhatsApp groups"],
    },
    competitorGroup: "digitalMarketing",
    personaDomain: "digital-marketing",
  },
};

// TBM defined AFTER CBA/DGM so it can safely reference them.
PROGRAM_SPECS.TBM = {
  code: "TBM",
  label: "Technology & Business Management",
  domain: "technology / business management",
  // Per business decision: TBM leads receive CBA-style content for now.
  corePromise: PROGRAM_SPECS.CBA.corePromise,
  keyOutcomes: PROGRAM_SPECS.CBA.keyOutcomes,
  commonObjections: PROGRAM_SPECS.CBA.commonObjections,
  trustFactors: PROGRAM_SPECS.CBA.trustFactors,
  searchIntents: PROGRAM_SPECS.CBA.searchIntents,
  competitorGroup: "pgManagement",
  personaDomain: "accounting", // reuses CBA persona for now
};

/**
 * Renders a compact prompt block for one funnel stage (metadata + the 7
 * counterparts) — used by calendar, whatsapp and email prompts.
 */
function journeyStagePrompt(stageKey) {
  const stage = JOURNEY_STAGES[stageKey] || JOURNEY_STAGES["1_AWARENESS"];
  return [
    `STAGE: ${stage.stageLabel}`,
    `COPYWRITING FRAMEWORK: ${stage.copyFramework}`,
    `User Action: ${stage.userAction}`,
    `Engagement Touchpoints: ${stage.engagementTouchpoints}`,
    `Emotional State: ${stage.emotionalState}`,
    `Pain Points: ${stage.painPoints}`,
    `Opportunity: ${stage.opportunity}`,
    `Education Environment: ${stage.educationEnvironment}`,
    `Learning Objective: ${stage.learningObjective}`,
  ].join("\n");
}

/**
 * Renders the whole buyer-journey context block (shared psychology + all 3
 * stage definitions) for agents that need full funnel awareness.
 */
function buyerJourneyPromptBlock() {
  return [
    "=== BUYER JOURNEY INTELLIGENCE (Charters Union) ===",
    `Course: ${OFFER_CONTEXT.courseName} | Price: ${OFFER_CONTEXT.price} | Duration: ${OFFER_CONTEXT.duration} | Region: ${OFFER_CONTEXT.region}`,
    `Primary promise: ${OFFER_CONTEXT.promisedOutcomes.join(", ")}`,
    `Transformation frame: FROM "${TRANSFORMATION_FRAME.before}" TO "${TRANSFORMATION_FRAME.after}"`,
    "",
    "Messaging pillars:",
    ...MESSAGING_PILLARS.map((p) => `  - ${p}`),
    "",
    "Offer hooks (choose/adapt, never use verbatim-repetitively):",
    ...OFFER_HOOKS.map((h) => `  - ${h}`),
    "",
    "Shared objections the copy must address:",
    ...SHARED_OBJECTIONS.map((o) => `  - ${o}`),
    "",
    "Trust factors to weave in:",
    ...TRUST_FACTORS.map((t) => `  - ${t}`),
    "",
    "Search intent examples (Google + AI queries + platform voice):",
    `  Google: ${SEARCH_INTENT_EXAMPLES.google.join(" | ")}`,
    `  AI queries: ${SEARCH_INTENT_EXAMPLES.aiQueries.join(" | ")}`,
    `  Their own words: ${SEARCH_INTENT_EXAMPLES.redditQuoraVoice.join(" | ")}`,
    `  Platforms: ${SEARCH_INTENT_EXAMPLES.platforms.join(", ")}`,
    "",
    "Stage-by-stage journey (7 counterparts each):",
    "",
    ...["1_AWARENESS", "2_ENGAGEMENT", "3_CONVERSION"].map((k) => journeyStagePrompt(k)),
  ].join("\n");
}

/**
 * Renders the per-program context block (course promise + objections +
 * trust factors + search intents) so CBA and DGM copy stays on its own
 * course's psychology instead of leaking the other course's.
 */
function programContextPrompt(programCode = "CBA") {
  const spec = PROGRAM_SPECS[programCode] || PROGRAM_SPECS.CBA;
  const intents = spec.searchIntents || SEARCH_INTENT_EXAMPLES;
  return [
    `=== PROGRAM CONTEXT: ${spec.code} (${spec.label}) ===`,
    `Domain: ${spec.domain}`,
    `Core promise: ${spec.corePromise}`,
    `Key outcomes: ${spec.keyOutcomes.join(", ")}`,
    `Course-specific objections: ${(spec.commonObjections || []).slice(0, 8).join(" | ")}`,
    `Course-specific trust factors: ${(spec.trustFactors || []).slice(0, 8).join(" | ")}`,
    `Search intents: ${intents.google.slice(0, 5).join(" | ")}`,
    `AI queries: ${intents.aiQueries.slice(0, 4).join(" | ")}`,
    `Their own words: ${intents.redditQuoraVoice.slice(0, 5).join(" | ")}`,
    `Platforms: ${(intents.platforms || []).slice(0, 8).join(", ")}`,
  ].join("\n");
}

/**
 * Slim persona brief — the subset of journey intel the PERSONA agent needs
 * (offer context, transformation frame, pillars, hooks, objections, trust
 * factors, search intents). Deliberately excludes the 3-stage journey
 * counterparts (those belong to calendar/whatsapp/email prompts) so the
 * Groq fallback leg of the persona call stays under Groq's 8k TPM free-tier
 * limit. NVIDIA (1M ctx) can handle more, but keeping one shared brief
 * means both legs behave identically.
 */
function buyerPersonaBriefBlock() {
  return [
    "=== BUYER PERSONA BRIEF (Charters Union) ===",
    `Course: ${OFFER_CONTEXT.courseName} | Price: ${OFFER_CONTEXT.price} | Duration: ${OFFER_CONTEXT.duration} | Region: ${OFFER_CONTEXT.region}`,
    `Promised outcomes: ${OFFER_CONTEXT.promisedOutcomes.join(", ")}`,
    `Transformation frame: FROM "${TRANSFORMATION_FRAME.before}" TO "${TRANSFORMATION_FRAME.after}"`,
    "",
    "Messaging pillars:",
    ...MESSAGING_PILLARS.map((p) => `  - ${p}`),
    "",
    "Offer hooks (first 5):",
    ...OFFER_HOOKS.slice(0, 5).map((h) => `  - ${h}`),
    "",
    "Shared objections the persona holds:",
    ...SHARED_OBJECTIONS.slice(0, 8).map((o) => `  - ${o}`),
    "",
    "Trust factors the persona needs:",
    ...TRUST_FACTORS.slice(0, 8).map((t) => `  - ${t}`),
    "",
    "Search intent examples:",
    `  Google: ${SEARCH_INTENT_EXAMPLES.google.slice(0, 4).join(" | ")}`,
    `  AI queries: ${SEARCH_INTENT_EXAMPLES.aiQueries.slice(0, 3).join(" | ")}`,
    `  Their own words: ${SEARCH_INTENT_EXAMPLES.redditQuoraVoice.slice(0, 4).join(" | ")}`,
    `  Platforms: ${SEARCH_INTENT_EXAMPLES.platforms.slice(0, 8).join(", ")}`,
  ].join("\n");
}

module.exports = {
  OFFER_CONTEXT,
  JOURNEY_STAGES,
  TRANSFORMATION_FRAME,
  MESSAGING_PILLARS,
  OFFER_HOOKS,
  SALES_TALKING_POINTS,
  SHARED_OBJECTIONS,
  TRUST_FACTORS,
  SEARCH_INTENT_EXAMPLES,
  COMPETITOR_GROUPS,
  PROGRAM_SPECS,
  journeyStagePrompt,
  buyerJourneyPromptBlock,
  buyerPersonaBriefBlock,
  programContextPrompt,
};