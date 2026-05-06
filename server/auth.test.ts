import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import { registerAuthRoutes } from "./_core/auth";

// Mock the database module
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn().mockResolvedValue(undefined),
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
  getDb: vi.fn().mockResolvedValue(null),
}));

// Mock the SDK auth service
vi.mock("./_core/sdk", () => ({
  authService: {
    createSessionToken: vi.fn().mockResolvedValue("mock-session-token"),
    authenticateRequest: vi.fn().mockRejectedValue(new Error("No session")),
    verifySession: vi.fn().mockResolvedValue(null),
  },
}));

// Helper: make a simple supertest-like request using node's built-in http
async function makeRequest(
  app: express.Express,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: number; body: Record<string, unknown>; headers: Record<string, string> }> {
  const http = await import("http");
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const port = address.port;

  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: "127.0.0.1",
      port,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        server.close();
        try {
          resolve({
            status: res.statusCode ?? 0,
            body: JSON.parse(data),
            headers: res.headers as Record<string, string>,
          });
        } catch {
          resolve({ status: res.statusCode ?? 0, body: {}, headers: res.headers as Record<string, string> });
        }
      });
    });
    req.on("error", (err) => { server.close(); reject(err); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function buildApp() {
  const app = express();
  app.use(express.json());
  registerAuthRoutes(app);
  return app;
}

// ─── /api/auth/register ───────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 400 when email is missing", async () => {
    const app = buildApp();
    const res = await makeRequest(app, "POST", "/api/auth/register", {
      password: "securepass",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when password is missing", async () => {
    const app = buildApp();
    const res = await makeRequest(app, "POST", "/api/auth/register", {
      email: "test@example.com",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when password is too short (< 8 chars)", async () => {
    const app = buildApp();
    const res = await makeRequest(app, "POST", "/api/auth/register", {
      email: "test@example.com",
      password: "short",
    });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/8 characters/i);
  });

  it("returns 409 when email already exists", async () => {
    const db = await import("./db");
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce({
      id: 1,
      openId: "existing-user",
      email: "existing@example.com",
      name: "Existing",
      passwordHash: "hash",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const app = buildApp();
    const res = await makeRequest(app, "POST", "/api/auth/register", {
      email: "existing@example.com",
      password: "securepass123",
    });
    expect(res.status).toBe(409);
    expect(String(res.body.error)).toMatch(/already exists/i);
  });

  it("returns 200 and success on valid registration", async () => {
    const db = await import("./db");
    // First call: check existing (null = not exists)
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce(undefined);
    // After upsertUser, getUserByEmail returns the new user
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce({
      id: 42,
      openId: "new-open-id",
      email: "newuser@example.com",
      name: "New User",
      passwordHash: "hash",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const app = buildApp();
    const res = await makeRequest(app, "POST", "/api/auth/register", {
      email: "newuser@example.com",
      password: "securepass123",
      name: "New User",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("user");
  });
});

// ─── /api/auth/login ──────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns 400 when email is missing", async () => {
    const app = buildApp();
    const res = await makeRequest(app, "POST", "/api/auth/login", {
      password: "mypassword",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when password is missing", async () => {
    const app = buildApp();
    const res = await makeRequest(app, "POST", "/api/auth/login", {
      email: "user@example.com",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 401 when email is not found", async () => {
    const db = await import("./db");
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce(undefined);

    const app = buildApp();
    const res = await makeRequest(app, "POST", "/api/auth/login", {
      email: "unknown@example.com",
      password: "anypassword",
    });
    expect(res.status).toBe(401);
    expect(String(res.body.error)).toMatch(/invalid/i);
  });

  it("returns 401 when password is wrong", async () => {
    const db = await import("./db");
    // Return a user with a bcrypt hash that won't match "wrongpassword"
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce({
      id: 1,
      openId: "user-open-id",
      email: "user@example.com",
      name: "User",
      // bcrypt hash of "correctpassword"
      passwordHash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewsGEPXO1rF1Uf5y",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const app = buildApp();
    const res = await makeRequest(app, "POST", "/api/auth/login", {
      email: "user@example.com",
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 and success on valid login", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("correctpassword", 10);

    const db = await import("./db");
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce({
      id: 1,
      openId: "user-open-id",
      email: "user@example.com",
      name: "User",
      passwordHash: hash,
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const app = buildApp();
    const res = await makeRequest(app, "POST", "/api/auth/login", {
      email: "user@example.com",
      password: "correctpassword",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("user");
  });
});

// ─── /api/auth/dev-login ──────────────────────────────────────────────────────

describe("POST /api/auth/dev-login", () => {
  it("returns 403 when NODE_ENV is production", async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const app = buildApp();
    const res = await makeRequest(app, "POST", "/api/auth/dev-login", {});
    expect(res.status).toBe(403);
    expect(String(res.body.error)).toMatch(/not available in production/i);

    process.env.NODE_ENV = original;
  });

  it("returns 200 in development mode", async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const db = await import("./db");
    // Simulate user not existing yet, then existing after upsert
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce(undefined);
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce({
      id: 99,
      openId: "dev-user-local",
      email: "dev@bdbplanner.local",
      name: "Leah Marville",
      passwordHash: "devhash",
      loginMethod: "email",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const app = buildApp();
    const res = await makeRequest(app, "POST", "/api/auth/dev-login", {});
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);

    process.env.NODE_ENV = original;
  });
});
