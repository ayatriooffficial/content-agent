/**
 * liveResearch.js — real web search for the Research Agent.
 *
 * Lifts the working prototype from agents/scripts/researchAgent.js into the
 * pipeline: DuckDuckGo web search + site:reddit.com search for real
 * voice-of-customer phrasing. Results are injected into the research agent's
 * Phase 1 prompt; if anything fails, the caller silently continues with the
 * LLM simulation (zero regression risk).
 *
 * The platform list matches the buyer journey brief: Google, YouTube,
 * Instagram, WhatsApp, Telegram, LinkedIn, Quora, Reddit, job portals.
 */

const QUERY_LIMIT = 4;      // max queries per run
const RESULT_COUNT = 3;      // results kept per query
const TIMEOUT_MS = 6000;     // per-query hard timeout (DDG can throttle/hang)

/**
 * Safely require the DDG client; returns null when the package is missing so
 * the whole service degrades gracefully instead of crashing the pipeline.
 */
function loadSearchClient() {
  try {
    // eslint-disable-next-line global-require
    const { DuckDuckGoSearchClient } = require("@agent-infra/duckduckgo-search");
    return new DuckDuckGoSearchClient({});
  } catch (err) {
    console.warn("  [LiveResearch] @agent-infra/duckduckgo-search not installed — live search disabled:", err.message);
    return null;
  }
}

async function searchWithTimeout(client, query, count) {
  if (!client) return [];
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
  );
  const search = client.search({ query, count }).then((res) => (res && res.results) || []);
  const results = await Promise.race([search, timeout]);
  return results.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet })).filter((r) => r.title || r.snippet);
}

/**
 * Runs live web + Reddit searches for the given persona queries.
 * @param {string[]} queries - persona-derived queries (common phrases, fears)
 * @returns {Promise<Array<{kind: string, query: string, results: Array}> >}
 */
async function runLiveResearch(queries = []) {
  const client = loadSearchClient();
  if (!client) return [];

  const cleanQueries = (queries || [])
    .map((q) => String(q || "").trim())
    .filter((q) => q.length > 8)
    .slice(0, QUERY_LIMIT);

  if (!cleanQueries.length) return [];

  const collected = [];
  for (const query of cleanQueries) {
    try {
      const [web, reddit] = await Promise.allSettled([
        searchWithTimeout(client, query, RESULT_COUNT),
        searchWithTimeout(client, `site:reddit.com ${query}`, RESULT_COUNT),
      ]);

      if (web.status === "fulfilled" && web.value.length) {
        collected.push({ kind: "WEB", query, results: web.value });
      }
      if (reddit.status === "fulfilled" && reddit.value.length) {
        collected.push({ kind: "REDDIT", query, results: reddit.value });
      }
      // Small gap between queries — DDG throttles rapid-fire requests
      await new Promise((r) => setTimeout(r, 1200));
    } catch (err) {
      console.warn(`  [LiveResearch] query failed (${query}): ${err.message}`);
    }
  }

  if (collected.length) {
    console.log(`  [LiveResearch] ✅ ${collected.length} live search groups fetched (Google-style + Reddit)`);
  } else {
    console.log("  [LiveResearch] ⚠️ no live results — Research Agent will fall back to LLM simulation");
  }

  return collected;
}

/**
 * Renders live results as prompt text for the research agent.
 */
function renderLiveEvidence(groups = []) {
  const parts = groups.map((group) => {
    const lines = group.results
      .slice(0, RESULT_COUNT)
      .map((r) => `  - ${r.title || "(no title)"} | ${r.url || ""}${r.snippet ? ` | ${r.snippet.slice(0, 200)}` : ""}`);
    return `[${group.kind}] query: "${group.query}"\n${lines.join("\n")}`;
  });
  return parts.join("\n\n");
}

/** Builds persona-derived search queries from persona + program context. */
function buildSearchQueries(personaProfile = {}, programSpec = {}) {
  const intents = programSpec.searchIntents || {};
  const voice = [
    ...(intents.redditQuoraVoice || []),
    ...(personaProfile.voiceOfCustomer?.commonPhrases || []),
    ...(personaProfile.fearOfInaction || []),
    ...(personaProfile.hiddenFears || []),
    ...(intents.google || []),
  ].filter(Boolean).slice(0, QUERY_LIMIT);
  return [...new Set(voice)];
}

module.exports = { runLiveResearch, renderLiveEvidence, buildSearchQueries };