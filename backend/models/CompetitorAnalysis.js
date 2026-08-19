const mongoose = require("mongoose");

const competitorAnalysisSchema = new mongoose.Schema({
  domain: { type: String, required: true },
  companyName: String,
  competitorWebsites: [String],
  keywordGaps: [String],
  missingTopics: [String],
  rankingOpportunities: [String],
  competitorWeaknesses: [String],
  underservedIntent: [String],
  strategyNotes: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CompetitorAnalysis", competitorAnalysisSchema);
