const mongoose = require("mongoose");

// Sub-schema: Website Blog Slots
const blogSlotSchema = new mongoose.Schema(
  {
    slotKey: {
      type: String,
      required: true,
    },
    scheduledDay: {
      type: Number,
      required: true,
    },
    scheduledTimestamp: {
      type: Date,
      required: true,
    },
    channel: {
      type: String,
      default: "WEBSITE",
    },
    title: {
      type: String,
      required: true,
    },
    primaryKeyword: {
      type: String,
      default: "",
    },
    gapKeywords: {
      type: [String],
      default: [],
    },
    coreAngle: {
      type: String,
      default: "",
    },
    options: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    selectedOptionIndex: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["PENDING_ADMIN_APPROVAL", "APPROVED", "REJECTED", "GENERATED", "PUBLISHED"],
      default: "PENDING_ADMIN_APPROVAL",
    },
    // Reference to the generated Blog document after approval
    generatedBlogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
    },
  },
  { _id: false }
);

// Sub-schema: Email Message Slots
const emailSlotSchema = new mongoose.Schema(
  {
    slotKey: {
      type: String,
      required: true,
    },
    scheduledDay: {
      type: Number,
      required: true,
    },
    scheduledTimestamp: {
      type: Date,
      required: true,
    },
    channel: {
      type: String,
      default: "EMAIL",
    },
    funnelStage: {
      type: String,
      enum: ["1_AWARENESS", "2_ENGAGEMENT", "3_CONVERSION"],
      required: true,
    },
    subjectLine: {
      type: String,
      required: true,
    },
    previewText: {
      type: String,
      default: "",
    },
    gapKeywords: {
      type: [String],
      default: [],
    },
    coreAngle: {
      type: String,
      default: "",
    },
    options: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    selectedOptionIndex: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["PENDING_ADMIN_APPROVAL", "APPROVED", "REJECTED", "GENERATED", "PUBLISHED"],
      default: "PENDING_ADMIN_APPROVAL",
    },
    // Reference to the generated EmailCampaign document after approval
    generatedEmailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailCampaign",
    },
  },
  { _id: false }
);

// Sub-schema: WhatsApp Message Slots
const whatsappSlotSchema = new mongoose.Schema(
  {
    slotKey: {
      type: String,
      required: true,
    },
    scheduledDay: {
      type: Number,
      required: true,
    },
    scheduledTimestamp: {
      type: Date,
      required: true,
    },
    channel: {
      type: String,
      default: "WHATSAPP",
    },
    funnelStage: {
      type: String,
      enum: ["1_AWARENESS", "2_ENGAGEMENT", "3_CONVERSION"],
      required: true,
    },
    whatsappHook: {
      type: String,
      required: true,
    },
    gapKeywords: {
      type: [String],
      default: [],
    },
    ctaGoal: {
      type: String,
      default: "",
    },
    options: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    selectedOptionIndex: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["PENDING_ADMIN_APPROVAL", "APPROVED", "REJECTED", "GENERATED", "PUBLISHED"],
      default: "PENDING_ADMIN_APPROVAL",
    },
    // Reference to the generated WhatsAppCampaign document after approval
    generatedWhatsAppId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WhatsAppCampaign",
    },
  },
  { _id: false }
);

// Main Content Calendar Schema
const contentCalendarSchema = new mongoose.Schema(
  {
    calendarId: {
      type: String,
      required: true,
      unique: true,
    },
    campaignName: {
      type: String,
      required: true,
    },
    timeframe: {
      type: String,
      default: "15 Days",
    },

    // Approval gate status
    status: {
      type: String,
      enum: [
        "PENDING_ADMIN_APPROVAL",
        "APPROVED",
        "REJECTED",
        "IN_PROGRESS",
        "COMPLETED",
      ],
      default: "PENDING_ADMIN_APPROVAL",
    },

    // Summary counts
    summary: {
      totalBlogs: {
        type: Number,
        default: 0,
      },
      totalEmails: {
        type: Number,
        default: 0,
      },
      totalWhatsAppMessages: {
        type: Number,
        default: 0,
      },
      activeFunnelStages: {
        type: [String],
        default: ["1_AWARENESS", "2_ENGAGEMENT"],
      },
    },

    // Multi-stream scheduled content items
    schedule: {
      websiteBlogs: [blogSlotSchema],
      emailMessages: [emailSlotSchema],
      whatsappMessages: [whatsappSlotSchema],
    },

    // All three streams merged and grouped by calendar date (YYYY-MM-DD),
    // pre-sorted, so the frontend can render a day-by-day calendar directly
    // without re-merging/sorting websiteBlogs + emailMessages + whatsappMessages.
    calendarView: {
      type: [
        {
          date: { type: String, required: true }, // "YYYY-MM-DD"
          items: [
            {
              slotKey: String,
              channel: String,
              scheduledTimestamp: Date,
              time: String, // "HH:MM"
              label: String,
              status: String,
              funnelStage: { type: String, default: null },
              options: { type: [mongoose.Schema.Types.Mixed], default: [] },
              selectedOptionIndex: { type: Number, default: 0 },
            },
          ],
        },
      ],
      default: [],
    },

    // Autonomous pipeline tracking
    pipelineRunId: {
      type: String,
      default: "",
    },
    audienceCategory: {
      type: String,
      default: "",
    },
    targetLocation: {
      type: String,
      default: "",
    },
    generatedBy: {
      type: String,
      enum: ["manual", "autonomous"],
      default: "autonomous",
    },

    // Business context
    businessContext: {
      companyName: String,
      domain: String,
      industry: String,
    },

    // Approval tracking
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: String,
      default: "Admin",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContentCalendar", contentCalendarSchema);