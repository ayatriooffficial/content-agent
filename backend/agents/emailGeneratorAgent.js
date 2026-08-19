// // const { groqGenerate } = require("./clients/groqClient");
// // const safeParseJSON = require("./jsonParser/jsonParser");

// // function normalizeList(value, limit = 0) {
// //   const items = Array.isArray(value) ? value.filter(Boolean) : [];
// //   return limit > 0 ? items.slice(0, limit) : items;
// // }

// // function joinList(value, fallback = "") {
// //   const items = normalizeList(value);
// //   return items.length ? items.join("; ") : fallback;
// // }

// // /**
// //  * Defensive extraction layer.
// //  *
// //  * `persona` may arrive in either shape used across this pipeline:
// //  *  1) the flat legacy shape (persona.buyerPersona, persona.identityBelief,
// //  *     persona.hiddenFears, persona.liveSituations, persona.emotionalTriggers)
// //  *  2) the deep persona-architecture shape (RIYA_SEN_PERSONA-style: voiceOfCustomer,
// //  *     psychologyLayer / psychographics, painArchitecture / painPoints,
// //  *     objectionStack / objectionsBeforePurchase, trustArchitecture / trustFactorsNeeded,
// //  *     fearOfInaction, buyingBehavior.urgencyTriggers, messagingThatResonates)
// //  *
// //  * This pulls whichever fields exist from either shape into one flat signal set
// //  * so the prompts below always have the richest psychological material available,
// //  * without breaking callers still passing the older flat persona object.
// //  */
// // function extractPersonaSignals(persona = {}) {
// //   const buyerPersonaLabel =
// //     persona.buyerPersona || persona.label || persona.audienceCategory || "Accounting audience";

// //   const identityBelief =
// //     persona.identityBelief ||
// //     persona.psychologyLayer?.identityBelief ||
// //     persona.psychographics?.whoTheyAre ||
// //     persona.humanSnapshot ||
// //     "";

// //   const definingQuote = persona.definingQuote || persona.voiceOfCustomer?.definingQuote || "";

// //   const hiddenInsecurity =
// //     persona.hiddenInsecurity ||
// //     persona.voiceOfCustomer?.hiddenInsecurity ||
// //     persona.psychographics?.scares ||
// //     "";

// //   const voicePhrases = normalizeList(
// //     persona.commonPhrases ||
// //       persona.voiceOfCustomer?.commonPhrases ||
// //       persona.fearsAndFrustrationsVoice ||
// //       []
// //   );

// //   const hiddenFears = normalizeList(
// //     persona.hiddenFears ||
// //       persona.painArchitecture?.hiddenFears ||
// //       persona.fearsAndFrustrationsVoice ||
// //       (persona.painPoints
// //         ? [...(persona.painPoints.practical || []), ...(persona.painPoints.emotional || [])]
// //         : []) ||
// //       []
// //   );

// //   const liveSituations = normalizeList(
// //     persona.liveSituations || persona.painArchitecture?.liveDailyLifeSituations || []
// //   );

// //   const emotionalTriggers = normalizeList(
// //     persona.emotionalTriggers || persona.painArchitecture?.emotionalTriggers || []
// //   );

// //   const objections = normalizeList(
// //     persona.objections ||
// //       persona.objectionsBeforePurchase?.exactObjections ||
// //       (Array.isArray(persona.objectionStack)
// //         ? persona.objectionStack.map((o) => o.visibleObjection).filter(Boolean)
// //         : []) ||
// //       []
// //   );

// //   const trustFactors = normalizeList(
// //     persona.trustFactorsNeeded ||
// //       persona.trustArchitecture?.proofRequired ||
// //       persona.trustFactorsNeeded ||
// //       []
// //   );

// //   const fearOfInaction = normalizeList(
// //     persona.fearOfInaction?.outcomesIfNoAction || persona.fearOfInaction || []
// //   );

// //   const urgencyTriggers = normalizeList(
// //     persona.urgencyTriggers || persona.buyingBehavior?.urgencyTriggers || []
// //   );

// //   const messagingThatResonates = normalizeList(persona.messagingThatResonates || []);

// //   const instantResonanceMessage = persona.psychographics?.instantResonanceMessage || "";

// //   return {
// //     buyerPersonaLabel,
// //     identityBelief,
// //     definingQuote,
// //     hiddenInsecurity,
// //     voicePhrases,
// //     hiddenFears,
// //     liveSituations,
// //     emotionalTriggers,
// //     objections,
// //     trustFactors,
// //     fearOfInaction,
// //     urgencyTriggers,
// //     messagingThatResonates,
// //     instantResonanceMessage,
// //   };
// // }

// // function buildFallbackEmail(blueprint, persona, research, competitor, blogResult, context = {}) {
// //   const signals = extractPersonaSignals(persona);

// //   const subjectSeed =
// //     signals.hiddenInsecurity ||
// //     signals.hiddenFears[0] ||
// //     signals.definingQuote ||
// //     blueprint.blogTitle ||
// //     "A practical next step for your readers";

// //   const subject = blueprint.blogTitle
// //     ? `Quick insights on ${blueprint.blogTitle}`
// //     : `The thing nobody tells you about "${subjectSeed}"`;

// //   const ctaText = context.ctaText || "Get the breakdown";
// //   const ctaUrlPath = context.ctaUrlPath || "/blogs";

// //   return {
// //     campaignType: context.emailType || "blog_promotion",
// //     audienceSegment: context.audienceCategory || signals.buyerPersonaLabel,
// //     subject,
// //     preheader:
// //       signals.hiddenFears[1] ||
// //       blueprint.emotionalHook ||
// //       "A concise update built from the latest content strategy.",
// //     headline: blueprint.blogTitle || "A better way to turn insight into action",
// //     opening: `We built this email around what ${signals.buyerPersonaLabel} is already losing sleep over: ${joinList(
// //       research.aiSearchQueries,
// //       "career clarity and practical next steps"
// //     )}.`,
// //     valuePoints: normalizeList([
// //       blueprint.emotionalAngle,
// //       blueprint.trustBuildingStrategy,
// //       (competitor.emotionalGaps || [])[0],
// //       signals.messagingThatResonates[0],
// //     ]).slice(0, 3),
// //     proofPoints: normalizeList([
// //       (research.trustSignals || [])[0],
// //       (research.trustSignals || [])[1],
// //       (competitor.trustGaps || [])[0],
// //       signals.trustFactors[0],
// //     ]).slice(0, 3),
// //     ctaText,
// //     ctaUrlPath,
// //     ctaReasoning: "This CTA keeps the reader moving toward the full article without forcing a hard sell.",
// //     closing: signals.fearOfInaction[0]
// //       ? `If nothing changes, ${signals.fearOfInaction[0].toLowerCase()} — the full piece is the fastest way to see the roadmap out of that.`
// //       : "If this feels relevant, the full piece is the fastest way to see the full roadmap.",
// //     emailCopy: [
// //       `Subject: ${subject}`,
// //       "",
// //       `${blueprint.emotionalHook || signals.hiddenInsecurity || "A short, focused note built around the latest strategy."}`,
// //       "",
// //       `Here is the clearest version of the idea: ${blueprint.transformationStory || "move from confusion to a practical next step."}`,
// //       "",
// //       `What the article helps with: ${joinList(blueprint.sectionsToCover, "practical guidance, trust, and next steps")}`,
// //       "",
// //       `${ctaText}: ${ctaUrlPath}`,
// //     ].join("\n"),
// //     quickScanTable: {
// //       title: "At a glance",
// //       headers: ["What you'll learn", "Why it matters"],
// //       rows: normalizeList(blueprint.sectionsToCover, 3).map((section, i) => [
// //         section,
// //         normalizeList(blueprint.targetKeywords)[i] || "Practical takeaway you can use right away",
// //       ]),
// //     },
// //     summary:
// //       blogResult.summary ||
// //       blueprint.contentDirection ||
// //       "A concise email that turns the blog strategy into a click-worthy message.",
// //     tone: "clear, practical, and psychologically grounded",
// //     wordCount: 120,
// //     metadata: {
// //       blogTitle: blogResult.title || blueprint.blogTitle || "",
// //       targetKeywords: normalizeList(blueprint.targetKeywords, 5),
// //       competitorBlindSpots: normalizeList(competitor.competitorBlindSpots, 3),
// //     },
// //   };
// // }

// // async function emailGeneratorAgent(blueprint, persona, research, competitor, blogResult, context = {}) {
// //   const blogTitle = blogResult?.title || blueprint.blogTitle || "";
// //   const signals = extractPersonaSignals(persona);

// //   const systemPrompt = `You are an elite email growth copywriter for an accounting and finance education brand. Your subject lines must be strong enough to win the inbox even against a reader who is busy, distracted, and about to skip everything unread.

// // CRITICAL RULES:
// // - Output ONLY valid JSON. No markdown, no prose, no code fences.
// // - Keep the email concise, skimmable, and conversion-oriented.
// // - Do not invent stats, guarantees, or unsupported claims.
// // - Do not mention city or state names in the email body.
// // - All array fields must be actual JSON arrays of strings.

// // OBSESSIVE-OPEN-RATE PLAYBOOK (the reader must feel like NOT opening this is the risk):
// // - Subject line: 4-8 words. It must either (a) name the reader's exact hidden fear or insecurity back to them with unsettling precision, (b) open a curiosity gap tied to a specific outcome they want, or (c) use their own words/phrasing back at them so it feels personally written, not sent. Never generic ("Newsletter", "Check out our blog"). No clickbait the email doesn't deliver on — the gap must resolve honestly inside the email.
// // - Preheader must extend the subject's curiosity, not repeat it — it's the second hook, and should raise the stakes or add a second, related fear/desire.
// // - Opening line must hook in the first sentence using the persona's hidden fear, hidden insecurity, or a live daily-life moment they'd recognize instantly — never "Hi there, hope you're doing well."
// // - Where possible, mirror the persona's own voice/phrases (their "commonPhrases" or the way they describe the struggle) rather than marketing language — it should read like someone who has actually heard them say this.
// // - Write like a smart person emailing a friend a genuinely useful find — short paragraphs, plain language, zero corporate tone.
// // - Value points and proof points must each be a specific, concrete payoff or credible signal — not vague benefits.
// // - If a "fear of inaction" outcome is available, use it once, gently — name the cost of doing nothing without fear-mongering or manipulation. It must remain honest and non-coercive.
// // - CTA should feel like the obvious next click, using momentum language ("Get the breakdown", "See what changed") over generic ("Read more", "Click here").
// // - Every line must earn its place against a reader ready to archive unread.
// // - Include a short "at a glance" table (2-4 rows) so a skimmer can grasp the core value in under 5 seconds without reading the full email. Keep cells short — a few words each, not full sentences.
// // - Never manipulate, shame, or exaggerate. The urgency must come from truthfully naming a real stake the persona already feels, not from invented scarcity or false claims.`;

// //   const userPrompt = `Create a campaign email that promotes the newly generated blog content to the same audience.

// // === STRATEGIC BLUEPRINT ===
// // Blog Title: ${blogTitle}
// // Emotional Hook: ${blueprint.emotionalHook || blueprint.emotionalTone || ""}
// // Emotional Angle: ${blueprint.emotionalAngle || ""}
// // Transformation: ${blueprint.transformationStory || blueprint.contentAngle || ""}
// // Trust Strategy: ${blueprint.trustBuildingStrategy || ""}
// // Sections: ${joinList(blueprint.sectionsToCover)}
// // Primary CTA: ${blueprint.ctaStrategy || ""}
// // Target Keywords: ${joinList(blueprint.targetKeywords)}
// // Word Count Goal: ${blueprint.wordCount || 1000}

// // === AUDIENCE PSYCHOLOGY ===
// // Reader: ${signals.buyerPersonaLabel}
// // Identity Belief / Who They Are: ${signals.identityBelief}
// // Defining Quote (their own words): ${signals.definingQuote}
// // Hidden Insecurity: ${signals.hiddenInsecurity}
// // Their Own Phrases For The Struggle: ${joinList(signals.voicePhrases)}
// // Hidden Fears: ${joinList(signals.hiddenFears)}
// // Live Situations They'd Recognize: ${joinList(signals.liveSituations, 3)}
// // Emotional Triggers: ${joinList(signals.emotionalTriggers)}
// // Objections They're Silently Holding: ${joinList(signals.objections, 4)}
// // What Builds Their Trust Fast: ${joinList(signals.trustFactors, 4)}
// // Cost Of Doing Nothing (fear of inaction): ${joinList(signals.fearOfInaction, 2)}
// // What Creates Urgency For Them Right Now: ${joinList(signals.urgencyTriggers)}
// // Messaging That Instantly Resonates: ${joinList(signals.messagingThatResonates)}
// // Single Strongest Resonance Line: ${signals.instantResonanceMessage}

// // === RESEARCH INTELLIGENCE ===
// // AI Search Queries: ${joinList(research.aiSearchQueries)}
// // Trust Signals: ${joinList(research.trustSignals)}
// // Trending Topics: ${joinList(research.trendInsights)}

// // === COMPETITOR GAPS ===
// // Emotional Gaps: ${joinList(competitor.emotionalGaps)}
// // Trust Gaps: ${joinList(competitor.trustGaps)}
// // Blind Spots: ${joinList(competitor.competitorBlindSpots)}

// // === EMAIL CONTEXT ===
// // Campaign Type: ${context.emailType || "blog_promotion"}
// // Audience Category: ${context.audienceCategory || signals.buyerPersonaLabel}
// // CTA URL Path: ${context.ctaUrlPath || "/blogs"}

// // Write an email that:
// // 1. Subject line names the reader's hidden fear/insecurity with unsettling precision, opens a specific curiosity gap, or echoes their own phrasing — strong enough to win the inbox from a busy, distracted reader.
// // 2. Preheader extends the hook further and raises the stakes — it doesn't restate the subject.
// // 3. Opens with a sharp first line built from the persona's hidden fears, hidden insecurity, or a live situation they'd instantly recognize — never a generic greeting.
// // 4. Summarizes the article value as a personal payoff, never as a blog excerpt.
// // 5. Includes 3 concise value/proof points, each a specific, concrete payoff or credible signal — pull from trust factors and research trust signals where possible.
// // 6. Uses the "cost of doing nothing" once, honestly and without manipulation, if material is available.
// // 7. Ends with one clear, momentum-driven CTA that feels like the obvious next click.
// // 8. Reads like a sharp, useful note from a person who has actually heard this reader talk about their struggle — not a corporate broadcast.
// // 9. Includes a short "at a glance" table (2-4 rows, e.g. topic vs. payoff, or before vs. after) so a skimmer gets the core value in seconds. Also weave this table into "emailCopy" as a clean markdown table so it renders inline in the email body.

// // Output EXACTLY this JSON structure:
// // {
// //   "campaignType": "blog_promotion",
// //   "audienceSegment": "string",
// //   "subject": "string",
// //   "preheader": "string",
// //   "headline": "string",
// //   "opening": "string",
// //   "valuePoints": ["point 1", "point 2", "point 3"],
// //   "proofPoints": ["proof 1", "proof 2", "proof 3"],
// //   "ctaText": "string",
// //   "ctaUrlPath": "string",
// //   "ctaReasoning": "string",
// //   "closing": "string",
// //   "emailCopy": "full email body as clean plain text or markdown, including the at-a-glance table rendered as a markdown table",
// //   "quickScanTable": {
// //     "title": "At a glance",
// //     "headers": ["column 1 label", "column 2 label"],
// //     "rows": [["row 1 col 1", "row 1 col 2"], ["row 2 col 1", "row 2 col 2"]]
// //   },
// //   "summary": "2 sentence summary of the email strategy",
// //   "tone": "string",
// //   "wordCount": 120,
// //   "metadata": {
// //     "blogTitle": "string",
// //     "targetKeywords": ["keyword 1", "keyword 2"],
// //     "competitorBlindSpots": ["gap 1", "gap 2"]
// //   }
// // }`;

// //   let raw = "";

// //   try {
// //     console.log("  [Email Generator Agent] Generating email campaign copy...");
// //     raw = await groqGenerate(
// //       "You are a concise email strategist for accounting education content. You transform strategic blog intelligence and deep persona psychology into a compact, persuasive email that feels human, specific, and personally written to one reader.",
// //       userPrompt,
// //       { model: "llama-3.3-70b-versatile", temperature: 0.7, maxTokens: 2500 }
// //     );
// //   } catch (err) {
// //     console.error("Email Generator Agent — Groq generation failed:", err.message);
// //     return buildFallbackEmail(blueprint, persona, research, competitor, blogResult || {}, context);
// //   }

// //   const parsed = safeParseJSON(raw);
// //   if (!parsed || !parsed.subject || !Array.isArray(parsed.valuePoints)) {
// //     return buildFallbackEmail(blueprint, persona, research, competitor, blogResult || {}, context);
// //   }

// //   return {
// //     campaignType: parsed.campaignType || context.emailType || "blog_promotion",
// //     audienceSegment: parsed.audienceSegment || context.audienceCategory || signals.buyerPersonaLabel,
// //     subject: parsed.subject,
// //     preheader: parsed.preheader || blueprint.emotionalHook || "",
// //     headline: parsed.headline || blogTitle || blueprint.blogTitle || "",
// //     opening: parsed.opening || "",
// //     valuePoints: normalizeList(parsed.valuePoints, 3),
// //     proofPoints: normalizeList(parsed.proofPoints, 3),
// //     ctaText: parsed.ctaText || context.ctaText || "Read the full article",
// //     ctaUrlPath: parsed.ctaUrlPath || context.ctaUrlPath || "/blogs",
// //     ctaReasoning: parsed.ctaReasoning || "",
// //     closing: parsed.closing || "",
// //     emailCopy: parsed.emailCopy || "",
// //     quickScanTable: {
// //       title: parsed.quickScanTable?.title || "At a glance",
// //       headers: Array.isArray(parsed.quickScanTable?.headers)
// //         ? parsed.quickScanTable.headers.filter(Boolean)
// //         : ["What you'll learn", "Why it matters"],
// //       rows: Array.isArray(parsed.quickScanTable?.rows)
// //         ? parsed.quickScanTable.rows.filter((r) => Array.isArray(r) && r.length)
// //         : [],
// //     },
// //     summary: parsed.summary || blogResult?.summary || blueprint.contentDirection || "",
// //     tone: parsed.tone || "clear and practical",
// //     wordCount: parseInt(parsed.wordCount, 10) || 120,
// //     metadata: {
// //       blogTitle: parsed.metadata?.blogTitle || blogTitle || blueprint.blogTitle || "",
// //       targetKeywords: normalizeList(parsed.metadata?.targetKeywords || blueprint.targetKeywords, 5),
// //       competitorBlindSpots: normalizeList(
// //         parsed.metadata?.competitorBlindSpots || competitor.competitorBlindSpots,
// //         3
// //       ),
// //     },
// //     methodology: {
// //       approach: "Email Strategy Synthesis (JSON Enforced)",
// //       reasoning:
// //         "Converted the blog strategy into a concise email campaign using deep persona psychology (hidden fears, voice, objections, trust factors, fear of inaction), research signals, and competitor gaps.",
// //       inputs: ["Blueprint", "Persona", "Research", "Competitor Analysis", "Blog Output"],
// //     },
// //   };
// // }

// // module.exports = emailGeneratorAgent;


// const { groqGenerate } = require("./clients/groqClient");
// const safeParseJSON = require("./jsonParser/jsonParser");

// // The `persona` argument this agent receives from the pipeline is NOT the
// // authoritative buyer persona — the real buyer persona lives in
// // charters_content_agent/backend/data/buyer_persona.js. Load it here so the
// // email is always grounded in the actual persona data, regardless of what
// // (if anything) callers pass in as `persona`.
// const buyerPersonaModule = require("../data/buyer_persona");

// /**
//  * The export shape of buyer_persona.js isn't fixed across the codebase, so
//  * this resolves whichever shape it was published in:
//  *  - { RIYA_SEN_PERSONA: {...} }
//  *  - { buyerPersona: {...} } / { persona: {...} }
//  *  - a bare persona object (has voiceOfCustomer / psychographics / label)
//  *  - an array or { PERSONA_TEMPLATES: [...] } — takes the first entry
//  */
// function resolveBuyerPersona(mod) {
//   if (!mod) return null;
//   if (mod.RIYA_SEN_PERSONA) return mod.RIYA_SEN_PERSONA;
//   if (mod.buyerPersona) return mod.buyerPersona;
//   if (mod.persona) return mod.persona;
//   if (mod.default) return resolveBuyerPersona(mod.default);
//   if (Array.isArray(mod)) return mod[0] || null;
//   if (Array.isArray(mod.PERSONA_TEMPLATES)) return mod.PERSONA_TEMPLATES[0] || null;
//   if (mod.label || mod.voiceOfCustomer || mod.psychographics || mod.personaIdentity) return mod;
//   return null;
// }

// const IMPORTED_BUYER_PERSONA = resolveBuyerPersona(buyerPersonaModule);

// function normalizeList(value, limit = 0) {
//   const items = Array.isArray(value) ? value.filter(Boolean) : [];
//   return limit > 0 ? items.slice(0, limit) : items;
// }

// function joinList(value, fallback = "") {
//   const items = normalizeList(value);
//   return items.length ? items.join("; ") : fallback;
// }

// /**
//  * Defensive extraction layer.
//  *
//  * `persona` may arrive in either shape used across this pipeline:
//  *  1) the flat legacy shape (persona.buyerPersona, persona.identityBelief,
//  *     persona.hiddenFears, persona.liveSituations, persona.emotionalTriggers)
//  *  2) the deep persona-architecture shape (RIYA_SEN_PERSONA-style: voiceOfCustomer,
//  *     psychologyLayer / psychographics, painArchitecture / painPoints,
//  *     objectionStack / objectionsBeforePurchase, trustArchitecture / trustFactorsNeeded,
//  *     fearOfInaction, buyingBehavior.urgencyTriggers, messagingThatResonates)
//  *
//  * This pulls whichever fields exist from either shape into one flat signal set
//  * so the prompts below always have the richest psychological material available,
//  * without breaking callers still passing the older flat persona object.
//  */
// function extractPersonaSignals(argPersona = {}) {
//   // Imported buyer_persona.js is authoritative. The persona argument is only
//   // used to fill in anything the imported persona doesn't define (or as a
//   // full fallback if the import failed).
//   const persona = IMPORTED_BUYER_PERSONA
//     ? { ...(argPersona || {}), ...IMPORTED_BUYER_PERSONA }
//     : argPersona || {};

//   const buyerPersonaLabel =
//     persona.buyerPersona || persona.label || persona.audienceCategory || "Accounting audience";

//   const identityBelief =
//     persona.identityBelief ||
//     persona.psychologyLayer?.identityBelief ||
//     persona.psychographics?.whoTheyAre ||
//     persona.humanSnapshot ||
//     "";

//   const definingQuote = persona.definingQuote || persona.voiceOfCustomer?.definingQuote || "";

//   const hiddenInsecurity =
//     persona.hiddenInsecurity ||
//     persona.voiceOfCustomer?.hiddenInsecurity ||
//     persona.psychographics?.scares ||
//     "";

//   const voicePhrases = normalizeList(
//     persona.commonPhrases ||
//     persona.voiceOfCustomer?.commonPhrases ||
//     persona.fearsAndFrustrationsVoice ||
//     []
//   );

//   const hiddenFears = normalizeList(
//     persona.hiddenFears ||
//     persona.painArchitecture?.hiddenFears ||
//     (persona.painPoints
//       ? [...(persona.painPoints.practical || []), ...(persona.painPoints.emotional || [])]
//       : null) ||
//     persona.fearsAndFrustrationsVoice ||
//     []
//   );

//   const liveSituations = normalizeList(
//     persona.liveSituations ||
//     persona.painArchitecture?.liveDailyLifeSituations ||
//     persona.objectionsBeforePurchase?.triggerEvents ||
//     []
//   );

//   const emotionalTriggers = normalizeList(
//     persona.emotionalTriggers || persona.painArchitecture?.emotionalTriggers || []
//   );

//   const objections = normalizeList(
//     persona.objections ||
//     persona.objectionsBeforePurchase?.exactObjections ||
//     (Array.isArray(persona.objectionStack)
//       ? persona.objectionStack.map((o) => o.visibleObjection).filter(Boolean)
//       : []) ||
//     []
//   );

//   const trustFactors = normalizeList(
//     persona.trustFactorsNeeded ||
//     persona.trustArchitecture?.proofRequired ||
//     persona.trustFactorsNeeded ||
//     []
//   );

//   const fearOfInaction = normalizeList(
//     persona.fearOfInaction?.outcomesIfNoAction || persona.fearOfInaction || []
//   );

//   const urgencyTriggers = normalizeList(
//     persona.urgencyTriggers || persona.buyingBehavior?.urgencyTriggers || []
//   );

//   const messagingThatResonates = normalizeList(persona.messagingThatResonates || []);

//   const instantResonanceMessage = persona.psychographics?.instantResonanceMessage || "";

//   return {
//     buyerPersonaLabel,
//     identityBelief,
//     definingQuote,
//     hiddenInsecurity,
//     voicePhrases,
//     hiddenFears,
//     liveSituations,
//     emotionalTriggers,
//     objections,
//     trustFactors,
//     fearOfInaction,
//     urgencyTriggers,
//     messagingThatResonates,
//     instantResonanceMessage,
//   };
// }

// function buildFallbackEmail(blueprint, persona, research, competitor, context = {}) {
//   const signals = extractPersonaSignals(persona);

//   const subjectSeed =
//     signals.hiddenInsecurity ||
//     signals.hiddenFears[0] ||
//     signals.definingQuote ||
//     "A practical next step for your readers";

//   const subject = `The thing nobody tells you about "${subjectSeed}"`;

//   const ctaText = context.ctaText || "Get the breakdown";
//   // const ctaUrlPath = context.ctaUrlPath || "";

//   return {
//     campaignType: context.emailType,
//     audienceSegment: context.audienceCategory || signals.buyerPersonaLabel,
//     subject,
//     preheader:
//       signals.hiddenFears[1] ||
//       blueprint.emotionalHook ||
//       "A concise update built from the latest content strategy.",
//     headline: "A better way to turn insight into action",
//     opening: `We built this email around what ${signals.buyerPersonaLabel} is already losing sleep over: ${joinList(
//       research.aiSearchQueries,
//       "career clarity and practical next steps"
//     )}.`,
//     valuePoints: normalizeList([
//       blueprint.emotionalAngle,
//       blueprint.trustBuildingStrategy,
//       (competitor.emotionalGaps || [])[0],
//       signals.messagingThatResonates[0],
//     ]).slice(0, 3),
//     proofPoints: normalizeList([
//       (research.trustSignals || [])[0],
//       (research.trustSignals || [])[1],
//       (competitor.trustGaps || [])[0],
//       signals.trustFactors[0],
//     ]).slice(0, 3),
//     ctaText,
//     // ctaUrlPath,
//     ctaReasoning: "This CTA keeps the reader moving toward the full article without forcing a hard sell.",
//     closing: signals.fearOfInaction[0]
//       ? `If nothing changes, ${signals.fearOfInaction[0].toLowerCase()} — the full piece is the fastest way to see the roadmap out of that.`
//       : "If this feels relevant, the full piece is the fastest way to see the full roadmap.",
//     emailCopy: [
//       `Subject: ${subject}`,
//       "",
//       `${blueprint.emotionalHook || signals.hiddenInsecurity || "A short, focused note built around the latest strategy."}`,
//       "",
//       `Here is the clearest version of the idea: ${blueprint.transformationStory || "move from confusion to a practical next step."}`,
//       "",
//       `What the article helps with: ${joinList(blueprint.sectionsToCover, "practical guidance, trust, and next steps")}`,
//       "",
//       `${ctaText}`,
//     ].join("\n"),
//     quickScanTable: {
//       title: "At a glance",
//       headers: ["What you'll learn", "Why it matters"],
//       rows: normalizeList(blueprint.sectionsToCover, 3).map((section, i) => [
//         section,
//         normalizeList(blueprint.targetKeywords)[i] || "Practical takeaway you can use right away",
//       ]),
//     },
//     summary:
//       blueprint.contentDirection || "",
//     tone: "clear, practical, and psychologically grounded",
//     wordCount: 120,
//     metadata: {
//       targetKeywords: normalizeList(blueprint.targetKeywords, 5),
//       competitorBlindSpots: normalizeList(competitor.competitorBlindSpots, 3),
//     },
//   };
// }

// const tablePrompt = `
// Create ONLY the quick-scan comparison table for the email.

// GOAL:
// The table must work like an "instant persuasion block" for a busy reader scanning the email in under 3 seconds. It should make the benefit of the content obvious immediately through sharp contrast.

// OUTPUT RULES:
// - Return ONLY valid JSON.
// - No prose, no explanation, no markdown fences.
// - Keep the structure exactly:
// {
//   "quickScanTable": {
//     "title": "string",
//     "headers": ["string", "string"],
//     "rows": [["string", "string"], ["string", "string"], ["string", "string"]]
//   }
// }

// CONVERSION RULES:
// - Frame the table as a contrast between the reader's frustrating current state and the more confident, desirable state they want.
// - The left column should feel uncomfortable, costly, or emotionally familiar.
// - The right column should feel relieving, useful, concrete, and immediately valuable.
// - Every row must show a BENEFIT through comparison, not just a feature.
// - The contrast should feel personal, not generic.
// - Use the audience's likely inner language where possible.
// - Make the reader feel: "This is exactly where I'm stuck" and "This is exactly what I want instead."

// STYLE RULES:
// - Use 2-5 words per cell.
// - No full sentences.
// - No vague labels like "better results", "more value", "improved learning".
// - Prefer emotionally charged but honest phrases.
// - Focus on outcomes like clarity, confidence, speed, fewer mistakes, less second-guessing, better decisions, stronger performance, less wasted effort.
// - Avoid hype, fake urgency, or exaggerated claims.
// - Avoid jargon unless the persona would naturally use it.
// - The table must feel more like "pain vs payoff" than "feature vs feature."

// ROW WRITING FORMULA:
// Each row should follow this pattern:
// - Left side: confusing / risky / frustrating / slow / uncertain state
// - Right side: clear / confident / faster / safer / practical payoff

// GOOD EXAMPLES OF CONTRAST:
// - "Second-guessing answers" -> "Know what counts"
// - "Studying everything" -> "Focus on what moves marks"
// - "Messy notes" -> "Clear exam roadmap"
// - "Slow financial analysis" -> "Spot issues faster"
// - "Theory overload" -> "Practical exam-ready thinking"

// BAD EXAMPLES:
// - "Resources" -> "Better resources"
// - "Learning" -> "Improved learning"
// - "Study tips" -> "Exam success"
// - "Confusing" -> "Helpful"

// TITLE RULES:
// - The title must be benefit-driven and scan-friendly.
// - Good title styles:
//   - "From second-guessing to clarity"
//   - "What changes when this clicks"
//   - "Before this vs after this"
//   - "Where you're stuck vs where this helps"

// HEADERS RULES:
// - Use emotional contrast headers, not generic labels.
// - Good examples:
//   - ["Without this", "With this"]
//   - ["Before", "After"]
//   - ["Stuck here", "Get this instead"]

// CONTEXT TO USE:
// - Prioritize the persona's hidden fears, hidden insecurity, urgency triggers, and desired transformation.
// - Prioritize benefits, not curriculum topics.
// - If possible, reflect the cost of doing nothing in one row.
// - If possible, include one row that reduces self-doubt and one row that promises clearer action.

// The table should feel persuasive enough that a reader could understand the value of the email without reading anything else.
// `;


// async function emailGeneratorAgent(blueprint, persona, research, competitor, context = {}) {
//   const signals = extractPersonaSignals(persona);

//   const systemPrompt = `You are an elite email growth copywriter for an accounting and finance education brand. Your subject lines must be strong enough to win the inbox even against a reader who is busy, distracted, and about to skip everything unread.

// CRITICAL RULES:
// - Output ONLY valid JSON. No markdown, no prose, no code fences.
// - Keep the email concise, skimmable, and conversion-oriented.
// - Do not invent stats, guarantees, or unsupported claims.
// - Do not mention city or state names in the email body.
// - All array fields must be actual JSON arrays of strings.

// OBSESSIVE-OPEN-RATE PLAYBOOK (the reader must feel like NOT opening this is the risk):
// - Subject line: 4-8 words. It must either (a) name the reader's exact hidden fear or insecurity back to them with unsettling precision, (b) open a curiosity gap tied to a specific outcome they want, or (c) use their own words/phrasing back at them so it feels personally written, not sent. Never generic. No clickbait the email doesn't deliver on — the gap must resolve honestly inside the email.
// - Preheader must extend the subject's curiosity, not repeat it — it's the second hook, and should raise the stakes or add a second, related fear/desire.
// - Opening line must hook in the first sentence using the persona's hidden fear, hidden insecurity, or a live daily-life moment they'd recognize instantly — never "Hi there, hope you're doing well."
// - Where possible, mirror the persona's own voice/phrases (their "commonPhrases" or the way they describe the struggle) rather than marketing language — it should read like someone who has actually heard them say this.
// - Write like a smart person emailing a friend a genuinely useful find — short paragraphs, plain language, zero corporate tone.
// - Value points and proof points must each be a specific, concrete payoff or credible signal — not vague benefits.
// - If a "fear of inaction" outcome is available, use it once, gently — name the cost of doing nothing without fear-mongering or manipulation. It must remain honest and non-coercive.
// - CTA should feel like the obvious next click, using momentum language ("Get the breakdown", "See what changed") over generic ("Read more", "Click here").
// - Every line must earn its place against a reader ready to archive unread.
// - Include a short "at a glance" table (2-4 rows) so a skimmer can grasp the core value in under 5 seconds without reading the full email. Keep cells short — a few words each, not full sentences.
// - Never manipulate, shame, or exaggerate. The urgency must come from truthfully naming a real stake the persona already feels, not from invented scarcity or false claims.`;

//   const userPrompt = `Create a campaign email that promotes the newly generated content to the same audience.

// === STRATEGIC BLUEPRINT ===
// Emotional Hook: ${blueprint.emotionalHook || blueprint.emotionalTone || ""}
// Emotional Angle: ${blueprint.emotionalAngle || ""}
// Transformation: ${blueprint.transformationStory || blueprint.contentAngle || ""}
// Trust Strategy: ${blueprint.trustBuildingStrategy || ""}
// Sections: ${joinList(blueprint.sectionsToCover)}
// Primary CTA: ${blueprint.ctaStrategy || ""}
// Target Keywords: ${joinList(blueprint.targetKeywords)}
// Word Count Goal: ${blueprint.wordCount || 1000}

// === AUDIENCE PSYCHOLOGY ===
// Reader: ${signals.buyerPersonaLabel}
// Identity Belief / Who They Are: ${signals.identityBelief}
// Defining Quote (their own words): ${signals.definingQuote}
// Hidden Insecurity: ${signals.hiddenInsecurity}
// Their Own Phrases For The Struggle: ${joinList(signals.voicePhrases)}
// Hidden Fears: ${joinList(signals.hiddenFears)}
// Live Situations They'd Recognize: ${joinList(signals.liveSituations, 3)}
// Emotional Triggers: ${joinList(signals.emotionalTriggers)}
// Objections They're Silently Holding: ${joinList(signals.objections, 4)}
// What Builds Their Trust Fast: ${joinList(signals.trustFactors, 4)}
// Cost Of Doing Nothing (fear of inaction): ${joinList(signals.fearOfInaction, 2)}
// What Creates Urgency For Them Right Now: ${joinList(signals.urgencyTriggers)}
// Messaging That Instantly Resonates: ${joinList(signals.messagingThatResonates)}
// Single Strongest Resonance Line: ${signals.instantResonanceMessage}

// === RESEARCH INTELLIGENCE ===
// AI Search Queries: ${joinList(research.aiSearchQueries)}
// Trust Signals: ${joinList(research.trustSignals)}
// Trending Topics: ${joinList(research.trendInsights)}

// === COMPETITOR GAPS ===
// Emotional Gaps: ${joinList(competitor.emotionalGaps)}
// Trust Gaps: ${joinList(competitor.trustGaps)}
// Blind Spots: ${joinList(competitor.competitorBlindSpots)}

// === EMAIL CONTEXT ===
// Campaign Type: ${context.emailType || ""}
// Audience Category: ${context.audienceCategory || signals.buyerPersonaLabel}
// CTA URL Path: ${context.ctaUrlPath || ""}

// Write an email that:
// 1. Subject line names the reader's hidden fear/insecurity with unsettling precision, opens a specific curiosity gap, or echoes their own phrasing — strong enough to win the inbox from a busy, distracted reader.
// 2. Preheader extends the hook further and raises the stakes — it doesn't restate the subject.
// 3. Opens with a sharp first line built from the persona's hidden fears, hidden insecurity, or a live situation they'd instantly recognize — never a generic greeting.
// 5. Includes 3 concise value/proof points, each a specific, concrete payoff or credible signal — pull from trust factors and research trust signals where possible.
// 6. Uses the "cost of doing nothing" once, honestly and without manipulation, if material is available.
// 7. Ends with one clear, momentum-driven CTA that feels like the obvious next click.
// 8. Reads like a sharp, useful note from a person who has actually heard this reader talk about their struggle — not a corporate broadcast.
// 9. quickScanTable must cover: ${tablePrompt}

// Output EXACTLY this JSON structure:
// {
//   "audienceSegment": "string",
//   "subject": "string",
//   "preheader": "string",
//   "headline": "string",
//   "opening": "string",
//   "valuePoints": ["point 1", "point 2", "point 3"],
//   "proofPoints": ["proof 1", "proof 2", "proof 3"],
//   "ctaText": "string",
//   "ctaReasoning": "string",
//   "closing": "string",
//   "emailCopy": "full email body as clean plain text or markdown, including the at-a-glance table rendered as a markdown table",
//   "quickScanTable": {
//     "title": "From second-guessing to clarity",
//     "headers": ["Without this", "With this"],
//     "rows": [
//       ["Second-guess every step", "See what matters fast"],
//       ["Revise too much", "Focus where marks move"],
//       ["Know the theory", "Apply it under pressure"]
//     ]
//   },
//   "summary": "2 sentence summary of the email strategy",
//   "tone": "string",
//   "wordCount": 120,
//   "metadata": {
//     "targetKeywords": ["keyword 1", "keyword 2"],
//     "competitorBlindSpots": ["gap 1", "gap 2"]
//   }
// }`;

//   let raw = "";

//   try {
//     console.log("  [Email Generator Agent] Generating email campaign copy...");
//     raw = await groqGenerate(
//       "You are a concise email strategist for accounting education content. You transform strategic intelligence and deep persona psychology into a compact, persuasive email that feels human, specific, and personally written to one reader.",
//       userPrompt,
//       { model: "llama-3.3-70b-versatile", temperature: 0.7, maxTokens: 2500 }
//     );
//   } catch (err) {
//     console.error("Email Generator Agent — Groq generation failed:", err.message);
//     return buildFallbackEmail(blueprint, persona, research, competitor, context);
//   }

//   const parsed = safeParseJSON(raw);
//   if (!parsed || !parsed.subject || !Array.isArray(parsed.valuePoints)) {
//     return buildFallbackEmail(blueprint, persona, research, competitor, context);
//   }

//   return {
//     campaignType: parsed.campaignType || context.emailType || "",
//     audienceSegment: parsed.audienceSegment || context.audienceCategory || signals.buyerPersonaLabel,
//     subject: parsed.subject,
//     preheader: parsed.preheader || blueprint.emotionalHook || "",
//     headline: parsed.headline,
//     opening: parsed.opening || "",
//     valuePoints: normalizeList(parsed.valuePoints, 3),
//     proofPoints: normalizeList(parsed.proofPoints, 3),
//     ctaText: parsed.ctaText || context.ctaText || "Read the full article",
//     // ctaUrlPath: parsed.ctaUrlPath || context.ctaUrlPath || "",
//     ctaReasoning: parsed.ctaReasoning || "",
//     closing: parsed.closing || "",
//     emailCopy: parsed.emailCopy || "",
//     quickScanTable: {
//       title: parsed.quickScanTable?.title || "At a glance",
//       headers: Array.isArray(parsed.quickScanTable?.headers) && parsed.quickScanTable.headers.length > 0
//         ? parsed.quickScanTable.headers.filter(Boolean)
//         : ["What you'll learn", "Why it matters"],
//       rows: Array.isArray(parsed.quickScanTable?.rows) && parsed.quickScanTable.rows.length > 0
//         ? parsed.quickScanTable.rows.filter((r) => Array.isArray(r) && r.length)
//         : (() => {
//           const sections = normalizeList(blueprint.sectionsToCover, 3);
//           const keywords = normalizeList(blueprint.targetKeywords, 3);
//           if (sections.length > 0 || keywords.length > 0) {
//             return sections.map((section, i) => [
//               section || "Key insight",
//               keywords[i] || "Practical benefit"
//             ]);
//           }
//           // Ultimate fallback if no blueprint data
//           return [
//             ["Career clarity", "Practical next steps"],
//             ["Industry insights", "Actionable strategies"],
//             ["Professional growth", "Real-world application"]
//           ];
//         })(),
//     },
//     summary: parsed.summary || blueprint.contentDirection || "",
//     tone: parsed.tone || "clear and practical",
//     wordCount: parseInt(parsed.wordCount, 10) || 120,
//     metadata: {
//       targetKeywords: normalizeList(parsed.metadata?.targetKeywords || blueprint.targetKeywords, 5),
//       competitorBlindSpots: normalizeList(
//         parsed.metadata?.competitorBlindSpots || competitor.competitorBlindSpots,
//         3
//       ),
//     },
//     methodology: {
//       approach: "Email Strategy Synthesis (JSON Enforced)",
//       reasoning:
//         "Convert into a concise email campaign using deep persona psychology (hidden fears, voice, objections, trust factors, fear of inaction), research signals, and competitor gaps.",
//       inputs: ["Blueprint", "Persona", "Research", "Competitor Analysis", "Blog Output"],
//     },
//   };
// }

// module.exports = emailGeneratorAgent;