const { generateBest } = require("./clients/providerRouter");
const safeParseJSON = require("./jsonParser/jsonParser");

/**
 * Content Generation Agent — STEP 8 of the pipeline.
 * Generates accounting/finance domain content using:
 * persona psychology, competitor gaps, research intent,
 * emotional hooks, trust-building, and transformation storytelling.
 */
async function blogGeneratorAgent(blueprint, persona, research, competitor) {
  const course = blueprint.course || "CBA";
  const programSpec = blueprint.programSpec || {};
  const prompt = `You are a world-class content strategist for education in India (${course}: ${programSpec.label || programSpec.code || "career-focused program"}). Write a production-quality blog that deeply connects with the reader's psychology.

=== PROGRAM CONTEXT (${course}) ===
Course promise: ${programSpec.corePromise || ""}
Course outcomes: ${(programSpec.keyOutcomes || []).join(", ")}
Course objections to address: ${(programSpec.commonObjections || []).slice(0, 6).join(" | ")}

=== STRATEGIC BLUEPRINT ===
TITLE: ${blueprint.blogTitle}
EMOTIONAL HOOK: ${blueprint.emotionalHook || blueprint.emotionalTone}
EMOTIONAL ANGLE: ${blueprint.emotionalAngle || "Empathy + practical roadmap"}
TRANSFORMATION: ${blueprint.transformationStory || blueprint.contentAngle}
TRUST STRATEGY: ${blueprint.trustBuildingStrategy}
SECTIONS: ${(blueprint.sectionsToCover || []).join(", ")}
CTA: ${blueprint.ctaStrategy}
KEYWORDS: ${(blueprint.targetKeywords || []).join(", ")}
WORD COUNT: ${blueprint.wordCount || 1000}

=== AUDIENCE PSYCHOLOGY ===
Reader: ${persona.buyerPersona || "Accounting student"}
Character Snapshot: ${persona.characterSnapshot || ""}
Identity Belief: ${persona.identityBelief || ""}
Hidden Fears: ${Array.isArray(persona.hiddenFears) ? persona.hiddenFears.join("; ") : (persona.hiddenFears || "")}
Fear of Inaction (what happens if they do nothing): ${Array.isArray(persona.fearOfInaction) ? persona.fearOfInaction.join("; ") : (persona.fearOfInaction || "")}
Hidden Pains: ${Array.isArray(persona.painPoints) ? persona.painPoints.join("; ") : ""}
Live Situations: ${Array.isArray(persona.liveSituations) ? persona.liveSituations.slice(0, 2).join("; ") : ""}
Emotional Triggers: ${Array.isArray(persona.emotionalTriggers) ? persona.emotionalTriggers.join(", ") : (persona.emotionalTriggers || "")}
Their Exact Objections: ${Array.isArray(persona.objectionsBeforePurchase?.exactObjections) ? persona.objectionsBeforePurchase.exactObjections.join("; ") : (Array.isArray(persona.purchaseBarriers) ? persona.purchaseBarriers.join("; ") : "")}
Trust Factors They Need: ${Array.isArray(persona.trustFactorsNeeded) ? persona.trustFactorsNeeded.slice(0, 5).join("; ") : ""}
Problem they think they have: ${persona.problemTheyThinkTheyHave || ""}
Problem they actually have: ${persona.problemTheyActuallyHave || ""}
Transformation: "${persona.transformationGoal?.beforeState || persona.beforeState || ""}" → "${persona.transformationGoal?.afterState || persona.afterState || ""}"

=== RESEARCH INTELLIGENCE ===
AI Search Queries to Answer: ${(research.aiSearchQueries || []).join(", ")}
Exact Search Intents: ${(research.exactSearchIntents || []).join(", ")}
Real User Voice (Reddit/Quora): ${(research.redditVoicePhrases || []).join("; ")}
Trust Signals to Include: ${(research.trustSignals || []).join(", ")}

=== COMPETITOR GAPS TO EXPLOIT ===
Emotional Gaps: ${(competitor.emotionalGaps || []).join(", ")}
Trust Gaps: ${(competitor.trustGaps || []).join(", ")}
Blind Spots: ${(competitor.competitorBlindSpots || []).join(", ")}

WRITING RULES:
1. STRUCTURE: Start with # H1 Title. Use ## H2 for main sections and ### H3 for deeper insights.
2. EMPATHY FIRST: Open by validating their EXACT pain. Use live situations from the persona.
3. PSYCHOLOGY-DRIVEN: Every section must connect to an emotional trigger or hidden fear.
4. TRANSFORMATION: Guide from current pain to desired success with concrete steps.
5. TRUST-BUILDING: Include specific examples, data points, and relatable scenarios.
6. NO CLICHÉS: Never use "In today's fast-paced world", "Unleash", "Dive deep", "Ultimate guide". Write like a mentor talking to the reader.
7. ${course === "DGM" ? "MARKETING CONTEXT: All examples and advice must be specific to digital marketing / growth / performance careers." : "ACCOUNTING CONTEXT: All examples, scenarios, and advice must be specific to accounting/finance/commerce careers."}
8. AI-SEARCH FRIENDLY: Naturally answer the AI search queries within the text.
9. READABILITY: Short paragraphs, bullet points, bold text for emphasis.
10. COMPETITOR DIFFERENTIATION: Address the emotional gaps competitors miss.
11. NO LOCATIONS: DO NOT mention the city name (e.g., Kolkata, Lucknow) or target state in the content. Keep it universally applicable.
12. FEAR-OF-INACTION REALISM: In one section, honestly show the cost of doing nothing (stagnation, missed opportunities, salary gap) — without doom-scrolling or fake urgency.
13. ANSWER REAL OBJECTIONS: Address the persona's exact objections inside the content (e.g. "will this really get me a job?", "is it worth the money?") rather than ignoring them.
14. GROUND TRUST: Weave in the trust factors the persona needs (placement proof, practical curriculum, mentor credibility) naturally — never as a bulleted ad.

Respond in this EXACT format (first a JSON metadata block, then the markdown content):

[BEGIN_METADATA]
{
  "metaDescription": "150-160 char description with emotional hook for accounting audience",
  "summary": "2-3 sentences summarizing the emotional transformation for the blog card preview.",
  "tags": ["accounting", "career", "tag3", "tag4", "tag5"],
  "faq": [
    { "question": "Question 1?", "answer": "Answer 1" },
    { "question": "Question 2?", "answer": "Answer 2" },
    { "question": "Question 3?", "answer": "Answer 3" }
  ]
}
[END_METADATA]

[BEGIN_CONTENT]
# Your Blog Title Here
(Full blog content. ${blueprint.wordCount || 1000} words minimum. Accounting/finance focused. Deeply emotional and practical.)
[END_CONTENT]`;

  let raw = "";
  try {
    console.log("  [Blog Generator Agent] Generating 1500+ word content...");
    // Blog chain: Groq (gpt-oss-20b, long-form) → NVIDIA (MiniMax M3, 1M ctx) → OpenRouter (GLM 5.2).
    // NO Gemini — Gemini is Phase-1 only (research/calendar), not content.
    // maxTokens 3500 keeps us under Groq's 8K TPM so a blog + research never stack into a token cap.
    raw = await generateBest(
      "You are a master content writer for the Indian accounting education market. Your content feels like a warm, knowledgeable mentor speaking directly to the reader's deepest insecurities and ambitions. Every paragraph drives emotional transformation. Output strict JSON for metadata, followed by markdown content.",
      prompt,
      {
        order: ["Groq", "NVIDIA", "OpenRouter"],
        groqModel: "openai/gpt-oss-20b",
        nvidiaModel: "minimaxai/minimax-m3",
        openRouterModel: "google/gemma-4-26b-a4b-it:free",
        temperature: 0.7,
        maxTokens: 3500,
        json: false,
        caller: "blog",
      }
    );
  } catch (err) {
    console.error("Blog Generator Agent — ALL providers failed:", err.message);
    throw new Error("Content generation failed: " + err.message);
  }

  // Extract Content
  let content = extractBlock(raw, "[BEGIN_CONTENT]", "[END_CONTENT]");
  if (!content && raw.length > 500) {
    const parts = raw.split(/\[BEGIN_CONTENT\]|\[END_CONTENT\]/);
    content = parts.length >= 2 ? parts[1].trim() : raw.trim();
  }
  if (!content || content.length < 100) throw new Error("Blog generator failed to produce meaningful content.");

  // Extract Metadata via JSON
  const rawMeta = extractBlock(raw, "[BEGIN_METADATA]", "[END_METADATA]");
  let metadata = {};
  if (rawMeta) {
    metadata = safeParseJSON(rawMeta) || {};
  }

  // Fallbacks if JSON fails
  const metaDesc = metadata.metaDescription || "An insightful guide for accounting professionals and commerce students.";
  const summary = metadata.summary || "Transform your accounting career with practical insights and expert guidance.";
  const tags = Array.isArray(metadata.tags) && metadata.tags.length > 0 
    ? metadata.tags.slice(0, 6) 
    : (blueprint.targetKeywords || []).slice(0, 6);
  const faq = Array.isArray(metadata.faq) ? metadata.faq : [];

  // Extract H2s
  const h2s = [];
  const h2Regex = /^##\s+(.+)$/gm;
  let match;
  while ((match = h2Regex.exec(content)) !== null) {
    h2s.push(match[1].trim());
  }

  const ctaMatch = content.match(/(?:^|\n)(?:##\s*(?:Call to Action|CTA|Take Action|Next Steps|What's Next|Ready to|Start Your|Your Next).*?\n)([\s\S]*?)$/i);
  const cta = ctaMatch ? ctaMatch[1].trim() : blueprint.ctaStrategy || "";

  return {
    title: blueprint.blogTitle,
    metaDescription: metaDesc,
    h1: blueprint.blogTitle,
    h2s,
    content,
    summary,
    category: blueprint.category || "ACCOUNTING",
    tags,
    faq,
    cta,
    wordCount: content.split(/\s+/).length,
  };
}

function extractBlock(text, start, end) {
  if (!text) return null;
  const s = text.indexOf(start);
  const e = text.indexOf(end, s + start.length);
  if (s === -1 || e === -1) return null;
  return text.substring(s + start.length, e).trim();
}

module.exports = blogGeneratorAgent;
