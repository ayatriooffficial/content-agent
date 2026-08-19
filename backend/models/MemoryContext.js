const mongoose = require("mongoose");

const memoryContextSchema = new mongoose.Schema({
  niche: { type: String, required: true },
  generatedTitles: [String],
  usedKeywords: [String],
  usedCategories: [String],
  avoidTopics: [String],
  strategyHistory: [String],
  successfulTopics: [String],
  successfulKeywords: [String],
  // New self-learning fields
  successfulHooks: [String],
  personaHistory: [String],
  competitorPatterns: [String],
  emotionalStrategies: [String],
  researchInsights: [String],
  // NEW: Location-based patterns
  locationPatterns: [{
    location: String,
    successfulTopics: [String],
    searchPatterns: [String],
    audienceCategory: String,
    timestamp: { type: Date, default: Date.now }
  }],
  // NEW: Successful persona configurations
  successfulPersonas: [{
    audienceCategory: String,
    emotionalAngle: String,
    conversionIndicator: String,
    timestamp: { type: Date, default: Date.now }
  }],
  // NEW: SEO performance patterns
  seoPatterns: [{
    keywords: [String],
    category: String,
    validationScore: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  // NEW: Competitor gap tracking
  competitorGapHistory: [{
    competitor: String,
    gap: String,
    exploited: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
  }],
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MemoryContext", memoryContextSchema);
