/**
 * CERTIFIED BUSINESS ACCOUNTANT — PRIMARY BUYER PERSONA
 * Reorganized from raw persona/customer-journey brief into the
 * PERSONA_TEMPLATES architecture (see accounting-persona-templates.js),
 * extended with additional top-level sections to hold fields that
 * don't fit the original 12-block structure (course economics,
 * buyer-vs-user split, competitor landscape, messaging assets, etc).
 *
 * Source: unfilled "Riya Sen" brief provided for a Kolkata/Howrah
 * job-readiness accounting course (Certified Business Accountant).
 * Nothing here is invented — every field below is a direct
 * reorganization of the original brief's content.
 */

const OFFER_CONTEXT = {
  courseName: "Certified Business Accountant",
  targetAudience: [
    "First-year college students",
    "Second-year college students",
    "Final-year college students",
    "Fresh graduates",
    "Unemployed graduates",
    "Early-career strugglers"
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
    "Career growth"
  ]
};

const RIYA_SEN_PERSONA = {
  id: "riya-sen-final-year-bcom",
  label: "Riya Sen — \"I Need a Real Career, Not Just a Degree\" Aspirant",
  audienceCategory: "Final-Year College Student / Fresh Graduate (Primary Buyer Persona)",
  domains: ["accounting", "finance", "job-readiness", "bcom", "english-speaking", "interview-prep", "placement"],

  // ═══════════════════ A. PERSONA IDENTITY ═══════════════════
  personaIdentity: {
    name: "Riya Sen",
    age: "20–23 (character age: 21)",
    gender: "Female skew, but applicable to all genders",
    educationLevel: "B.Com / BBA / B.Com (Hons) — final-year or recently graduated",
    currentCareerStatus: "Student nearing graduation / unemployed graduate actively job-searching",
    location: "Kolkata, or nearby Howrah / Dum Dum / Barasat; some migrate from Tier-2/3 towns to study in Kolkata",
    employmentStatus: "Unemployed / occasional tuition income (₹1,000–₹3,000/month)",
    classBackground: "Lower-middle-class to middle-class",
    familyBackground: "Parents heavily influence education spending decisions; household decision-making is collective, not individual",
    financialBackground: "Household income ₹25,000–₹45,000/month",
    livingSituation: "Lives with parents; no relocation pressure",
    languageComfort: "Bengali + Hindi + basic English; understands English academically but lacks spoken fluency",
    deviceBehavior: "Mobile-first; laptop only for classes or assignments",
    oneLineSummary: "A responsible, anxious final-year commerce student who did everything she was told to do — and is now realizing a degree alone won't get her hired."
  },

  // ═══════════════════ B. HUMAN SNAPSHOT ═══════════════════
  humanSnapshot: "Riya is not lazy, not unserious, and not confused in the traditional sense. She is anxious because she has done what she was told — go to college, pass exams, get a degree — but now realizes the degree alone may not get her hired. She watches classmates post internship updates on LinkedIn while she still feels underprepared even for a basic interview. She doesn't want to become \"just another graduate at home.\" She wants a professional identity, financial respect, and a job at a known company where she can proudly say: \"I work in finance/accounts.\" Externally she stays composed — she doesn't usually say \"I'm scared\" — but her behavior gives it away: she saves career reels but doesn't always act, she compares herself to better-performing peers, and she fears wasting time more than she fears hard work. She secretly worries she isn't \"good enough\" for global companies, and she wants people to see her as capable, not average.",

  // ═══════════════════ C. WHO INFLUENCES THE DECISION ═══════════════════
  buyerVsUser: {
    user: "Riya — she is the one who will attend classes, use the skills, and apply for jobs.",
    economicApprover: "Her father (primary), with her mother and sometimes an elder sibling as secondary influencers.",
    dynamic: "Riya self-identifies interest and does the research, but ₹50,000 requires collective family approval. She will likely bring her father to the demo/counselling session before committing.",
    implication: "Marketing and sales must speak to Riya emotionally (identity, fear of falling behind) while equipping her with a parent-facing rational case (ROI, placement proof, EMI) she can carry home."
  },

  // ═══════════════════ VOICE OF CUSTOMER ═══════════════════
  voiceOfCustomer: {
    definingQuote: "\"I'm not incapable. I just don't know what companies actually expect.\"",
    hiddenInsecurity: "What if I go to interviews and freeze — or get rejected simply because I'm from a normal college?",
    commonPhrases: [
      "I don't know where to start",
      "I have degree knowledge but not practical knowledge",
      "I am not confident in interviews",
      "My English is weak",
      "I need job security",
      "I want a proper corporate job",
      "I don't want to sit at home after graduation"
    ]
  },

  // ═══════════════════ LIFE SITUATION ═══════════════════
  lifeSituation: {
    education: "Final-year B.Com — strong theoretical grounding, zero hands-on workplace exposure",
    income: "None, or ₹1,000–₹3,000/month from tuitions",
    familyPressure: "Parents expect placement soon after graduation; relatives ask \"What are you doing now?\"",
    financialCondition: "Lower-middle to middle class; ₹50,000 is a significant but not impossible sum for the household",
    influenceSystem: "College peers, LinkedIn (observes more than posts), YouTube career educators, WhatsApp/Telegram groups, family",
    livingEnvironment: "Lives at home with parents; balances final-semester academics with mounting job-search anxiety"
  },

  // ═══════════════════ D. PSYCHOGRAPHICS ═══════════════════
  psychographics: {
    whoTheyAre: "A deeply aspirational but externally composed final-year commerce student caught between academic completion and career uncertainty.",
    desperatelyWant: "A professional identity and financial independence — to stop being \"just another graduate at home.\"",
    values: "Structure, validation, a clear roadmap, and trusted/serious institutions over flashy promises.",
    aspires: "To work at a known/global company and tell relatives \"I work in finance/accounts\" with pride.",
    frustrates: "Working hard through college yet feeling zero industry-readiness; a degree that never taught practical, employer-facing skills.",
    givesHope: "Seeing students from similar colleges/backgrounds get placed; structured, step-by-step guidance.",
    seesSuccess: "Getting hired within a few months, having a job title she can share with relatives, earning her own salary.",
    comparesAgainst: "Better-performing classmates, especially those posting internship/placement updates on LinkedIn.",
    scares: "Becoming unemployed after graduation; disappointing her parents; being permanently judged for weak English; running out of time as graduation approaches.",
    transformationSought: "From uncertain student and low-confidence speaker to polished, interview-ready, employable professional.",
    whyNotAchievedYet: "No professional network, no real internship story, a resume that says nothing beyond \"fresher with B.Com,\" and a college placement cell that doesn't really function.",
    objectionsStopHer: "Cost relative to family income, fear the course is theory-heavy like college, fear of embarrassment if she doesn't get placed after her parents pay.",
    urgencyNow: "Graduation approaching; classmates getting placed first; zero callbacks from job portals.",
    trustBuilders: "Verifiable placement records, real student stories from similar backgrounds, a parent-facing counselling session, a visible campus.",
    instantResonanceMessage: "\"Your degree is the start, not the finish — become job-ready for corporate and global accounting roles.\""
  },

  // ═══════════════════ E. PERSONALITY AND MINDSET ═══════════════════
  personalityAndMindset: {
    confidenceLevel: "Moderate but fragile — undermined by lack of practical exposure",
    ambitionLevel: "High — wants a recognized, respected corporate career, not just any job",
    selfBelief: "Conditional: believes she can succeed \"if I get the right guidance\"",
    discipline: "High — responsible, exam-focused, takes education seriously",
    emotionalMaturity: "High — slightly overthinking but self-aware about her gaps",
    riskTolerance: "Low — needs certainty before spending family money",
    overallState: "Fear-driven but ambitious; acts only once urgency hits; needs reassurance before committing.",
    hiddenMindset: "\"I'm not incapable. I just don't know what companies actually expect.\""
  },

  // ═══════════════════ F. CAREER GOALS ═══════════════════
  careerGoals: {
    shortTerm: [
      "Get her first corporate accounting/finance job",
      "Get placed at a Big 4 or MNC within 6 months of graduation",
      "Earn a starting salary of ₹25,000–₹35,000/month",
      "Become job-ready for roles like Junior Accountant, Accounts Executive, Finance Operations Associate, AP/AR Associate, MIS/Reporting Executive, Global Accounting Support"
    ],
    longTerm: [
      "Build internationally relevant skills",
      "Build a long-term career with steady salary growth",
      "Become the \"stable earning child\" in the family",
      "Make her parents proud and contribute financially to the household",
      "Improve English speaking and interview confidence permanently"
    ]
  },

  // ═══════════════════ TRANSFORMATION GOAL ═══════════════════
  transformationGoal: {
    beforeState: "Confused graduate with no practical skills — uncertain student, low-confidence speaker, degree holder without direction",
    afterState: "Industry-ready professional with portfolio, interview confidence, and a placement offer at a known/global company — polished candidate, interview-ready, employable accounting fresher with a real career path",
    emotionalGoal: "To feel less lost, to prove she is not \"average,\" and to earn the right to say \"I work in finance/accounts\" with pride."
  },

  // ═══════════════════ G. BIGGEST PAIN POINTS ═══════════════════
  painPoints: {
    practical: [
      "Theory knowledge but no workplace confidence",
      "No understanding of how accounting works in a real corporate environment",
      "No professional network — doesn't know a single person working in finance",
      "Applies on Naukri.com but gets zero callbacks",
      "Weak in Excel, practical accounting entries, ERP/Tally exposure",
      "No real internship story to tell",
      "College placement cell doesn't actually work",
      "Resume is blank beyond \"fresher with B.Com\"",
      "No idea how to use LinkedIn — no professional photo, no connections"
    ],
    emotional: [
      "Weak confidence in interview answers and spoken English",
      "Feels like she's running out of time as graduation nears",
      "Unsure whether she is \"good enough\" for global companies"
    ]
  },

  // ═══════════════════ H. EMOTIONAL TRIGGERS ═══════════════════
  emotionalTriggers: [
    "Fear of becoming unemployed after graduation",
    "Fear of disappointing parents",
    "Seeing classmates get placed before her",
    "Relatives asking \"What are you doing now?\"",
    "Wanting to prove she is not \"average\"",
    "Desire for financial independence",
    "Wanting to speak confidently in English in professional settings"
  ],

  // ═══════════════════ I. FEAR OF INACTION ═══════════════════
  fearOfInaction: {
    outcomesIfNoAction: [
      "Remains unemployed / underemployed, stuck in a fresher role indefinitely",
      "Low salary for years due to skill gap",
      "Career stagnation while peers advance",
      "Rejection cycle continues — generic rejections, no feedback, no visibility",
      "Financial dependency on parents continues",
      "Loses opportunities to better-prepared competitors",
      "Permanent self-doubt about spoken English and interview ability"
    ],
    supportingContext: "Reflects a broader market reality: Indian learners increasingly need practical, employability-linked education, since job readiness, communication, and applied exposure remain the biggest gaps between graduation and hiring."
  },

  // ═══════════════════ FEARS AND FRUSTRATIONS (verbatim voice) ═══════════════════
  fearsAndFrustrationsVoice: [
    "Working so hard in college but feeling zero industry-readiness",
    "What if I go to interviews and freeze?",
    "What if companies reject me because I'm from a normal college?",
    "What if others already know more practical things than me?",
    "Never being able to speak English fluently — feeling permanently judged",
    "Why didn't college teach us the things jobs actually need?"
  ],

  // ═══════════════════ J. AFFORDABILITY CONCERNS ═══════════════════
  affordabilityConcerns: {
    perception: "₹50,000 is not impossible for the family, but it is significant and needs clear justification.",
    emiExpectation: "EMI in the ₹5,000–₹8,000/month range feels manageable.",
    familyPushback: "Parents may ask: \"Can't you learn this from YouTube instead?\"",
    approvalPath: "Father typically needs to be personally convinced — often via a demo/counselling session.",
    roiNeed: "Needs a concrete ROI story: \"Students who completed this course earn ₹X within Y months.\"",
    idealFraming: "Payment tied to placement guarantee would remove the biggest barrier; framed as \"pay now, secure internship support.\"",
    comparisonPoint: "Parents compare the fee to college tuition or coaching-class costs.",
    financingNeeds: ["EMI", "Installment plan", "Scholarship/discount"],
    coreBeliefNeeded: "The course must be seen as a career shortcut/investment, not an expense or a gamble."
  },

  // ═══════════════════ K. PURCHASE BARRIERS ═══════════════════
  purchaseBarriers: [
    "₹50,000 feels like a big amount for the family even with support",
    "Needs a clear, quick ROI to justify the spend",
    "Worries whether the course is genuinely \"worth it\"",
    "Fear it may be another theory-heavy institute, like college",
    "Needs strong, verifiable evidence of placements for unemployed graduates specifically",
    "Wants clarity on how quickly she can expect a job after finishing",
    "Fear of embarrassment if parents pay and she still doesn't get placed"
  ],

  // ═══════════════════ L. OBJECTIONS BEFORE PURCHASE ═══════════════════
  objectionsBeforePurchase: {
    triggerEvents: [
      "Graduation date approaching with no job in hand",
      "A friend/classmate gets placed",
      "Another round of zero callbacks on Naukri.com",
      "A disappointing conversation with relatives about her plans"
    ],
    evaluationCriteria: "Compares institutes primarily on verifiable placement proof and practical (not theoretical) curriculum; price matters but is secondary to trust and outcome certainty.",
    exactObjections: [
      "Is ₹50,000 worth it? (fear of wasting family's money)",
      "Will I actually get placement help?",
      "How quickly can I expect to get a job after this course?",
      "Is this beginner-friendly?",
      "Is the internship guaranteed to lead to a full-time offer?",
      "Will I actually get placed, or is this a false promise?",
      "What kind of companies hire from this program, especially for freshers/unemployed graduates?",
      "I'm not good with AI/tech stuff — what if I fail the course itself?",
      "Will the 'AI-driven' aspect truly give me an edge, or is it just a buzzword?",
      "Do I need strong English already to join?",
      "Is this certificate recognized? Will it have market value?",
      "Will this teach practical work, or just concepts again?",
      "Is the internship real and useful?",
      "Will companies actually value this credential?",
      "How many students got jobs after this program?",
      "Why should I trust this over free online content?"
    ]
  },

  // ═══════════════════ M. TRUST FACTORS NEEDED BEFORE PURCHASE ═══════════════════
  trustFactorsNeeded: [
    "Real student success stories from Kolkata / similar backgrounds",
    "Internship proof and placement records with company names and salary figures",
    "Clear explanation of how the AI + accounting combination opens new job categories",
    "Flexible batch timings (confirmed weekend/evening classes)",
    "A parent-facing brochure she can show her father",
    "A parent counselling session — parents need to feel they're investing, not gambling",
    "Clear curriculum with practical tools and outcomes",
    "Ability to visit the physical campus and feel the environment",
    "A free demo class / free counselling session mapping her specific career path",
    "Live demo of AI tools + internship project showcase",
    "Faculty who have worked in global accounting firms",
    "A transparent placement process",
    "Timeline clarity: \"In 7 months, here is exactly what happens\"",
    "Financing options — zero-cost EMI, scholarship, deferred payment",
    "Spoken English and interview training clearly included in the curriculum"
  ],

  // ═══════════════════ N. MOTIVATIONS FOR BUYING ═══════════════════
  motivationsForBuying: [
    "Job security and a high starting salary, quickly",
    "Real-world skill enhancement (AI, global accounting, business communication) that her degree lacks",
    "English speaking + interview coaching included — solves her #1 hidden fear",
    "A real internship under faculty supervision — resume gold",
    "The promise of placement at global companies, with a step-by-step roadmap",
    "Direct 1:1 placement support — job applications, interview prep, employer connections",
    "A clear 7-month roadmap so she knows exactly what she's doing each week",
    "Fulfilling parental expectations and making them proud",
    "The identity of becoming \"corporate ready\" and \"global company ready\""
  ],

  // ═══════════════════ O/X. BUYING BEHAVIOR & OBJECTION HANDLING ═══════════════════
  buyingBehavior: {
    speed: "Rarely impulse-buys; deliberate, research-heavy decision over weeks",
    influencedBy: "Self-driven research, then father's approval; friends and college peers as secondary validators",
    researchDepth: "High — compares institutes, checks reviews, verifies placement claims before proceeding",
    comparesInstitutes: true,
    emotionVsLogic: "Emotion (identity, fear, hope) opens the door; logic (ROI, EMI, proof) closes the sale",
    finalTriggerEvent: "Emotional reassurance combined with tangible proof (placement data, demo class, parent buy-in)",
    journeySteps: [
      "Sees ad or hears from a friend",
      "Visits website / Instagram / LinkedIn; asks friends; searches Google reviews; visits institute",
      "Attends a free demo → parents visit → EMI option confirmed → enrolls",
      "Watches testimonials",
      "Talks to a current/past student or calls the admissions number",
      "Checks placement claims",
      "Sends brochure to parent or elder sibling",
      "Attends counselling call / seminar",
      "Timeline: 2–6 weeks from discovery to enrollment decision",
      "Delays a few days for reassurance",
      "Buys only after emotional reassurance + proof"
    ],
    priceExpectation: "₹35,000–₹50,000 acceptable if ROI, placement proof, and EMI are clear",
    urgencyTriggers: [
      "Graduation approaching",
      "A friend got placed",
      "Salary dissatisfaction / lack of callbacks",
      "Rising cost of living / family financial pressure",
      "Fear of AI replacing entry-level jobs",
      "Increasing market competition"
    ]
  },

  // ═══════════════════ P. INTERESTED BUT NOT BUYING — WHY ═══════════════════
  interestedButNotBuying: [
    "Scared the course is too technical (AI sounds intimidating)",
    "\"What if I don't get a job after completing the course — can I get a refund?\"",
    "Likes the promise, but the price feels high",
    "Interested, but family says \"wait\"",
    "Waiting to \"see what happens\" after final exams first",
    "Comparing with another cheaper course/certification",
    "Hoping to get a job on her own first — \"let me try one more month\"",
    "Wants job support but doubts if it's genuine",
    "Feels she should improve her English first, before joining",
    "Thinks \"maybe after graduation\" instead of now",
    "Asks about evening/weekend class availability and stalls on the answer",
    "Gets overwhelmed by too many competing institutions",
    "Fear of choosing wrong and losing the money"
  ],

  // ═══════════════════ Q/S. CONTENT CONSUMPTION & ONLINE PRESENCE ═══════════════════
  contentConsumptionHabits: {
    platforms: {
      primary: ["Instagram (career motivation reels, before/after job stories)", "YouTube (accounting tutorials, career advice, CA/CMA-adjacent channels)", "WhatsApp (forwards from college and family groups)"],
      secondary: ["Telegram study groups", "LinkedIn (observes more than posts)", "Naukri.com / Internshala / Indeed (job searching, source of discouragement)", "Google reviews", "College peer groups"]
    },
    formatsTrusted: [
      "Short career reels",
      "Student testimonial videos",
      "Live counselling sessions",
      "Faculty demo classes",
      "Career roadmap webinars",
      "Placement story carousels",
      "Practical class snippets",
      "Internship environment visuals"
    ],
    searchBehavior: [
      "how to get accounting job after B.Com",
      "interview tips",
      "student transformation content"
    ],
    engagementStyle: "Reads captions more than long blogs; responds strongly to before/after stories, placement screenshots, mock-interview clips, and faculty speaking in simple English/Hindi/Bengali",
    attentionSpan: "Short-form first; will go deeper only once trust is established",
    deviceUsage: "Mobile-first for discovery and research; laptop only for formal tasks (applications, classes)"
  },

  // ═══════════════════ T. QUICK WINS (first few weeks) ═══════════════════
  earlyQuickWinsWanted: [
    "Feel less lost about the job market",
    "Understand what companies actually want",
    "Build a proper, presentable resume",
    "Speak more confidently in interviews",
    "Learn enough practical accounting to say \"yes, I can do this job\""
  ],

  // ═══════════════════ U. WHAT SUCCESS LOOKS LIKE ═══════════════════
  successDefinition: [
    "Getting hired within a few months",
    "Having a job title she can proudly tell relatives about",
    "Earning her own salary",
    "Working in an office / global process environment",
    "Feeling polished, professional, and respected"
  ],

  // ═══════════════════ V. PREFERRED CONTENT FORMAT ═══════════════════
  preferredContentFormatForConversion: [
    "Short reels",
    "Student testimonial videos",
    "Live counselling sessions",
    "Faculty demo classes",
    "Career roadmap webinars",
    "Placement story carousels",
    "Practical class snippets",
    "Internship environment visuals"
  ],

  // ═══════════════════ W. DECISION-MAKING TRIGGERS ═══════════════════
  decisionMakingTriggers: [
    "Seeing students like her get placed",
    "Meeting faculty she can personally trust",
    "Parent reassurance on outcomes",
    "Limited-seat batch urgency",
    "Internship + placement + spoken English bundled in one package",
    "EMI or payment flexibility",
    "Clear, named job roles in the offer"
  ],

  // ═══════════════════ X. MESSAGING THAT RESONATES ═══════════════════
  messagingThatResonates: [
    "Your degree is the start, not the finish",
    "Become job-ready for corporate and global accounting roles",
    "Learn practical accounting, English speaking, interview skills, and workplace confidence",
    "From student to placed professional",
    "No experience? Start from scratch",
    "Get mentored, trained, and internship-ready"
  ],

  // ═══════════════════ Y. BEST MARKETING ANGLES ═══════════════════
  bestMarketingAngles: [
    "Degree-to-career bridge",
    "Practical > theoretical",
    "Placement-led transformation",
    "Job-ready accounting + spoken English (bundled)",
    "Global company confidence",
    "Faculty-guided, not self-study chaos"
  ],

  // ═══════════════════ Z. RECOMMENDED OFFER POSITIONING ═══════════════════
  recommendedOfferPositioning: "A complete 7-month career-launch program for commerce students and fresh graduates who want practical accounting skills, internship exposure, English confidence, and placement readiness for corporate and global companies.",

  // ═══════════════════ PROBLEM: BELIEVED VS. ACTUAL ═══════════════════
  problemBelievedVsActual: {
    problemSheBelievesSheHas: "I need an accounting course and maybe better English.",
    problemSheActuallyHas: "She lacks career conversion capability, not subject knowledge — specifically: practical workflow exposure, confidence signaling, interview communication, professional identity, and employer-facing readiness.",
    emotionalFearUnderneath: "That she is not \"good enough\" to be chosen by a respectable company, and that this inadequacy will become visible and permanent.",
    promiseThatAttractsMost: "We help final-year students and fresh graduates become job-ready for corporate and global accounting roles through practical training, faculty-led internship exposure, English speaking, and placement support.",
    transformationWanted: "From uncertain student, low-confidence speaker, and degree holder without direction → to polished candidate, interview-ready professional, employable accounting fresher with a real career path.",
    whatDelaysDecision: "Family says \"wait\"; wanting to try the job market alone one more month; comparing against a cheaper alternative; feeling she should fix her English first.",
    whatBuildsTrustFast: "A named, verifiable placement story from someone like her (same city, same college tier) plus a demo class her father can also sit in on.",
    whoInfluencesPurchase: "Self (Riya identifies the need and researches) → Father (economic approval) → Mother/elder sibling (secondary validation) → Friends/peers (social proof)."
  },

  // ═══════════════════ SEARCH ARCHITECTURE (SEO/Ads/GEO/AEO) ═══════════════════
  searchArchitecture: {
    googleSearch: [
      "best digital marketing course in Kolkata", // (competitor-category reference query)
      "job-ready finance course",
      "high salary skills after BCom",
      "placement guaranteed course",
      "practical accounting course after BCom"
    ],
    youtubeSearch: [
      "how to get accounting job after B.Com",
      "interview tips for freshers",
      "student transformation / placement story videos"
    ],
    aiSearchQueries: [
      "Best job-ready accounting course near Kolkata with placement support",
      "Is a B.Com degree enough to get a corporate job in 2026?",
      "How to improve English speaking and interview confidence before job interviews"
    ],
    platformPreference: "Instagram, YouTube, WhatsApp/Telegram groups, Naukri/Internshala, LinkedIn (passive)"
  }
};

// ═══════════════════ COMPETITOR LANDSCAPE ═══════════════════
const COMPETITOR_LANDSCAPE = {
  accounting: [
    "https://www.icajobguarantee.com/",
    "https://readyaccountant.com/",
    "https://www.gtiaindia.org/",
    "https://plutuseducation.com/",
    "https://imarticus.org/school-of-finance-and-business/",
    "https://www.mileseducation.com/caira",
    "https://strideschool.ai/",
    "https://www.gccschool.com/",
    "https://in.imanet.org/en/IMA-Certifications/CMA-Certification"
  ],
  digitalMarketing: [
    "https://digitalscholar.in/",
    "https://iide.co/",
    "https://piidm.com/",
    "https://www.dsim.in/",
    "https://www.nihtdigitalmarketing.com/",
    "https://www.myidcm.com/",
    "https://skillcircle.in/",
    "https://www.outskill.com/",
    "https://kolkatadigitalmarketinginstitute.com/",
    "https://www.kraftshala.com/",
    "https://www.mica.ac.in/online-programmes/advanced-certificate-in-ai-powered-digital-marketing-communication/"
  ],
  pgManagementAndTech: [
    "https://mastersunion.org/",
    "https://tetr.com/",
    "https://mesaschool.co/",
    "https://www.vedam.org/",
    "https://alterainstitute.com/",
    "https://www.litschool.in/",
    "https://asmibschool.com/admission/",
    "https://www.scaler.com/school-of-business/",
    "https://bowerschool.com/",
    "https://nextleap.app/",
    "https://polariscampus.com/",
    "https://www.pwioi.com/management/bba-management-program"
  ],
  otherAlternativesConsidered: [
    "Free YouTube learning",
    "MBA / further formal education",
    "Government job preparation",
    "Freelancing",
    "Other online-only platforms"
  ]
};

module.exports = {
  OFFER_CONTEXT,
  RIYA_SEN_PERSONA,
  COMPETITOR_LANDSCAPE
};