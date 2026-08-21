const PERSONA_TEMPLATES = require("../data/personaTemplates");
const buyerPersonaModule = require("../data/buyer_persona");

/**
 * Persona Template Loader — STEP 2 of the pipeline.
 * Loads the matching persona template(s) based on the audience category and
 * (optionally) the target course (program).
 *
 * - For CBA/accounting audiences: matches among the 3 accounting templates
 *   and attaches the buyer-journey's RIYA_SEN_PERSONA as a `foundationExample`
 *   quality bar (still dead-data-free: the loader is now the one consuming it).
 * - For DGM audiences: matches among the 3 DGM archetypes (student / grad
 *   pivot / growth professional) using the same score-based logic, with a
 *   run-counter rotation so different DGM archetypes get used across runs.
 * - Direct match by audience category always wins.
 */
function personaTemplateLoader(domainResult, options = {}) {
  const { audienceCategory } = domainResult;
  const course = options.course || "";
  const rotationSeed = Number(options.rotationSeed) || 0; // increments each run

  // Foundation quality bar from the buyer journey brief (Riya Sen A-Z).
  const riyaExample = (() => {
    try {
      const raw = JSON.stringify(buyerPersonaModule.RIYA_SEN_PERSONA || null);
      if (!raw) return "";
      // Keep the dense psychology sections: identity, human snapshot,
      // buyer-vs-user, psychographics, pains, objections, transformation.
      return raw.length > 1200 ? raw.slice(0, 1200) + "…" : raw;
    } catch (err) {
      return "";
    }
  })();

  const dgmAudience = String(audienceCategory || "").toLowerCase();

  // DGM route: prefer templates tagged as the requested program.
  if (course === "DGM" || dgmAudience.includes("marketing") || dgmAudience.includes("digital") || dgmAudience.includes("growth")) {
    const dgmTemplates = PERSONA_TEMPLATES.filter((t) => t.program === "DGM");
    if (dgmTemplates.length) {
      let selected = scoreMatch(dgmTemplates, domainResult);
      if (!selected) {
        // Rotate across archetypes so runs don't reuse the same one forever.
        selected = dgmTemplates[rotationSeed % dgmTemplates.length];
      }
      return [{ ...selected, foundationExample: riyaExample && selected.audienceCategory?.toLowerCase().includes("graduate") ? riyaExample : "" }];
    }
  }

  // Direct match by audience category
  const directMatch = PERSONA_TEMPLATES.find((t) => t.audienceCategory === audienceCategory);
  if (directMatch) {
    return [withFoundationExample(directMatch, riyaExample)];
  }

  // Fallback: score-based matching using domain keywords
  const result = scoreMatch(PERSONA_TEMPLATES.filter((t) => !t.program), domainResult);

  // If nothing matches, return the first template as default
  const fallback = result || PERSONA_TEMPLATES[0];
  return [withFoundationExample(fallback, riyaExample)];
}

/** Score templates against the domain result's search terms. */
function scoreMatch(templates, domainResult) {
  const searchTerms = [
    domainResult.industry,
    domainResult.domain,
    domainResult.niche,
    domainResult.audienceType,
  ].filter(Boolean).join(" ").toLowerCase();

  const scored = templates
    .map((template) => {
      let score = 0;
      template.domains.forEach((d) => {
        if (searchTerms.includes(d.toLowerCase())) score += 3;
        d.toLowerCase().split(" ").forEach((word) => {
          if (word.length > 2 && searchTerms.includes(word)) score += 1;
        });
      });
      return { ...template, score };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.find((t) => t.score > 0);
  if (!top) return null;
  const { score, ...rest } = top;
  return rest;
}

/** Attaches the buyer-journey foundation example where relevant. */
function withFoundationExample(template, riyaExample) {
  const audience = String(template.audienceCategory || "").toLowerCase();
  // Riya is a final-year/fresh-graduate college persona — attach the example
  // for college-level/graduate audiences so output matches her depth.
  const relevant = /college|graduate|student|final|fresh/.test(audience);
  return { ...template, foundationExample: relevant ? riyaExample : "" };
}

module.exports = personaTemplateLoader;