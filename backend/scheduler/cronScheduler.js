/**
 * CRON SCHEDULER
 * Runs the autonomous pipeline on the 1st and 15th of every month at 2:00 AM IST.
 * Uses node-cron for reliable scheduling.
 * 
 * NOTE: The gap between the 15th and 1st of the next month varies by month (14–17 days).
 * This is intentional — it approximates a bi-monthly schedule during low-traffic hours.
 */
const cron = require("node-cron");
const { runAutonomousPipeline } = require("../agents/autonomousPipeline");

let isRunning = false;
let lastRunAt = null;
let lastRunResult = null;
let lastRunError = null;
let schedulerStatus = "idle"; // idle | running | error

/**
 * Start the autonomous scheduler.
 * Runs pipeline on the 1st and 15th of every month at 2:00 AM IST.
 * 
 * Cron expression: "0 2 1,15 * *" = At 02:00 on day 1 and 15 of every month
 */
function startScheduler() {
  console.log("🕐 Autonomous scheduler initialized — runs on 1st and 15th of each month at 2:00 AM IST");

  // Schedule: 1st and 15th of every month at 2:00 AM IST
  cron.schedule("0 2 1,15 * *", async () => {
    console.log("🚀 Autonomous pipeline triggered by scheduler at", new Date().toISOString());
    await executeAutonomousRun("autonomous");
  }, {
    timezone: "Asia/Kolkata"
  });

  schedulerStatus = "idle";
}

/**
 * Execute a single autonomous run.
 * Guards against concurrent runs — always safe to call.
 * 
 * @param {string} runType - "autonomous" | "manual_trigger"
 * @returns {object} Pipeline run result
 */
async function executeAutonomousRun(runType = "autonomous") {
  // Concurrency guard — prevent two simultaneous pipeline runs
  if (isRunning) {
    console.log("⚠️  Pipeline already running. Skipping duplicate trigger.");
    return { status: "skipped", reason: "Pipeline already running" };
  }

  isRunning = true;
  schedulerStatus = "running";
  lastRunError = null;
  console.log(`🤖 Starting ${runType} pipeline run...`);

  try {
    const result = await runAutonomousPipeline({
      runType,
      onStepUpdate: (logEntry) => {
        console.log(`  [${logEntry.step}] ${logEntry.status}: ${logEntry.message || ""}`);
      }
    });

    lastRunAt = new Date();
    lastRunResult = result;
    lastRunError = null;
    schedulerStatus = "idle"; // ✅ Always reset to idle after success
    isRunning = false;

    console.log(`✅ Pipeline completed: "${result.title || "Unknown"}" (${result.durationMs}ms)`);
    return result;

  } catch (err) {
    // ✅ Bug fix: always reset isRunning so next cron trigger is not blocked
    console.error("❌ Autonomous pipeline failed:", err.message);
    lastRunError = err.message;
    lastRunResult = { status: "failed", error: err.message };
    schedulerStatus = "error";
    isRunning = false; // ✅ Always reset — even on crash
    return lastRunResult;
  }
}

/**
 * Get scheduler status for dashboard API.
 */
function getSchedulerStatus() {
  return {
    schedulerStatus,
    isRunning,
    lastRunAt,
    lastRunResult,
    lastRunError,
    nextScheduledRun: getNextScheduledRun(),
    schedule: "1st and 15th of each month at 2:00 AM IST"
  };
}

/**
 * Calculate the next scheduled run time (always returns a FUTURE date).
 * Accounts for the case where the scheduled time for today has already passed.
 */
function getNextScheduledRun() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();

  // Build candidate dates: 15th of current month, 1st of next month
  const runHour = 2; // 2:00 AM IST — NOTE: JS Date uses local server time here
  const candidates = [
    new Date(year, month, 15, runHour, 0, 0),
    new Date(year, month + 1, 1, runHour, 0, 0),
  ];

  // If current day < 15, also consider the 1st of the current month (may still be future if day = 1)
  if (day <= 1) {
    candidates.unshift(new Date(year, month, 1, runHour, 0, 0));
  }

  // only return a date that is strictly in the future
  const futureRuns = candidates.filter(d => d > now);
  return futureRuns.length > 0 ? futureRuns[0] : candidates[candidates.length - 1];
}

module.exports = { startScheduler, executeAutonomousRun, getSchedulerStatus };
