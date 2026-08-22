const mongoose = require("mongoose");

const emailCampaignSchema = new mongoose.Schema(
  {
    // audienceSegment: {
    //   type: String,
    //   required: true,
    // },

    // Email content
    subject: {
      type: String,
      required: true,
    },
    heading: {
      type: String,
      default: "",
    },
    tag: {
      type: String,
      default: "",
    },
    // Campaign strategy
    intro: {
      type: String,
      default: "",
    },
    stats: {
      type: [{ label: String, value: String }],
      default: [],
    },
    bullets: {
      type: [String],
      default: [],
    },
    format: {
      type: String,
      default: "simulation", // simulation, webinar, table, case_study, urgency, final_call
    },
    simulations: {
      type: [String],
      default: [],
    },
    programDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    eventDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    tableData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    deadline: {
      type: String,
      default: "",
    },
    programs: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    program: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // tone: {
    //   type: String,
    //   default: "",
    // },
    // wordCount: {
    //   type: Number,
    //   default: 0,
    // },

    // // Metadata
    // metadata: {
    //   blogTitle: String,
    //   targetKeywords: [String],
    //   competitorBlindSpots: [String],
    // },

    // Two-stage admin approval status (mirrors Blog.status).
    // "pending"   -> just generated from an approved calendar slot, awaiting content review
    // "approved"  -> admin approved the actual email copy; the email-bot scheduler
    //                (root project, services/agentCampaignFetcher.js) will pick it up and send it
    // "rejected"  -> admin rejected the copy; never sent
    // "published" -> the email-bot actually sent it (set by markCampaignAsSent after delivery)
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
    // Target course (CBA/DGM/TBM) — which program's persona/offer drove this email
    course: {
      type: String,
      default: "CBA",
    },

    // Autonomous system fields
    // audienceCategory: {
    //   type: String,
    //   default: "",
    // },
    // targetLocation: {
    //   type: String,
    //   default: "",
    // },
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

    // Email sending tracking
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

module.exports = mongoose.model("EmailCampaign", emailCampaignSchema);