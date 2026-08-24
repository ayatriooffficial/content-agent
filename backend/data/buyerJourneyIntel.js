/**
 * buyerJourneyIntel.js
 * ------------------------------------------------------------------
 * The company's buyer-journey intelligence module.
 *
 * PURE BEHAVIORAL PROTOCOL & PSYCHOLOGY DIRECTIVES — NO HARDCODED FACTS.
 * All factual grounding (fees, placement stats, CTC, course durations,
 * faculty, scholarships) comes dynamically from live websiteContext.
 *
 * This file defines:
 *   - 3 Funnel Stages with 8 behavioral dimensions:
 *     (customer_action, touchpoint, emotion, pain_point, opportunity,
 *      content_hooks, messaging_framework, common_mistakes)
 *   - Step-by-step copywriting protocols for each stage
 *   - Messaging pillars & psychology transformation frames
 *   - Universal objection handling & trust verification principles
 *   - Program specs for CBA™, DGM™, and TBM™
 */

const OFFER_CONTEXT = {
  brand: "Charters Union of Business",
  courseName: "Industry-Led Career Programs (CBA™ / DGM™ / TBM™)",
  targetAudience: [
    "First-year college students",
    "Second-year college students",
    "Final-year college students",
    "Fresh graduates",
    "Unemployed graduates",
    "Early-career switchers",
  ],
  courseTopic: "Job readiness (practical skills + English communication + interview mastery)",
  deliveryFormat: "In-class / on-campus / hybrid",
  region: "Pan-India & Global Internships across 7 Countries",
  promisedOutcomes: [
    "Job placement at top multinational companies",
    "Practical industry simulations & live client projects",
    "100% in-class paid internships across 7 international countries",
    "Spoken English & corporate boardroom communication",
    "Big 4 / MNC interview readiness scoring",
    "AI Career Engine progress tracking",
    "Measurable career & salary growth",
  ],
};

/**
 * The 3 active funnel stages with 8 structured behavioral dimensions
 * and exact step-by-step copywriting protocols.
 */
const JOURNEY_STAGES = {
  "1_AWARENESS": {
    stageLabel: "Awareness (Problem & Discovery)",
    messaging_framework: `PAS Framework (5-Step Protocol):
  Step 1 — Name the Silent Pain: Acknowledge that a degree alone is no longer enough in the AI and modern corporate era.
  Step 2 — Remove the Shame: Tell the student that the problem is not their inherent ability — theoretical college curriculums failed to teach modern practical tools.
  Step 3 — Expose the Real Industry Gap: Name the specific gap between memorizing theory and what hiring managers actually test in corporate interviews.
  Step 4 — Hint at the Guided Bridge: Mention hands-on tool mastery, practical exposure, and AI-driven direction — but DO NOT pitch the course yet.
  Step 5 — Strictly NO CTA / Pitch: Do not ask them to call, enroll, or click an admission link in this message.`,
    customer_action: "Scrolling social feeds (Reels/Shorts), searching career roadmaps, feeling insecure about graduation readiness without knowing what skills industry actually tests.",
    touchpoint: "SEO discovery blogs, short-form video hooks, curiosity-driven emails, community WhatsApp discussion starters.",
    emotion: "Anxious, slightly ashamed, comparing self to placed peers, skeptical of generic career advice, curious but passive.",
    pain_point: "Degree has theory but zero practical skills; 0 callbacks on job applications; weak confidence in professional communication and interviews; resume looks empty.",
    opportunity: "Validate their silent struggle with brutal empathy, make them feel deeply understood, name the hidden industry skill gap, and position practical mastery as the obvious missing link.",
    content_hooks: [
      "Why degrees get interviews, but practical simulation wins the offer.",
      "The unspoken truth about why entry-level job hunting feels broken.",
      "From uncertain graduate to industry-ready: what employers actually test.",
      "The hidden skill gap college never warned you about."
    ],
    common_mistakes: "Do not talk about course pricing, syllabus, or institute features. Do not mention fees, EMI, or salary figures. Do not use generic clichés ('unlock your potential', 'transform your future'). Do not promise 100% placement in awareness copy. Do not sound urgent or salesy."
  },
  "2_ENGAGEMENT": {
    stageLabel: "Interest & Consideration (Proof & Transformation)",
    messaging_framework: `Proof + Transformation Framework (6-Step Protocol):
  Step 1 — Acknowledge the Skepticism: Validate that it is normal to be cautious and doubtful when evaluating career institutes.
  Step 2 — Answer the Top Concern First: Address their specific worry (placement authenticity, weak English, non-technical background, or fee return).
  Step 3 — Demonstrate Verified Proof: Share concrete student transformation case studies from similar backgrounds placed at named recruiters.
  Step 4 — Highlight Institutional Differentiators: Weave in the AI Career Engine, 1:1 CXO Mentorship, and 7-Country International Immersion.
  Step 5 — Introduce Financial Flexibility: Mention merit scholarships, no-cost EMI options, and risk-aligned success models from live website data.
  Step 6 — Soft Reply / Demo Invite: Offer a free 1:1 Career Audit or live demo session rather than a hard enrollment pitch.`,
    customer_action: "Reading curriculum breakdowns, reviewing verified alumni placements, comparing mentorship depth against competitors, asking questions on WhatsApp.",
    touchpoint: "Detailed comparison blogs, nurturing email sequence with case studies, direct WhatsApp counselor Q&A, parent-facing program summaries.",
    emotion: "Hopeful yet guarded ('Is this real or another theory institute?'), calculating return on investment, seeking parental confidence.",
    pain_point: "Fear of unverified placement promises, worries about program rigor, concern over family investment security, questions about whether English fluency is a barrier.",
    opportunity: "Present verified hiring partners, real case studies, 1:1 mentor credibility, role clarity (e.g. Accounts Executive, Growth Marketer), and de-risked financing options from live site data.",
    content_hooks: [
      "Real portfolio vs theoretical syllabus: what hiring managers examine.",
      "How supervised industry simulation replaces years of entry-level struggle.",
      "The exact checklist to verify legitimate career placement support.",
      "Why 1:1 mentorship from practicing CXOs changes the placement game."
    ],
    common_mistakes: "Do not ask the student to enroll on first contact. Do not make vague claims without data grounding from live site. Do not ignore parental anxiety. Do not send brochures without context or personal explanation."
  },
  "3_CONVERSION": {
    stageLabel: "Decision & Action (Frictionless Commitment)",
    messaging_framework: `AIDA + Frictionless Commitment Framework (7-Step Protocol):
  Step 1 — Diagnose Fear First: Do not immediately pitch the program. Ask what they and their family are most worried about.
  Step 2 — Mirror & Validate Concern: Repeat their concern in empathetic words so they feel heard.
  Step 3 — Reframe the Investment: Position the program as a guided bridge with measurable salary multipliers and clear ROI.
  Step 4 — Involve Parents & Guardians: Offer parent-friendly counseling and transparent curriculum roadmaps.
  Step 5 — Present Transparent Financial Options: Present dynamic fee breakdowns, No-Cost EMI schedules, and seat booking options from live website data.
  Step 6 — Highlight Verified Safety Nets: Emphasize risk-aligned placement models, mentor accountability, and live hiring partnerships.
  Step 7 — Frictionless Soft Close: Provide a clear, single next step to reserve an upcoming batch seat or schedule a mentor demo.`,
    customer_action: "Attending counseling sessions, reviewing EMI/scholarship breakdowns with parents, booking demo seats, reviewing placement records.",
    touchpoint: "Admissions portal, counselor consultation, final-call email with fee breakdown table, WhatsApp booking link.",
    emotion: "Decisive but looking for reassurance; needs clear next steps, transparent ROI proof, and family alignment.",
    pain_point: "Last-minute hesitation on enrollment security, batch timing conflicts, application friction, 'what if my parents regret this decision?'",
    opportunity: "Provide transparent fee breakdown, highlight merit scholarships, no-cost EMI flexibility, and direct counselor access from live site.",
    content_hooks: [
      "Your step-by-step roadmap to secure your upcoming batch seat.",
      "How our success-aligned model de-risks your career investment.",
      "Talk directly with an admissions mentor to map your personalized career plan.",
      "Everything you need to know about EMI options, scholarships, and batch schedules."
    ],
    common_mistakes: "Never use manipulative fake urgency ('Seats ending in 10 minutes!'). Do not pitch price before diagnosing fear and explaining ROI. Never ignore the parents in the decision. Do not introduce complex multi-step forms."
  }
};

const TRANSFORMATION_FRAME = {
  before:
    "I am confused, lost, and anxious about my career — degree but no practical skills, no direction, feeling family pressure.",
  after:
    "I trust this institute, I see a clear path, and I am confident in my career ROI.",
};

const MESSAGING_PILLARS = [
  "Degree is the starting line, not the finish",
  "Practical skills > theory — job-ready from day one",
  "Placement-led transformation with verified records",
  "English communication + interview mastery included",
  "Global company readiness across 7 countries",
  "Faculty-guided 1:1 mentorship, not self-study chaos",
];

const OFFER_HOOKS = [
  "\"Your degree got you the interview — practical mastery gets you the job.\"",
  "From uncertain graduate to placed corporate professional.",
  "What genuine industry simulation returns: a career, not just a certificate.",
  "The step-by-step roadmap from college theory to corporate hiring.",
  "Employers aren't asking for your marksheet. They're asking for practical capability.",
  "The placement guarantee question, answered honestly with verified data.",
  "Job-ready skills + English fluency + interview scoring — in one unified program.",
  "Because 'I will figure it out after graduation' is no longer a viable strategy.",
];

const SALES_TALKING_POINTS = [
  "Anchor on transformation: uncertain student → placed corporate professional.",
  "Bring the parent into the conversation: ROI timeline, verified recruiter records, flexible EMI options.",
  "Resolve the #1 objection first: 'Will I actually get placed?' — show verified recruiter data, not empty claims.",
  "De-risk the decision: demo class, free counselling, scholarships, transparent curriculum.",
  "Urgency with integrity: honest batch deadlines and limited seats — never artificial scarcity.",
  "End every conversation with one clear next step (demo session / counselling call / application).",
];

const SHARED_OBJECTIONS = [
  "\"Will this program genuinely lead to a high-growth job?\"",
  "\"Is the placement support authentic or just marketing hype?\"",
  "\"What if the curriculum is too fast-paced for my background?\"",
  "\"Is the financial investment manageable for my family?\"",
  "\"Can I learn these tools for free on YouTube?\"",
  "\"I previously tried another coaching institute and it failed to deliver.\"",
  "\"Will artificial intelligence replace entry-level roles in this field?\"",
  "\"Do I need advanced English proficiency before joining?\"",
  "\"Is this just another theoretical syllabus like college?\"",
  "\"Will corporate employers actually value this certification?\"",
];

const TRUST_FACTORS = [
  "Verified placement records with named global recruiters and transparent salary ranges",
  "Authentic student success stories from diverse academic and linguistic backgrounds",
  "Free interactive demo class & 1:1 career counselling session",
  "Transparent curriculum roadmap and weekly milestone benchmarks",
  "Faculty who are practicing CXOs, CAs, CMAs, CFAs, and industry leaders",
  "Live projects, portfolio building, and 100% in-class paid internships across 7 countries",
  "No-cost EMI financing, merit scholarships, and risk-aligned fee structures",
  "Integrated spoken English coaching and mock interview scoring",
];

const SEARCH_INTENT_EXAMPLES = {
  google: [
    "best practical job-ready training course after graduation",
    "high salary skills and certifications for freshers",
    "career program with verified placement support",
    "practical skills training with paid internship",
    "best career switch course with high ROI",
  ],
  aiQueries: [
    "What high-income skills should I learn after graduation?",
    "Is a college degree alone enough to get hired at top MNCs?",
    "How fast can I become job-ready through practical simulation?",
    "What practical certifications do top recruiters look for?",
  ],
  redditQuoraVoice: [
    "I have theoretical knowledge from college but zero practical skills",
    "I don't know where to start my job hunt",
    "Applied to dozens of jobs online and got zero callbacks",
    "My communication skills are holding me back in interviews",
    "How do I verify if a career institute's placement claims are real?",
  ],
  platforms: [
    "Google Search", "YouTube", "Instagram (Reels)", "WhatsApp groups",
    "Telegram study groups", "LinkedIn", "Quora", "Reddit", "Naukri/Internshala",
  ],
};

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
    { name: "Scaler School of Business", url: "https://www.scaler.com/school-of-business/", category: "Tech Business Program" },
    { name: "NextLeap", url: "https://nextleap.app/", category: "Tech Career Program" },
  ],
};

const PROGRAM_SPECS = {
  CBA: {
    code: "CBA",
    label: "Certified Business Accountant",
    domain: "accounting / finance / job-readiness",
    corePromise:
      "AI-powered practical accounting (SAP S/4HANA, TallyPrime, GST/TDS tax compliance) + Spoken English & Corporate Communication + 100% in-class paid internships across 7 countries with verified Big 4 placement pipeline.",
    keyOutcomes: [
      "Industry-standard SAP S/4HANA & TallyPrime certification",
      "100% In-Class Paid Internships across 7 countries",
      "Spoken English & Big 4 Interview readiness scoring",
      "AI Career Engine real-time skill-gap tracking",
      "1:1 mentorship from top 1% CA/CMA/CFA professionals & Fortune 500 CXOs"
    ],
    commonObjections: SHARED_OBJECTIONS,
    trustFactors: [
      "Verified placement records with named recruiters (KPMG, PwC, EY, Deloitte, Saudi Aramco)",
      "100% in-class paid internships across 7 international countries (USA, Canada, Dubai, Singapore, Saudi Arabia, Qatar, India)",
      "1:1 mentorship from top 1% CA/CMA/CFA professionals & Fortune 500 CXO leaders",
      "No-cost EMI financing and merit-based Round 1 scholarships",
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
      "Hands-on performance marketing (supervised live ad spend, GA4, Meta/Google ads, AI marketing automations) + 100% in-class paid internships across 7 countries with verified placement track.",
    keyOutcomes: [
      "Supervised Live Meta & Google Ad Spend with ROAS targets",
      "AI Marketing Automations & GA4 Analytics certification",
      "100% In-Class Paid Internships across 7 international hubs",
      "Portfolio of real client campaigns and ad dashboards",
      "1:1 mentorship from Growth Heads and industry CMOs"
    ],
    commonObjections: [
      "\"Isn't digital marketing saturated / just a trend?\"",
      "\"I can learn it free from YouTube / reels.\"",
      "\"Will AI replace performance marketers?\"",
      "\"No portfolio — who will hire me?\"",
      "\"Do I need to be creative/technical to do this?\"",
    ],
    trustFactors: [
      "Placement records with top brands (Google, Meta Partners, Amazon, Flipkart, Zomato, GrowthX)",
      "Real ad-budget execution with mentor oversight, not theoretical case studies",
      "100% in-class paid internships across 7 international tech hubs",
      "1:1 mentorship from Growth Heads and CMOs",
      "Flexible No-Cost EMI and scholarship financing"
    ],
    searchIntents: {
      google: [
        "best practical digital marketing training for freshers",
        "performance marketing course with real ad spend",
        "digital marketing career path and salary scope",
        "performance marketing course with internship",
      ],
      aiQueries: [
        "Is digital marketing a good career in 2026?",
        "How do I get a digital marketing job without prior experience?",
        "What skills do hiring managers look for in performance marketing?",
      ],
      redditQuoraVoice: [
        "Everyone says digital marketing is saturated — is it true?",
        "How do I build a real marketing portfolio as a fresher?",
        "Can AI really automate all performance marketing?",
      ],
      platforms: ["YouTube", "Instagram", "LinkedIn", "Google", "Quora", "Reddit", "WhatsApp groups"],
    },
    competitorGroup: "digitalMarketing",
    personaDomain: "digital-marketing",
  },
};

PROGRAM_SPECS.TBM = {
  code: "TBM",
  label: "Technology & Business Management",
  domain: "technology / business management",
  corePromise: PROGRAM_SPECS.CBA.corePromise,
  keyOutcomes: PROGRAM_SPECS.CBA.keyOutcomes,
  commonObjections: PROGRAM_SPECS.CBA.commonObjections,
  trustFactors: PROGRAM_SPECS.CBA.trustFactors,
  searchIntents: PROGRAM_SPECS.CBA.searchIntents,
  competitorGroup: "pgManagement",
  personaDomain: "accounting",
};

/**
 * Renders a structured behavioral prompt block for one funnel stage.
 */
function journeyStagePrompt(stageKey) {
  const stage = JOURNEY_STAGES[stageKey] || JOURNEY_STAGES["1_AWARENESS"];
  return [
    `STAGE: ${stage.stageLabel}`,
    `MESSAGING FRAMEWORK: ${stage.messaging_framework}`,
    `Customer Action: ${stage.customer_action}`,
    `Touchpoint Context: ${stage.touchpoint}`,
    `Emotional State: ${stage.emotion}`,
    `Core Pain Point: ${stage.pain_point}`,
    `Copywriting Opportunity: ${stage.opportunity}`,
    `Content Hook Inspiration: ${(stage.content_hooks || []).join(" | ")}`,
    `Strict Guardrails / Mistakes to Avoid: ${stage.common_mistakes}`,
  ].join("\n");
}

/**
 * Full buyer-journey context block for agents that require complete funnel awareness.
 */
function buyerJourneyPromptBlock() {
  return [
    "=== BUYER JOURNEY BEHAVIORAL PROTOCOL (Charters Union) ===",
    `Course Context: ${OFFER_CONTEXT.courseName} | Delivery: ${OFFER_CONTEXT.deliveryFormat}`,
    `Primary Value Proposition: ${OFFER_CONTEXT.promisedOutcomes.join(", ")}`,
    `Psychological Transformation Frame: FROM "${TRANSFORMATION_FRAME.before}" TO "${TRANSFORMATION_FRAME.after}"`,
    "",
    "Core Messaging Pillars:",
    ...MESSAGING_PILLARS.map((p) => `  - ${p}`),
    "",
    "Offer Hook Principles:",
    ...OFFER_HOOKS.map((h) => `  - ${h}`),
    "",
    "Universal Objections to Address:",
    ...SHARED_OBJECTIONS.map((o) => `  - ${o}`),
    "",
    "Trust-Building Verification Factors:",
    ...TRUST_FACTORS.map((t) => `  - ${t}`),
    "",
    "Audience Search & Voice Patterns:",
    `  Google Queries: ${SEARCH_INTENT_EXAMPLES.google.join(" | ")}`,
    `  AI Search Queries: ${SEARCH_INTENT_EXAMPLES.aiQueries.join(" | ")}`,
    `  User Voice (Reddit/Quora): ${SEARCH_INTENT_EXAMPLES.redditQuoraVoice.join(" | ")}`,
    "",
    "3-Stage Behavioral Funnel Specifications:",
    "",
    ...["1_AWARENESS", "2_ENGAGEMENT", "3_CONVERSION"].map((k) => journeyStagePrompt(k)),
  ].join("\n");
}

/**
 * Per-program behavioral context.
 */
function programContextPrompt(programCode = "CBA") {
  const spec = PROGRAM_SPECS[programCode] || PROGRAM_SPECS.CBA;
  const intents = spec.searchIntents || SEARCH_INTENT_EXAMPLES;
  return [
    `=== PROGRAM BEHAVIORAL CONTEXT: ${spec.code} (${spec.label}) ===`,
    `Domain: ${spec.domain}`,
    `Core Promise: ${spec.corePromise}`,
    `Key Outcomes: ${spec.keyOutcomes.join(", ")}`,
    `Course-Specific Objections: ${(spec.commonObjections || []).slice(0, 8).join(" | ")}`,
    `Course-Specific Trust Factors: ${(spec.trustFactors || []).slice(0, 8).join(" | ")}`,
    `Search Intent Patterns: ${intents.google.slice(0, 5).join(" | ")}`,
    `AI Queries: ${intents.aiQueries.slice(0, 4).join(" | ")}`,
    `User Voice: ${intents.redditQuoraVoice.slice(0, 5).join(" | ")}`,
  ].join("\n");
}

/**
 * Persona brief for personaAgent.
 */
function buyerPersonaBriefBlock() {
  return [
    "=== BUYER PERSONA BEHAVIORAL BRIEF ===",
    `Audience: ${OFFER_CONTEXT.courseName}`,
    `Transformation Frame: FROM "${TRANSFORMATION_FRAME.before}" TO "${TRANSFORMATION_FRAME.after}"`,
    "",
    "Messaging Pillars:",
    ...MESSAGING_PILLARS.map((p) => `  - ${p}`),
    "",
    "Offer Hooks:",
    ...OFFER_HOOKS.slice(0, 5).map((h) => `  - ${h}`),
    "",
    "Core Objections:",
    ...SHARED_OBJECTIONS.slice(0, 8).map((o) => `  - ${o}`),
    "",
    "Required Trust Signals:",
    ...TRUST_FACTORS.slice(0, 8).map((t) => `  - ${t}`),
    "",
    "Search & Voice Intent:",
    `  Google: ${SEARCH_INTENT_EXAMPLES.google.slice(0, 4).join(" | ")}`,
    `  AI Search: ${SEARCH_INTENT_EXAMPLES.aiQueries.slice(0, 3).join(" | ")}`,
    `  User Voice: ${SEARCH_INTENT_EXAMPLES.redditQuoraVoice.slice(0, 4).join(" | ")}`,
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
