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

import { getDb, ensureSchema, getUserPlannerContext } from "../db";
import { startScheduler } from "../scheduler";
import { authService } from "./sdk";
import { streamAnthropicLLM } from "./llm";
import { buildZionSystemPrompt } from "../zionPrompt";
import { extractMemories } from "../routers";
import {
  requestIdMiddleware,
  cspMiddleware,
  securityHeadersMiddleware,
  noCacheApiMiddleware,
  httpsEnforcement,
  contentTypeMiddleware,
} from "./security";
import webpush from "web-push";
import { LOCAL_UPLOADS_DIR } from "../storage";

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

async function runMigrations() {
  try {
    console.log("🔄 Running database migrations...");
    const { execSync } = await import("child_process");
    execSync("npx drizzle-kit migrate", { stdio: "inherit" });
    console.log("✅ Migrations complete");
  } catch (err) {
    console.warn("⚠️  Migration warning (may be safe to ignore):", err);
  }
}

async function startServer() {
  // ─── Required env var validation ─────────────────────────────────────────────
  const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);

  // Warn about optional but important vars
  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️  OPENAI_API_KEY is not set — Zion AI will not work");
  } else {
    console.log("✅ OPENAI_API_KEY is set — Zion AI ready");
  }
  if (missingVars.length > 0) {
    console.error(`❌ Missing required env vars: ${missingVars.join(", ")}`);
    process.exit(1);
  }

  // JWT secret strength check
  const jwtSecret = process.env.JWT_SECRET ?? "";
  if (jwtSecret.length < 32) {
    console.warn("WARNING: JWT_SECRET is too short or not set. Use a random string of at least 32 characters in production.");
  }

  // Run migrations on startup (production only)
  if (process.env.NODE_ENV === "production") {
    await runMigrations();
  }

  // Ensure schema columns exist (safe, idempotent — runs in all environments)
  await ensureSchema();

  // ── Web Push (VAPID) setup ─────────────────────────────────────────────────
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL || "admin@bedobecome.app"}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log("✅ Web Push (VAPID) configured");
  } else {
    console.warn("⚠️  VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push notifications disabled");
  }

  const app = express();
  const server = createServer(app);

  // Trust Railway / Render / Heroku reverse proxy so rate-limiters and
  // IP detection work correctly behind the load balancer
  app.set("trust proxy", 1);

  // Hide Express fingerprint
  app.disable("x-powered-by");

  // ── Security middleware stack (order matters) ─────────────────────────────
  app.use(requestIdMiddleware);        // Attach unique request ID for audit trail correlation
  app.use(httpsEnforcement);           // Redirect HTTP → HTTPS in production
  app.use(noCacheApiMiddleware);       // Prevent caching of sensitive API responses

  // Helmet HTTP security headers
  app.use(helmet({
    contentSecurityPolicy: false,       // We apply CSP ourselves below (more control)
    crossOriginEmbedderPolicy: false,   // Allow OAuth popups
    hsts: {
      maxAge: 31536000,                 // 1 year HSTS (SOC 2 CC6.7)
      includeSubDomains: true,
      preload: true,
    },
  }));

  app.use(cspMiddleware);              // Content Security Policy (OWASP A05)
  app.use(securityHeadersMiddleware);  // Permissions-Policy, CORP, COOP
  app.use(contentTypeMiddleware);      // Reject unexpected Content-Types

  // CORS — allow requests from the configured frontend origin
  app.use(cors({
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === "production" ? false : true),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }));
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

  // Raw body for Stripe webhook signature verification (must be before JSON parsers)
  app.use((req, _res, next) => {
    if (req.path === "/api/stripe/webhook") {
      let data = "";
      req.setEncoding("utf8");
      req.on("data", chunk => { data += chunk; });
      req.on("end", () => { (req as any).body = data; next(); });
    } else {
      next();
    }
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

  // ─── Storage test endpoint (admin-only debug) ────────────────────────────────
  app.get("/api/storage-test", async (_req, res) => {
    const cfg = {
      S3_BUCKET: process.env.S3_BUCKET || "(not set)",
      S3_REGION: process.env.S3_REGION || "(not set)",
      S3_ENDPOINT: process.env.S3_ENDPOINT || "(not set)",
      S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ? `${process.env.S3_ACCESS_KEY_ID.slice(0, 6)}…` : "(not set)",
      S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ? "set (hidden)" : "(not set)",
      S3_PUBLIC_URL: process.env.S3_PUBLIC_URL || "(not set)",
    };
    try {
      const { storagePut } = await import("../storage");
      const { url } = await storagePut("_test/ping.txt", "ok", "text/plain");
      res.json({ status: "ok", url, config: cfg });
    } catch (err: any) {
      res.status(500).json({ status: "error", error: err.message, config: cfg });
    }
  });

  // Serve local uploads (fallback when S3 is not configured)
  app.use("/uploads", express.static(LOCAL_UPLOADS_DIR));

  // ─── Universal Links / App Links — required for Sign in with Apple deep links ─
  // Served now so the association files are already indexed by the time the
  // native app ships; harmless no-op until APPLE_TEAM_ID/APPLE_BUNDLE_ID are set.
  app.get("/.well-known/apple-app-site-association", (_req, res) => {
    const teamId = process.env.APPLE_TEAM_ID || "TEAMID";
    const bundleId = process.env.APPLE_BUNDLE_ID || "com.bedobecome.planner";
    res.setHeader("Content-Type", "application/json");
    res.json({
      applinks: {
        apps: [],
        details: [{ appID: `${teamId}.${bundleId}`, paths: ["/reset-password*", "/invite/*"] }],
      },
    });
  });
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    const sha256Fingerprints = process.env.ANDROID_SHA256_FINGERPRINTS
      ? process.env.ANDROID_SHA256_FINGERPRINTS.split(",")
      : [];
    res.setHeader("Content-Type", "application/json");
    res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: process.env.ANDROID_PACKAGE_NAME || "com.bedobecome.planner",
          sha256_cert_fingerprints: sha256Fingerprints,
        },
      },
    ]);
  });

  // Email/password auth routes
  registerAuthRoutes(app);

  // ── Stripe webhook (raw body required — must be before express.json middleware) ──
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const { getStripe } = await import("./stripe");
    const stripe = getStripe();
    if (!stripe || !webhookSecret) { res.json({ received: true }); return; }

    let event: import("stripe").Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("[Stripe] Webhook signature failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    const { upsertUser, getUserByEmail } = await import("../db");

    const getCustomerEmail = async (customerId: string) => {
      const customer = await stripe.customers.retrieve(customerId) as import("stripe").Stripe.Customer;
      return customer.email ?? null;
    };

    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const sub = event.data.object as import("stripe").Stripe.Subscription;
          const email = await getCustomerEmail(sub.customer as string);
          if (!email) break;
          const user = await getUserByEmail(email);
          if (!user) break;
          const priceId = sub.items.data[0]?.price.id;
          const { PLANS } = await import("./stripe");
          const plan = Object.values(PLANS).find(p => p.priceId === priceId)?.id ?? "pro";
          await upsertUser({
            openId: user.openId,
            stripeSubscriptionId: sub.id,
            subscriptionPlan: plan,
            subscriptionStatus: sub.status,
            subscriptionPeriodEnd: new Date((sub as any).current_period_end * 1000),
          } as any);
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as import("stripe").Stripe.Subscription;
          const email = await getCustomerEmail(sub.customer as string);
          if (!email) break;
          const user = await getUserByEmail(email);
          if (!user) break;
          await upsertUser({
            openId: user.openId,
            subscriptionPlan: "free",
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
          } as any);
          break;
        }
        case "invoice.payment_failed": {
          const inv = event.data.object as import("stripe").Stripe.Invoice;
          const email = await getCustomerEmail(inv.customer as string);
          if (!email) break;
          const user = await getUserByEmail(email);
          if (!user) break;
          await upsertUser({ openId: user.openId, subscriptionStatus: "past_due" } as any);
          break;
        }
      }
    } catch (err) {
      console.error("[Stripe] Webhook handler error:", err);
    }

    res.json({ received: true });
  });

  // ── Zion streaming chat (SSE) ─────────────────────────────────────────────────
  // Tokens stream to the client as they arrive from Anthropic, giving instant
  // feedback instead of a 3-8 second blank wait. Auth uses the same cookie as
  // tRPC; memory never touches the server DB (client sends context, receives updates).
  app.post("/api/zion/stream", async (req, res) => {
    let user: Awaited<ReturnType<typeof authService.authenticateRequest>>;
    try {
      user = await authService.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { message, history = [], memoryContext = "" } = req.body ?? {};
    if (typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const context = await getUserPlannerContext(user.id);
      const systemPrompt = buildZionSystemPrompt(context, memoryContext ?? "");

      const msgs: Array<{ role: "user" | "assistant"; content: string }> = [
        ...(Array.isArray(history) ? history : []).map((m: any) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: String(m.content ?? ""),
        })),
        { role: "user", content: message.trim() },
      ];

      let accumulated = "";

      for await (const chunk of streamAnthropicLLM({ system: systemPrompt, messages: msgs })) {
        accumulated += chunk;
        send({ token: chunk });
      }

      // Parse PLANNER_ACTIONS from full accumulated content
      let plannerActions: Array<Record<string, unknown>> = [];
      let displayContent = accumulated;
      const actionsMatch = accumulated.match(/<PLANNER_ACTIONS>([\s\S]*?)<\/PLANNER_ACTIONS>/);
      if (actionsMatch) {
        try {
          const parsed = JSON.parse(actionsMatch[1].trim());
          plannerActions = parsed.actions ?? [];
        } catch { /* ignore malformed JSON */ }
        displayContent = accumulated.replace(/<PLANNER_ACTIONS>[\s\S]*?<\/PLANNER_ACTIONS>/, "").trim();
      }

      const memoryUpdates = await extractMemories(message, displayContent);
      send({ done: true, displayContent, plannerActions, memoryUpdates });
    } catch (err: any) {
      console.error("[Zion stream]", err?.message ?? err);
      send({ error: "Zion is unavailable right now. Please try again." });
    } finally {
      res.end();
    }
  });

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
    const { serveStatic } = await import("./static");
    serveStatic(app);
  }

  // ─── Global error handler — never leak stack traces / internals in production ─
  // OWASP A05, ISO 27001 A.14.2.1. Must be registered last, after all routes.
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestId = (req as any).__requestId;
    console.error(`[Error] ${requestId ?? ""}`, err);
    if (res.headersSent) return;
    const isProd = process.env.NODE_ENV === "production";
    res.status(err?.status || err?.statusCode || 500).json({
      error: isProd ? "Something went wrong. Please try again." : String(err?.message || err),
      requestId,
    });
  });

  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
    // Start Zion's autonomous scheduler after server is listening
    startScheduler();
  });
}

startServer().catch(console.error);

// ─── Helper: send push to a single subscription ───────────────────────────────
async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: object
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: any) {
    // 410 Gone = subscription expired/revoked — clean it up
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      try {
        const pool = (await import("../db")).getPool?.() as any;
        if (pool) {
          const conn = await pool.getConnection();
          await conn.query(`DELETE FROM \`push_subscriptions\` WHERE endpoint = ?`, [sub.endpoint]);
          conn.release();
        }
      } catch { /* ignore cleanup error */ }
    }
    return false;
  }
}

// ─── Reminder Cron (every 15 minutes) ────────────────────────────────────────
cron.schedule("*/15 * * * *", async () => {
  try {
    const { getUnsentReminders, markReminderSent, getUserIntegrations, getUserPushSubscriptions } = await import("../db");
    const { default: axios } = await import("axios");

    const unsent = await getUnsentReminders();

    for (const reminder of unsent) {
      // ── Slack notification ──────────────────────────────────────────────────
      if (reminder.notifySlack) {
        try {
          const integration = await getUserIntegrations(reminder.userId);
          if (integration?.slackWebhookUrl) {
            await axios.post(integration.slackWebhookUrl, {
              text: `⏰ *BDB Reminder* — ${reminder.title}\n_Scheduled for ${reminder.date} at ${reminder.timeSlot ?? ""}_`,
            });
          }
        } catch (err) {
          console.error(`[Slack Cron] Failed to send reminder ${reminder.id}:`, err);
        }
      }

      // ── Web Push notification ───────────────────────────────────────────────
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        try {
          const subs = await getUserPushSubscriptions(reminder.userId);
          const payload = {
            title: `⏰ ${reminder.title}`,
            body: reminder.timeSlot
              ? `Scheduled for ${reminder.date} at ${reminder.timeSlot}`
              : `Scheduled for ${reminder.date}`,
            tag: `reminder-${reminder.id}`,
            url: "/",
            requireInteraction: true,
          };
          await Promise.all(subs.map((sub) => sendPush(sub, payload)));
        } catch (err) {
          console.error(`[Push Cron] Failed to send push for reminder ${reminder.id}:`, err);
        }
      }

      await markReminderSent(reminder.id);
    }
  } catch (err) {
    console.error("[Reminder Cron] Error:", err);
  }
});
