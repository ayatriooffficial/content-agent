const Blog = require("../models/Blog");
const MemoryContext = require("../models/MemoryContext");

/**
 * Memory Agent — STEP 6 of the pipeline.
 * Enhanced self-learning memory system.
 * Stores: blogs, hooks, persona history, competitor patterns, emotional strategies, research history.
 * Goal: create a self-learning loop that improves content over time.
 */
async function memoryAgent(domain) {
  const domainKey = (domain || "ACCOUNTING").toUpperCase();

  let memory = await MemoryContext.findOne({ niche: domainKey });

  if (!memory) {
    const existingBlogs = await Blog.find().sort({ createdAt: -1 }).limit(50);

    memory = {
      generatedTitles: existingBlogs.map(b => b.title),
      usedKeywords: existingBlogs.flatMap(b => b.tags || []),
      usedCategories: existingBlogs.map(b => b.category).filter(Boolean),
      avoidTopics: [],
      strategyHistory: [],
      successfulTopics: [],
      successfulKeywords: [],
      successfulHooks: [],
      personaHistory: [],
      competitorPatterns: [],
      emotionalStrategies: [],
      researchInsights: [],
    };
  }

  // Build locationHistory from the locationPatterns array (already in the schema)
  const locationHistory = (memory.locationPatterns || []).map(lp => lp.location).filter(Boolean);

  return {
    previousTitles: memory.generatedTitles || [],
    previousKeywords: [...new Set(memory.usedKeywords || [])],
    previousCategories: memory.usedCategories || [],
    avoidTopics: memory.avoidTopics || [],
    strategyHistory: memory.strategyHistory || [],
    successfulTopics: memory.successfulTopics || [],
    successfulKeywords: memory.successfulKeywords || [],
    successfulHooks: memory.successfulHooks || [],
    personaHistory: memory.personaHistory || [],
    competitorPatterns: memory.competitorPatterns || [],
    emotionalStrategies: memory.emotionalStrategies || [],
    researchInsights: memory.researchInsights || [],
    locationHistory,  // ✅ Fixed: now populated from locationPatterns
    totalBlogsGenerated: (memory.generatedTitles || []).length,
    methodology: {
      approach: "MongoDB-Backed Long-Term Memory System",
      principles: ["Content Deduplication", "Strategy Evolution Tracking", "Successful Pattern Reinforcement"],
      reasoning: `Retrieved ${(memory.generatedTitles || []).length} historical entries for domain "${domainKey}". Memory prevents repetitive content and reinforces successful emotional strategies.`,
      dataStored: ["Blog titles", "Keywords", "Hooks", "Persona insights", "Competitor patterns", "Emotional strategies", "Research insights", "Location history"]
    }
  };
}

/**
 * Update memory after a blog is generated.
 * Now stores additional data for self-learning loop.
 */
async function updateMemory(domain, blogTitle, keywords, category, strategy, additionalData = {}) {
  const domainKey = (domain || "ACCOUNTING").toUpperCase();

  let memory = await MemoryContext.findOne({ niche: domainKey });

  if (!memory) {
    memory = new MemoryContext({
      niche: domainKey,
      generatedTitles: [],
      usedKeywords: [],
      usedCategories: [],
      avoidTopics: [],
      strategyHistory: [],
      successfulTopics: [],
      successfulKeywords: [],
      successfulHooks: [],
      personaHistory: [],
      competitorPatterns: [],
      emotionalStrategies: [],
      researchInsights: [],
      locationPatterns: [],
    });
  }

  memory.generatedTitles.push(blogTitle);
  memory.usedKeywords.push(...(keywords || []));
  if (category) {
    memory.usedCategories.push(category);
  }
  if (strategy) memory.strategyHistory.push(strategy);

  // ✅ Fixed: Save the target location used in this run for rotation tracking
  if (additionalData.targetLocation) {
    memory.locationPatterns = memory.locationPatterns || [];
    memory.locationPatterns.push({
      location: additionalData.targetLocation,
      audienceCategory: additionalData.audienceCategory || "",
      successfulTopics: keywords || [],
      searchPatterns: [],
      timestamp: new Date()
    });
  }

  // Store additional learning data
  if (additionalData.hook) {
    memory.successfulHooks = memory.successfulHooks || [];
    memory.successfulHooks.push(additionalData.hook);
  }
  if (additionalData.personaInsight) {
    memory.personaHistory = memory.personaHistory || [];
    memory.personaHistory.push(additionalData.personaInsight);
  }
  if (additionalData.competitorPattern) {
    memory.competitorPatterns = memory.competitorPatterns || [];
    memory.competitorPatterns.push(additionalData.competitorPattern);
  }
  if (additionalData.emotionalStrategy) {
    memory.emotionalStrategies = memory.emotionalStrategies || [];
    memory.emotionalStrategies.push(additionalData.emotionalStrategy);
  }
  if (additionalData.researchInsight) {
    memory.researchInsights = memory.researchInsights || [];
    memory.researchInsights.push(additionalData.researchInsight);
  }

  memory.lastUpdated = new Date();
  await memory.save();
}

module.exports = { memoryAgent, updateMemory };
