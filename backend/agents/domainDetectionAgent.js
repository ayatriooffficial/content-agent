/**
 * Domain Detection Agent — STEP 1 of the pipeline.
 * ACCOUNTING/FINANCE DOMAIN ONLY.
 * Detects sub-niche based on structured audience inputs.
 * No LLM call needed — deterministic routing.
 */
function domainDetectionAgent({ companyName, productDescription, audienceCategory, educationBackground, experienceLevel }) {
  const NICHE_MAP = {
    "12th Pass Commerce Student": {
      niche: "Post-12th Commerce Career Entry",
      audienceType: "12th Pass Commerce Students",
      subDomain: "Entry-Level Accounting Education"
    },
    "College-Level Student": {
      niche: "College Commerce Practical Skill Gap",
      audienceType: "B.Com / BBA / BA Students",
      subDomain: "Graduate-Level Accounting Upskilling"
    },
    "Working Professional": {
      niche: "Accounting Career Growth & Upskilling",
      audienceType: "Working Accounting Professionals",
      subDomain: "Professional Accounting Advancement"
    }
  };

  const match = NICHE_MAP[audienceCategory] || NICHE_MAP["College-Level Student"];

  const educationContext = educationBackground
    ? ` with ${educationBackground} background`
    : "";

  const experienceContext = experienceLevel
    ? ` at ${experienceLevel} level`
    : "";

  return {
    industry: "Accounting & Finance Education",
    domain: match.subDomain,
    niche: match.niche,
    audienceType: match.audienceType + educationContext + experienceContext,
    audienceCategory: audienceCategory || "College-Level Student",
    educationBackground: educationBackground || "Commerce",
    experienceLevel: experienceLevel || "Beginner",
    confidence: 95,
    methodology: {
      approach: "Deterministic Domain Routing",
      reasoning: "System is specialized for accounting/finance domain. Audience category directly maps to niche positioning.",
      principle: "Domain specificity over generic detection — eliminates LLM hallucination risk for known verticals."
    }
  };
}

module.exports = domainDetectionAgent;
