/**
 * websiteContext.js — fetches the Charters Union website's LIVE data from
 * the client frontend's `/api/website-data` endpoint and builds a compact
 * context block for the agent prompts.
 *
 * This replaces the hardcoded old Kolkata/CA data with the real, current
 * website content (CBA / DGM / TBM programs, faculty, testimonials, etc.)
 * so generated messages/emails/blogs revolve around the actual offers.
 *
 * URL: WEBSITE_DATA_URL env, or localhost:3000/api/website-data by default.
 * The deployed frontend (chartersunion.com) also serves this route.
 */

const WEBSITE_DATA_URL = (
  process.env.WEBSITE_DATA_URL || "http://localhost:3000/api/website-data"
).replace(/\/+$/, "");

let cache = { at: 0, data: null };
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — fresh enough per pipeline run

/**
 * Fetches website data (cached 10 min). Returns null on failure so the
 * pipeline can fall back to its own context instead of crashing.
 */
async function fetchWebsiteData() {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const res = await fetch(`${WEBSITE_DATA_URL}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`⚠️ website-data fetch failed: HTTP ${res.status}`);
      return null;
    }
    const json = await res.json();
    cache = { at: now, data: json?.data || null };
    console.log(`✅ Website data fetched: ${WEBSITE_DATA_URL}`);
    return cache.data;
  } catch (err) {
    console.warn(`⚠️ website-data fetch error: ${err.message}`);
    return null;
  }
}

function safeStr(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function truncate(v, max = 800) {
  const s = safeStr(v);
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/**
 * Builds the compact context block fed into agent prompts.
 */
function buildWebsiteContext(data) {
  if (!data) return null;

  const sections = [];

  // Courses (CBA/DGM/TBM)
  if (data.courses?.length) {
    sections.push(`COURSES OFFERED:\n${data.courses.join(", ")}`);
  }

  // Programs summary (compact: name, duration, format, fees, placement)
  if (Array.isArray(data.programs) && data.programs.length) {
    const summary = data.programs
      .map((p) => {
        const pl = p.placement || p.career_growth || {};
        return [
          `- ${p.name} (${p.id})`,
          `  Duration: ${p.duration} | Format: ${p.format} | Start: ${p.start_date || "N/A"}`,
          `  Fees: EMI from ${p.fees?.emi_start || "N/A"} | Scholarship: ${p.fees?.scholarship || "N/A"}`,
          `  Placement: ${pl.placement_rate || pl.promotion_rate || "N/A"} | Avg CTC: ${pl.average_ctc || "N/A"} | Range: ${pl.salary_range || "N/A"}`,
          `  Roles: ${(p.career_roles || []).slice(0, 5).join(", ")}`,
        ].join("\n");
      })
      .join("\n");
    sections.push(`PROGRAMS (from website):\n${truncate(summary)}`);
  }

  // Institute overview
  if (data.institute) {
    sections.push(`INSTITUTE:\n${truncate(data.institute)}`);
  }

  // Faculty
  if (data.faculty) {
    sections.push(`FACULTY:\n${truncate(data.faculty)}`);
  }

  // Home stats / placement highlights
  if (data.home) {
    sections.push(`PLACEMENT HIGHLIGHTS:\n${truncate(data.home)}`);
  }

  // Testimonials (proof)
  if (Array.isArray(data.testimonials) && data.testimonials.length) {
    const t = data.testimonials
      .slice(0, 6)
      .map((x) => `- ${x.name || "Student"}: ${x.quote || x.testimonial || x.text || safeStr(x).slice(0, 120)}`)
      .join("\n");
    sections.push(`TESTIMONIALS:\n${truncate(t)}`);
  }

  // Careers / jobs / internships
  if (data.jobs?.length) {
    sections.push(`CAREERS AT CHARTERS:\n${truncate(data.jobs.slice(0, 5))}`);
  }
  if (data.internships?.length) {
    sections.push(`INTERNSHIPS:\n${truncate(data.internships.slice(0, 5))}`);
  }

  // Admissions (scholarships, counsellors, steps)
  if (data.admissions) {
    sections.push(`ADMISSIONS:\n${truncate(data.admissions)}`);
  }

  // Cap the TOTAL context so the prompt stays under the free-tier model
  // token limit (~8000 TPM). ~3500 chars ≈ ~900 tokens — safe.
  const full = sections.join("\n\n");
  return full.length > 3500 ? full.slice(0, 3500) + "…" : full;
}

/**
 * Returns { context, source } — context is the text to inject into prompts,
 * source is "website" or "fallback".
 */
async function getWebsiteContext() {
  const data = await fetchWebsiteData();
  const context = buildWebsiteContext(data);
  if (context) return { context, source: "website" };
  return { context: null, source: "fallback" };
}

module.exports = { getWebsiteContext, fetchWebsiteData, buildWebsiteContext };
