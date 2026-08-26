require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const blogRoutes = require("./routes/blogRoutes");
const emailRoutes = require("./routes/emailRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { startScheduler } = require("./scheduler/cronScheduler");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://chartersbusiness-admin.vercel.app",
  "https://chartersunion.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:4173",
  "http://localhost:5173",
  "http://localhost:4000",
  "https://hello0123.netlify.app"
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app") || origin.endsWith(".onrender.com")) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));



app.use(express.json({ limit: "10mb" }));


// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", blogRoutes);
app.use("/api", emailRoutes);
app.use("/api", whatsappRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ 
    status: "online", 
    message: "🚀 AccountIQ Autonomous AI Content Intelligence System",
    system: "Production-Level Autonomous AI SEO Content Intelligence",
    features: [
      "Autonomous 15-day content generation",
      "Multi-model AI Intelligence (Powered by Groq)",
      "Location intelligence (Kolkata, Lucknow)",
      "9 hardcoded competitor analysis",
      "7-dimension validation",
      "Self-learning memory system"
    ],
    timestamp: new Date().toISOString()
  });
});

const WhatsAppCampaign = require("./models/WhatsAppCampaign");
const EmailCampaign = require("./models/EmailCampaign");
const ContentCalendar = require("./models/ContentCalendar");
const { writeWhatsAppCampaign, writeEmailCampaign } = require("./services/excelConnector");

async function autoSyncApprovedToSheets() {
  try {
    console.log("📊 [Auto-Sync] Synchronizing approved/published campaigns to Google Sheets...");
    const waList = await WhatsAppCampaign.find({ status: { $in: ["approved", "published"] } });
    for (const wa of waList) {
      let calendar = null;
      if (wa.calendarId) {
        calendar = wa.calendarId.startsWith("CAL_")
          ? await ContentCalendar.findOne({ calendarId: wa.calendarId })
          : await ContentCalendar.findById(wa.calendarId);
      }
      await writeWhatsAppCampaign(wa, calendar);
    }

    const emailList = await EmailCampaign.find({ status: { $in: ["approved", "published"] } });
    for (const em of emailList) {
      let calendar = null;
      if (em.calendarId) {
        calendar = em.calendarId.startsWith("CAL_")
          ? await ContentCalendar.findOne({ calendarId: em.calendarId })
          : await ContentCalendar.findById(em.calendarId);
      }
      await writeEmailCampaign(em, calendar);
    }
    console.log(`✅ [Auto-Sync] Successfully synced ${waList.length} WhatsApp and ${emailList.length} Email campaigns to Google Sheets.`);
  } catch (err) {
    console.error("⚠️ [Auto-Sync] Google Sheets sync error:", err.message);
  }
}

// ─── Start server + scheduler ─────────────────────────────────────────────────
const server = app.listen(PORT, async () => {
  console.log(`🌐 Server listening on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/stats`);
  
  // Start the autonomous scheduler
  startScheduler();

  // Run initial automatic sync to Google Sheets
  await autoSyncApprovedToSheets();
});

// ─── Graceful Shutdown (Releases Port on Ctrl+C) ──────────────────────────────
function handleShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Closing server on port ${PORT}...`);
  server.close(() => {
    console.log(`✅ Server on port ${PORT} closed cleanly.`);
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));