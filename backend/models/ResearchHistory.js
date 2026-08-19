const mongoose = require("mongoose");

const researchSchema = new mongoose.Schema({
  domain: { type: String, required: true },
  companyName: String,
  keywords: [String],
  trendingTopics: [String],
  contextualQueries: [String],
  topicClusters: [String],
  searchPatterns: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ResearchHistory", researchSchema);
