require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ============ MIDDLEWARE ============
// Pin CORS to explicitly allowed origins (comma-separated env var)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:8081")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============ ENVIRONMENT VALIDATION ============
const requiredEnvVars = [
  "PORT",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "BREVO_API_KEY",
  "SENDER_EMAIL",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(
    "❌ Missing environment variables:",
    missingVars.join(", ")
  );
  process.exit(1);
}

// Fail closed: without a shared secret, /api/email/* would be an open mail relay
if (!process.env.EMAIL_API_KEY) {
  console.error(
    "❌ EMAIL_API_KEY is not set. Refusing to start — /api/email/* routes require a shared secret (x-api-key header). Set EMAIL_API_KEY in server/.env."
  );
  process.exit(1);
}

// ============ ROUTES ============
app.get("/", (req, res) => {
  res.json({
    status: "✓ Email Server Running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/email", require("./middleware/requireApiKey"), require("./routes/emailRoutes"));

// ============ 404 & ERROR HANDLERS ============
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
});

app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    timestamp: new Date().toISOString(),
  });
});

// ============ CRON JOBS ============
let cronJobsInitialized = false;

async function initializeCronJobs() {
  try {
    console.log("⏰ Initializing cron jobs...");
    
    // Import cron job (lazy load to avoid issues)
    require("./cron/absentReminder");
    
    cronJobsInitialized = true;
    console.log("✓ Cron jobs initialized successfully");
  } catch (err) {
    console.error("❌ Failed to initialize cron jobs:", err);
    // Don't exit - server can still run without cron
  }
}

// ============ SERVER STARTUP ============
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, async () => {
  console.log("\n========================================");
  console.log(`✓ Email Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`✓ CORS allowed origins: ${allowedOrigins.join(", ")}`);
  console.log(`✓ API key auth enabled on /api/email/*`);
  console.log("========================================\n");

  // Initialize cron jobs after server starts
  await initializeCronJobs();
});

// ============ GRACEFUL SHUTDOWN ============
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    console.log("✓ Server closed");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("❌ Forced shutdown after 10 seconds");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ============ UNHANDLED ERRORS ============
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});