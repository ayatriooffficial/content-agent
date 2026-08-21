/**
 * HARDCODED COMPETITORS
 * Accounting & Finance (primary), plus Digital Marketing and PG Management
 * & Technology groups from the company's buyer journey brief — used for the
 * DGM/TBM streams so competitor analysis is course-specific.
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

/** Digital Marketing education competitors (from the buyer journey brief). */
const DIGITAL_MARKETING_COMPETITORS = [
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
  { name: "MICA AI-Powered DMC", url: "https://www.mica.ac.in/online-programmes/advanced-certificate-in-ai-powered-digital-marketing-communication/", category: "Online Certificate" }
];

/** PG Management & Technology competitors (from the buyer journey brief). */
const PG_MANAGEMENT_COMPETITORS = [
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
  { name: "PW IOI Management", url: "https://www.pwioi.com/management/bba-management-program?courseId=67fec09232e42cadfe4234f5", category: "Management Program" }
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

/**
 * Returns a formatted string for the given competitor group key
 * (accounting | digitalMarketing | pgManagement).
 */
function getCompetitorGroupContext(groupKey) {
  const map = {
    accounting: PRIMARY_COMPETITORS,
    digitalMarketing: DIGITAL_MARKETING_COMPETITORS,
    pgManagement: PG_MANAGEMENT_COMPETITORS,
  };
  const group = map[groupKey] || PRIMARY_COMPETITORS;
  return group.map(c => `${c.name} (${c.url}) — ${c.category}`).join("\n");
}

module.exports = {
  PRIMARY_COMPETITORS,
  DIGITAL_MARKETING_COMPETITORS,
  PG_MANAGEMENT_COMPETITORS,
  getCompetitorURLs,
  getCompetitorContext,
  getCompetitorGroupContext,
};
