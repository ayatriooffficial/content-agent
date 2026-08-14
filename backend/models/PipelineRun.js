const mongoose = require("mongoose");

const pipelineRunSchema = new mongoose.Schema({
  // Run metadata
  runId: { type: String, required: true, unique: true },
  runType: { type: String, enum: ["autonomous", "manual_trigger"], default: "autonomous" },
  status: { type: String, enum: ["running", "completed", "failed","awaiting_approval"], default: "running" },
  
  // Selection intelligence
  selectedAudienceCategory: { type: String, required: true },
  selectedLocation: { type: String },
  opportunityScore: { type: Number },
  selectionReasoning: { type: String },

  // Agent outputs
  agentOutputs: {
    opportunityAnalysis: { type: mongoose.Schema.Types.Mixed },
    personaIntelligence: { type: mongoose.Schema.Types.Mixed },
    researchIntelligence: { type: mongoose.Schema.Types.Mixed },
    competitorIntelligence: { type: mongoose.Schema.Types.Mixed },
    orchestratorBlueprint: { type: mongoose.Schema.Types.Mixed },
    contentCalendar: { type: mongoose.Schema.Types.Mixed },
    emailCampaign: { type: mongoose.Schema.Types.Mixed },
    whatsappCampaign: { type: mongoose.Schema.Types.Mixed },
    validationResult: { type: mongoose.Schema.Types.Mixed }
  },

  // Result
  generatedBlogId: { type: mongoose.Schema.Types.ObjectId, ref: "Blog" },
  generatedBlogTitle: { type: String },
  
  // Timing
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  durationMs: { type: Number },

  // Error tracking
  error: { type: String },
  failedAtStep: { type: String },

  // Agent step tracking for streaming
  currentStep: { type: String },
  stepLog: [{
    step: String,
    status: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model("PipelineRun", pipelineRunSchema);