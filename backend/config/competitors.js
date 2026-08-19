/**
 * HARDCODED PRIMARY COMPETITORS
 * Accounting & Finance education providers in India.
 * Used by Competitor Agent for automated analysis.
 */
const PRIMARY_COMPETITORS = [
  {
    name: "ICA Job Guarantee",
    url: "https://www.icajobguarantee.com/",
    category: "Job Guarantee Programs"
  },
  {
    name: "Ready Accountant",
    url: "https://readyaccountant.com/",
    category: "Practical Accounting Training"
  },
  {
    name: "GTIA India",
    url: "https://www.gtiaindia.org/",
    category: "Global Accounting Education"
  },
  {
    name: "Plutus Education",
    url: "https://plutuseducation.com/",
    category: "Finance Education"
  },
  {
    name: "Imarticus Learning",
    url: "https://imarticus.org/school-of-finance-and-business/",
    category: "Finance & Business School"
  },
  {
    name: "Miles Education",
    url: "https://www.mileseducation.com/caira",
    category: "CA/CPA Training"
  },
  {
    name: "Stride School AI",
    url: "https://strideschool.ai/",
    category: "AI-Powered Education"
  },
  {
    name: "GCC School",
    url: "https://www.gccschool.com/",
    category: "Commerce Coaching"
  },
  {
    name: "IMA (CMA Certification)",
    url: "https://in.imanet.org/en/IMA-Certifications/CMA-Certification",
    category: "CMA Certification"
  }
];

/**
 * Returns competitor URLs as a simple array for agent prompts.
 */
function getCompetitorURLs() {
  return PRIMARY_COMPETITORS.map(c => c.url);
}

/**
 * Returns a formatted string of competitors for AI prompts.
 */
function getCompetitorContext() {
  return PRIMARY_COMPETITORS.map(c => `${c.name} (${c.url}) — ${c.category}`).join("\n");
}

module.exports = { PRIMARY_COMPETITORS, getCompetitorURLs, getCompetitorContext };
