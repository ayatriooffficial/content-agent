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

// ─── Start server + scheduler ─────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🌐 Server listening on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/stats`);
  
  // Start the autonomous scheduler
  startScheduler();
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