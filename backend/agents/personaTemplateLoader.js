const PERSONA_TEMPLATES = require("../data/personaTemplates");

/**
 * Persona Template Loader — STEP 2 of the pipeline.
 * Loads the matching persona template based on the audience category.
 * Direct match for accounting domain — no fuzzy matching needed.
 */
function personaTemplateLoader(domainResult) {
  const { audienceCategory } = domainResult;

  // Direct match by audience category
  const directMatch = PERSONA_TEMPLATES.find(t =>
    t.audienceCategory === audienceCategory
  );

  if (directMatch) {
    return [directMatch];
  }

  // Fallback: score-based matching using domain keywords
  const searchTerms = [
    domainResult.industry,
    domainResult.domain,
    domainResult.niche,
    domainResult.audienceType
  ].filter(Boolean).join(" ").toLowerCase();

  const scored = PERSONA_TEMPLATES.map(template => {
    let score = 0;
    template.domains.forEach(d => {
      if (searchTerms.includes(d.toLowerCase())) score += 3;
      d.toLowerCase().split(" ").forEach(word => {
        if (word.length > 2 && searchTerms.includes(word)) score += 1;
      });
    });
    return { ...template, score };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  const result = sorted.filter(t => t.score > 0).slice(0, 1).map(({ score, ...rest }) => rest);

  // If nothing matches, return the first template as default
  return result.length > 0 ? result : [PERSONA_TEMPLATES[0]];
}

module.exports = personaTemplateLoader;
