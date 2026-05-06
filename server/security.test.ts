import { describe, it, expect, vi, beforeAll } from "vitest";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

// Mock db to avoid DB connections
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getAnnualPlan: vi.fn().mockResolvedValue(null),
  upsertAnnualPlan: vi.fn().mockResolvedValue(undefined),
  getBigGoals: vi.fn().mockResolvedValue([]),
  upsertBigGoal: vi.fn().mockResolvedValue(undefined),
  getMonthlyPlan: vi.fn().mockResolvedValue(null),
  upsertMonthlyPlan: vi.fn().mockResolvedValue(undefined),
  getWeeklyPlan: vi.fn().mockResolvedValue(null),
  upsertWeeklyPlan: vi.fn().mockResolvedValue(undefined),
  getDailyEntry: vi.fn().mockResolvedValue(null),
  upsertDailyEntry: vi.fn().mockResolvedValue(undefined),
  getContentCalendar: vi.fn().mockResolvedValue(null),
  upsertContentCalendar: vi.fn().mockResolvedValue(undefined),
  getNotes: vi.fn().mockResolvedValue([]),
  getNoteById: vi.fn().mockResolvedValue(null),
  searchNotes: vi.fn().mockResolvedValue([]),
  createNote: vi.fn().mockResolvedValue(null),
  updateNote: vi.fn().mockResolvedValue(undefined),
  deleteNote: vi.fn().mockResolvedValue(undefined),
  getNoteFolders: vi.fn().mockResolvedValue([]),
  getUserIntegrations: vi.fn().mockResolvedValue(null),
  upsertUserIntegrations: vi.fn().mockResolvedValue(undefined),
  getDailyEntriesForYear: vi.fn().mockResolvedValue([]),
  setNoteLock: vi.fn().mockResolvedValue(undefined),
  removeNoteLock: vi.fn().mockResolvedValue(undefined),
  getNotePasswordHash: vi.fn().mockResolvedValue(null),
  getVisionBoardImages: vi.fn().mockResolvedValue([]),
  addVisionBoardImage: vi.fn().mockResolvedValue(undefined),
  updateVisionBoardImageCaption: vi.fn().mockResolvedValue(undefined),
  deleteVisionBoardImage: vi.fn().mockResolvedValue(undefined),
  getDailyDigestData: vi.fn().mockResolvedValue({}),
  getWeeklyDigestData: vi.fn().mockResolvedValue({}),
  getSectionAttachments: vi.fn().mockResolvedValue([]),
  addSectionAttachment: vi.fn().mockResolvedValue(undefined),
  deleteSectionAttachment: vi.fn().mockResolvedValue(undefined),
  getSocialAccounts: vi.fn().mockResolvedValue([]),
  upsertSocialAccount: vi.fn().mockResolvedValue(undefined),
  deleteSocialAccount: vi.fn().mockResolvedValue(undefined),
  getNoteAttachments: vi.fn().mockResolvedValue([]),
  addNoteAttachment: vi.fn().mockResolvedValue(undefined),
  deleteNoteAttachment: vi.fn().mockResolvedValue(undefined),
  getZionHistory: vi.fn().mockResolvedValue([]),
  saveZionMessage: vi.fn().mockResolvedValue(undefined),
  clearZionHistory: vi.fn().mockResolvedValue(undefined),
  getUserPlannerContext: vi.fn().mockResolvedValue({ bigGoals: [], monthlyPlan: null, weeklyPlan: null }),
  getReminders: vi.fn().mockResolvedValue([]),
  createReminder: vi.fn().mockResolvedValue(undefined),
  deleteReminder: vi.fn().mockResolvedValue(undefined),
  markReminderSent: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([]),
  }),
}));

// Helper: make a raw HTTP request to an Express app
async function makeRequest(
  app: express.Express,
  options: {
    method?: "GET" | "POST";
    path: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  }
): Promise<{ status: number; body: string; headers: Record<string, string | string[] | undefined> }> {
  const http = await import("http");
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const port = address.port;
  const method = options.method ?? "GET";

  return new Promise((resolve, reject) => {
    const bodyStr = options.body ? JSON.stringify(options.body) : undefined;
    const requestOptions = {
      hostname: "127.0.0.1",
      port,
      path: options.path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = http.request(requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        server.close();
        resolve({
          status: res.statusCode ?? 0,
          body: data,
          headers: res.headers,
        });
      });
    });
    req.on("error", (err) => { server.close(); reject(err); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Build a minimal app matching the production security config
function buildSecureApp() {
  const app = express();

  // Hide Express fingerprint
  app.disable("x-powered-by");

  // Helmet security headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS with credentials
  app.use(cors({ origin: true, credentials: true }));

  // Additional security headers
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // Strict 1mb size limit for non-upload routes
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/upload")) return next();
    express.json({ limit: "1mb" })(req, res, next);
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Mongo sanitize
  app.use(mongoSanitize());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    });
  });

  // A simple echo endpoint for sanitization tests
  app.post("/api/echo", (req, res) => {
    res.json({ received: req.body });
  });

  return app;
}

// ─── Helmet headers ───────────────────────────────────────────────────────────

describe("Security headers — Helmet", () => {
  it("sets X-Frame-Options: DENY", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, { path: "/health" });
    expect(res.headers["x-frame-options"]).toBe("DENY");
  });

  it("sets X-Content-Type-Options: nosniff", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, { path: "/health" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("does NOT expose X-Powered-By header", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, { path: "/health" });
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("sets Referrer-Policy", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, { path: "/health" });
    expect(res.headers["referrer-policy"]).toBeTruthy();
  });
});

// ─── CORS headers ─────────────────────────────────────────────────────────────

describe("CORS headers", () => {
  it("includes Access-Control-Allow-Credentials on responses", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, {
      path: "/health",
      headers: { Origin: "http://localhost:3000" },
    });
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("includes Access-Control-Allow-Origin on responses from known origin", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, {
      path: "/health",
      headers: { Origin: "http://localhost:3000" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeTruthy();
  });
});

// ─── /health endpoint ─────────────────────────────────────────────────────────

describe("/health endpoint", () => {
  it("returns HTTP 200", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, { path: "/health" });
    expect(res.status).toBe(200);
  });

  it("returns JSON with status: ok", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, { path: "/health" });
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body.status).toBe("ok");
  });

  it("returns JSON with timestamp field (ISO string)", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, { path: "/health" });
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(typeof body.timestamp).toBe("string");
    expect(() => new Date(body.timestamp as string)).not.toThrow();
  });

  it("returns JSON with uptime field (number)", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, { path: "/health" });
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(typeof body.uptime).toBe("number");
  });

  it("returns JSON with environment field", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, { path: "/health" });
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body).toHaveProperty("environment");
  });
});

// ─── Input sanitization (mongo sanitize) ─────────────────────────────────────

describe("Input sanitization", () => {
  it("strips $ operators from request body (NoSQL injection prevention)", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, {
      method: "POST",
      path: "/api/echo",
      body: {
        username: "admin",
        password: { $gt: "" }, // NoSQL injection attempt
      },
    });
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { received: Record<string, unknown> };
    // express-mongo-sanitize removes keys starting with $
    const password = body.received.password as Record<string, unknown> | undefined;
    // The $gt key should have been sanitized (removed or replaced)
    if (password && typeof password === "object") {
      expect(Object.keys(password)).not.toContain("$gt");
    }
  });

  it("passes through clean request bodies without modification", async () => {
    const app = buildSecureApp();
    const res = await makeRequest(app, {
      method: "POST",
      path: "/api/echo",
      body: { name: "John", email: "john@example.com" },
    });
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { received: Record<string, unknown> };
    expect(body.received.name).toBe("John");
    expect(body.received.email).toBe("john@example.com");
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe("Rate limiting", () => {
  it("returns 429 after exceeding auth request limit", async () => {
    // Build an app with a very tight auth rate limiter (max 3 requests for testing)
    const app = express();
    app.use(express.json());
    app.use(
      "/api/auth",
      rateLimit({
        windowMs: 60_000,
        max: 3,
        message: { error: "Too many login attempts, please try again later." },
        standardHeaders: true,
        legacyHeaders: false,
      })
    );
    app.post("/api/auth/login", (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const http = await import("http");
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };
    const port = address.port;

    let lastStatus = 0;

    // Make 4 requests — the 4th should be rate limited
    for (let i = 0; i < 4; i++) {
      await new Promise<void>((resolve) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port,
            path: "/api/auth/login",
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": 2 },
          },
          (res) => {
            lastStatus = res.statusCode ?? 0;
            res.resume();
            res.on("end", resolve);
          }
        );
        req.write("{}");
        req.end();
      });
    }

    server.close();
    expect(lastStatus).toBe(429);
  });
});

// ─── Request body size limit ─────────────────────────────────────────────────

describe("Request body size limit", () => {
  it("returns 413 for requests over 1mb to non-upload routes", async () => {
    const app = express();

    // Mirror production: strict 1mb limit for non-upload routes
    app.use((req, res, next) => {
      if (req.path.startsWith("/api/upload")) return next();
      express.json({ limit: "1mb" })(req, res, next);
    });

    app.post("/api/test-size", (_req, res) => {
      res.json({ ok: true });
    });

    const http = await import("http");
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };
    const port = address.port;

    // Generate a body > 1mb
    const largeBody = JSON.stringify({ data: "x".repeat(1_100_000) });

    const statusCode = await new Promise<number>((resolve) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/test-size",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(largeBody),
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode ?? 0));
        }
      );
      req.on("error", () => resolve(0));
      req.write(largeBody);
      req.end();
    });

    server.close();
    expect(statusCode).toBe(413);
  });
});

// ─── Unauthenticated tRPC access ─────────────────────────────────────────────

describe("tRPC auth protection", () => {
  it("unauthenticated context throws UNAUTHORIZED for protected procedures", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: null,
      req: { protocol: "https", headers: {} } as express.Request,
      res: { clearCookie: vi.fn() } as unknown as express.Response,
    };
    const caller = appRouter.createCaller(ctx);

    // Any protected procedure should throw UNAUTHORIZED
    await expect(caller.notes.list({})).rejects.toThrow();
  });

  it("authenticated context can access protected procedures", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: {
        id: 1,
        openId: "security-test-user",
        email: "security@example.com",
        name: "Security Test",
        loginMethod: "email",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as express.Request,
      res: { clearCookie: vi.fn() } as unknown as express.Response,
    };
    const caller = appRouter.createCaller(ctx);
    // Should NOT throw — just returns empty list
    const result = await caller.notes.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});
