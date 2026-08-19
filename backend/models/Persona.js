const mongoose = require("mongoose");

const personaSchema = new mongoose.Schema({
  domain: { type: String, required: true },
  companyName: { type: String },
  selectedTemplates: [String],
  profile: {
    buyerPersona: String,
    painPoints: [String],
    emotions: [String],
    fears: [String],
    goals: [String],
    searchIntent: [String],
    behavioralPatterns: [String],
    psychologicalTriggers: [String],
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Persona", personaSchema);
