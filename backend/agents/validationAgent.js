const { groqGenerate } = require("./clients/groqClient");
const safeParseJSON = require("./jsonParser/jsonParser");

/**
 * Validation Agent — STEP 9 of the pipeline.
 * Expanded validation checking:
 * emotional depth, trust-building, SEO, readability,
 * psychological alignment, competitor differentiation, content quality.
 */
async function validationAgent(blogResult, blueprint, persona, research, competitor) {
  const issues = [];
  let score = 100;

  // --- 1. Basic Structure Checks ---
  if (!blogResult.content || blogResult.content.length < 200) {
    issues.push({ field: "content", issue: "Content is too short or missing" });
    score -= 20;
  }

  if (!blogResult.title || blogResult.title.length < 10) {
    issues.push({ field: "title", issue: "Title is too short or missing" });
    score -= 10;
  }

  const h2Count = (blogResult.content?.match(/^##\s+/gm) || []).length;
  if (h2Count < 2) {
    issues.push({ field: "structure", issue: "Content needs more H2 sections for readability" });
    score -= 10;
  }

  const wordCount = blogResult.content?.split(/\s+/).length || 0;
  if (wordCount < 300) {
    issues.push({ field: "wordCount", issue: `Only ${wordCount} words — needs minimum 300` });
    score -= 20;
  }

  // --- 2. Accounting Domain Relevance Check ---
  const accountingTerms = ["accounting", "finance", "tally", "gst", "taxation", "bookkeeping", "b.com", "commerce", "audit", "salary", "career", "job", "interview", "skills"];
  const contentLower = (blogResult.content || "").toLowerCase();
  const relevanceCount = accountingTerms.filter(t => contentLower.includes(t)).length;
  if (relevanceCount < 3) {
    issues.push({ field: "domainRelevance", issue: "Content lacks accounting/finance domain specificity" });
    score -= 10;
  }

  let detailedScores = {};
  // --- 3. Deep Psychological Quality Check (LLM Based) ---
  if (blogResult.content && blogResult.content.length > 500) {
    try {
      const prompt = `You are a strict Senior Editor specializing in ACCOUNTING EDUCATION content. Review this article against our audience intelligence.

=== AUDIENCE ===
Reader: ${persona.buyerPersona}
Hidden Fears: ${Array.isArray(persona.hiddenFears) ? persona.hiddenFears.slice(0, 2).join("; ") : ""}
Target Transformation: ${blueprint.transformationStory || "N/A"}

=== THE ARTICLE ===
TITLE: ${blogResult.title}
CONTENT (first 2000 chars):
${blogResult.content.substring(0, 2000)}

Evaluate on these 7 criteria (0-100 each):
1. EMOTIONAL_DEPTH: Does it connect with real accounting student/professional emotions?
2. TRUST_BUILDING: Does it include proof, data, or relatable scenarios?
3. SEO_QUALITY: Is it keyword-rich and well-structured?
4. READABILITY: Short paragraphs, clear language, scannable?
5. PSYCHOLOGICAL_ALIGNMENT: Does it address the persona's specific fears and goals?
6. COMPETITOR_DIFFERENTIATION: Does it say things competitors wouldn't?
7. CONTENT_QUALITY: Is it genuinely helpful and non-generic?

Also check: does it sound robotic? Does it use AI clichés?

CRITICAL RULES:
- Output ONLY valid JSON. No markdown, no prose, no code fences.

Respond EXACTLY in JSON:
{
  "emotionalDepth": 85,
  "trustBuilding": 80,
  "seoQuality": 90,
  "readability": 85,
  "psychologicalAlignment": 85,
  "competitorDifferentiation": 80,
  "contentQuality": 85,
  "isRobotic": false,
  "critiques": ["critique 1", "critique 2"]
}`;

      let feedback = {};
      
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`  [Validation Agent] Extracting JSON feedback (Attempt ${attempt})...`);
          const rawFeedback = await groqGenerate(
            "You are a harsh editorial reviewer for accounting education content. You expect psychological depth, practical value, and emotional resonance. Output valid JSON only.",
            prompt,
            { model: "openai/gpt-oss-20b", temperature: 0.1, maxTokens: 600 }  // Scoring JSON: 9 numbers + array
          );
          
          feedback = safeParseJSON(rawFeedback);
          if (feedback && typeof feedback.emotionalDepth === "number") {
            break; // Successfully parsed
          } else {
            throw new Error("Invalid or missing JSON fields");
          }
        } catch (err) {
          console.warn(`  [Validation Agent] JSON Extraction failed on attempt ${attempt}: ${err.message}`);
          if (attempt === 2) {
            feedback = {
               emotionalDepth: 50, trustBuilding: 50, seoQuality: 50, readability: 50,
               psychologicalAlignment: 50, competitorDifferentiation: 50, contentQuality: 50,
               isRobotic: false, critiques: ["Validation JSON extraction failed."]
            };
          }
        }
      }

      // Calculate average of all 7 scores
      const scores = [
        feedback.emotionalDepth || 50,
        feedback.trustBuilding || 50,
        feedback.seoQuality || 50,
        feedback.readability || 50,
        feedback.psychologicalAlignment || 50,
        feedback.competitorDifferentiation || 50,
        feedback.contentQuality || 50
      ];
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      if (avgScore < 60) {
        issues.push({ field: "overallQuality", issue: `Average quality score is ${avgScore}/100 — below production threshold.` });
        score -= (60 - avgScore);
      }

      if (feedback.isRobotic) {
        issues.push({ field: "tone", issue: "Content sounds too robotic or uses AI clichés." });
        score -= 15;
      }

      if (feedback.critiques && feedback.critiques.length > 0) {
        issues.push({ field: "editorialCritique", issue: feedback.critiques[0] });
      }

      // Store detailed scores
      detailedScores = {
        emotionalDepth: feedback.emotionalDepth || 50,
        trustBuilding: feedback.trustBuilding || 50,
        seoQuality: feedback.seoQuality || 50,
        readability: feedback.readability || 50,
        psychologicalAlignment: feedback.psychologicalAlignment || 50,
        competitorDifferentiation: feedback.competitorDifferentiation || 50,
        contentQuality: feedback.contentQuality || 50
      };

    } catch (e) {
      console.error("Validation Agent Error:", e.message);
      issues.push({ field: "validationError", issue: "Could not run deep quality validation." });
    }
  }

  const keywordsFound = (blueprint.targetKeywords || []).filter(kw =>
    blogResult.content?.toLowerCase().includes(kw.toLowerCase())
  );

  return {
    isValid: score >= 60,
    issues,
    score: Math.max(0, Math.min(100, score)),
    detailedScores,
    keywordsIntegrated: keywordsFound.length,
    totalKeywords: (blueprint.targetKeywords || []).length,
    h2Count,
    wordCount,
    domainRelevanceScore: relevanceCount,
    methodology: {
      approach: "7-Dimension Quality Validation",
      dimensions: ["Emotional Depth", "Trust Building", "SEO Quality", "Readability", "Psychological Alignment", "Competitor Differentiation", "Content Quality"],
      reasoning: `Validated content across 7 quality dimensions with both rule-based checks and LLM-based psychological analysis (JSON Enforced). Domain relevance: ${relevanceCount}/${accountingTerms.length} accounting terms found.`
    }
  };
}

module.exports = validationAgent;
