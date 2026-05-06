import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { createServer } from "http";
import net from "net";
import cron from "node-cron";
import { sql } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./auth";
import { uploadRouter } from "../uploadRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
// vite.ts is only loaded dynamically in development so esbuild never
// bundles vite / vite-plugins into the production output

import { getDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

async function startServer() {
  // ─── Required env var validation ─────────────────────────────────────────────
  const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    console.error(`❌ Missing required env vars: ${missingVars.join(", ")}`);
    process.exit(1);
  }

  // JWT secret strength check
  const jwtSecret = process.env.JWT_SECRET ?? "";
  if (jwtSecret.length < 32) {
    console.warn("WARNING: JWT_SECRET is too short or not set. Use a random string of at least 32 characters in production.");
  }

  const app = express();
  const server = createServer(app);

  // Hide Express fingerprint
  app.disable("x-powered-by");

  // HTTP security headers (helmet) — before CORS
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now — Vite dev mode needs it off
    crossOriginEmbedderPolicy: false,
  }));

  // CORS — allow requests from the configured frontend origin
  app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
  // Bypass localtunnel interstitial page
  app.use((_req, res, next) => {
    res.setHeader("bypass-tunnel-reminder", "true");
    next();
  });

  // Additional security headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // Strict size limit for regular API requests (before 50mb parsers below)
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/upload")) return next();
    express.json({ limit: "1mb" })(req, res, next);
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Strip NoSQL injection operators from request body/params/query
  app.use(mongoSanitize());

  // Rate limiters
  app.use("/api/trpc", apiLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  // ─── Health check endpoint ────────────────────────────────────────────────────
  app.get("/health", async (_req, res) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("DB pool not initialized");
      await db.execute(sql`SELECT 1`);
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      });
    } catch (error) {
      res.status(503).json({
        status: "error",
        message: "Database unavailable",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Email/password auth routes
  registerAuthRoutes(app);
  // File upload routes (images + PDFs)
  app.use("/api/upload", uploadRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  // vite.ts is imported dynamically so devDependencies are never bundled
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./vite");
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

// ─── Slack Reminder Cron (every 5 minutes) ────────────────────────────────────
cron.schedule("*/5 * * * *", async () => {
  try {
    const { getUnsentReminders, markReminderSent, getUserIntegrations } = await import("../db");
    const { default: axios } = await import("axios");
    const unsent = await getUnsentReminders();
    for (const reminder of unsent) {
      if (!reminder.notifySlack) continue;
      try {
        const integration = await getUserIntegrations(reminder.userId);
        if (!integration?.slackWebhookUrl) continue;
        await axios.post(integration.slackWebhookUrl, {
          text: `⏰ *BDB Reminder* — ${reminder.title}\n_Scheduled for ${reminder.date} at ${reminder.timeSlot ?? ""}_ `,
        });
        await markReminderSent(reminder.id);
      } catch (err) {
        console.error(`[Slack Cron] Failed to send reminder ${reminder.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[Slack Cron] Error checking reminders:", err);
  }
});
