const mongoose = require("mongoose");

const audienceCategoryScoreSchema = new mongoose.Schema({
  category: { type: String, required: true },
  scores: {
    searchDemand: { type: Number, default: 0 },
    emotionalIntensity: { type: Number, default: 0 },
    competitorGaps: { type: Number, default: 0 },
    seoOpportunity: { type: Number, default: 0 },
    trendGrowth: { type: Number, default: 0 },
    locationDemand: { type: Number, default: 0 },
    previousSuccess: { type: Number, default: 0 }
  },
  totalScore: { type: Number, default: 0 },
  reasoning: { type: String },
  keyInsights: [String]
}, { _id: false });

const opportunityScoreSchema = new mongoose.Schema({
  // Location context
  targetLocation: { type: String, required: true },
  
  // Audience category scores
  categoryScores: [audienceCategoryScoreSchema],
  
  // Winner
  selectedCategory: { type: String, required: true },
  selectionReasoning: { type: String },
  
  // Market context
  marketTrends: [String],
  competitorWeaknesses: [String],
  emotionalOpportunities: [String],
  seoGaps: [String],
  
  // Metadata
  analyzedAt: { type: Date, default: Date.now },
  validUntil: { type: Date },
  methodology: { type: mongoose.Schema.Types.Mixed }
});

module.exports = mongoose.model("OpportunityScore", opportunityScoreSchema);
