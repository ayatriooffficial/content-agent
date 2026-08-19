const mongoose = require("mongoose");

const whatsappCampaignSchema = new mongoose.Schema(
  {
    
    audienceSegment: {
      type: String,
      required: true,
    },
    
    // WhatsApp content
    headline: {
      type: String,
      required: true,
    },
    opening: {
      type: String,
      default: "",
    },
    body: {
      type: String,
      default: "",
    },
    bulletPoints: {
      type: [String],
      default: [],
    },
    ctaText: {
      type: String,
      required: true,
    },
    ctaUrlPath: {
      type: String,
      required: true,
    },
    ctaReasoning: {
      type: String,
      default: "",
    },
    closing: {
      type: String,
      default: "",
    },
    whatsappMessage: {
      type: String,
      required: true,
    },
    
    // Campaign strategy
    summary: {
      type: String,
      required: true,
    },
    tone: {
      type: String,
      default: "",
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    
    // Metadata
    metadata: {
      blogTitle: String,
      targetKeywords: [String],
      competitorBlindSpots: [String],
    },
    
    // Two-stage admin approval status (mirrors Blog.status).
    // "pending"   -> just generated from an approved calendar slot, awaiting content review
    // "approved"  -> admin approved the message. There is no live WhatsApp sending
    //                integration yet, so approval auto-completes to "published" —
    //                wire an actual WhatsApp Business API dispatch here later.
    // "rejected"  -> admin rejected the copy
    // "published" -> ready/considered sent
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "published"],
      default: "pending",
    },

    // Traceability back to the content calendar slot this was generated from
    calendarId: {
      type: String,
      default: "",
    },
    slotKey: {
      type: String,
      default: "",
    },

    // Autonomous system fields
    audienceCategory: {
      type: String,
      default: "",
    },
    targetLocation: {
      type: String,
      default: "",
    },
    // generatedBy: {
    //   type: String,
    //   enum: ["manual", "autonomous"],
    //   default: "autonomous",
    // },
    pipelineRunId: {
      type: String,
      default: "",
    },
    
    // // Business context
    // businessContext: {
    //   companyName: String,
    //   domain: String,
    //   industry: String,
    // },
    
    // WhatsApp sending tracking
    sent: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
    },
    messageId: {
      type: String,
    },
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model("WhatsAppCampaign", whatsappCampaignSchema);