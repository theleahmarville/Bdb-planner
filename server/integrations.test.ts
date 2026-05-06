import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module following the same pattern as notes.test.ts
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
  getDailyDigestData: vi.fn().mockResolvedValue({ topPriorities: [], timeSlots: {}, habits: {}, bigGoals: [], waterGlasses: 0 }),
  getWeeklyDigestData: vi.fn().mockResolvedValue({ dailyTimeSlots: [], dailyPriorities: [], habitTracker: {}, bigGoals: [] }),
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

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-integrations-user",
      email: "integrations@example.com",
      name: "Integrations User",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── integrations.get ─────────────────────────────────────────────────────────

describe("integrations.get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when user has no integrations", async () => {
    const db = await import("./db");
    vi.mocked(db.getUserIntegrations).mockResolvedValueOnce(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.get();
    expect(result).toBeNull();
  });

  it("returns integration data when it exists", async () => {
    const db = await import("./db");
    vi.mocked(db.getUserIntegrations).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      slackWebhookUrl: "https://hooks.slack.com/test",
      slackChannelName: "#general",
      googleAccessToken: null,
      googleRefreshToken: null,
      googleCalendarId: null,
      googleTokenExpiry: null,
      notionToken: null,
      notionDatabaseId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.get();
    expect(result).not.toBeNull();
    expect(result?.slackWebhookUrl).toBe("https://hooks.slack.com/test");
  });

  it("requires authentication — throws UNAUTHORIZED when unauthenticated", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.integrations.get()).rejects.toThrow();
  });
});

// ─── integrations.save ───────────────────────────────────────────────────────

describe("integrations.save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves slackWebhookUrl successfully", async () => {
    const db = await import("./db");
    vi.mocked(db.upsertUserIntegrations).mockResolvedValueOnce(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.save({
      slackWebhookUrl: "https://hooks.slack.com/services/T000/B000/token",
    });
    expect(result).toEqual({ success: true });
    expect(db.upsertUserIntegrations).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ slackWebhookUrl: "https://hooks.slack.com/services/T000/B000/token" })
    );
  });

  it("saves slackChannelName successfully", async () => {
    const db = await import("./db");
    vi.mocked(db.upsertUserIntegrations).mockResolvedValueOnce(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.save({
      slackChannelName: "#bdb-reminders",
    });
    expect(result).toEqual({ success: true });
    expect(db.upsertUserIntegrations).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ slackChannelName: "#bdb-reminders" })
    );
  });

  it("saves multiple integration fields at once", async () => {
    const db = await import("./db");
    vi.mocked(db.upsertUserIntegrations).mockResolvedValueOnce(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.save({
      slackWebhookUrl: "https://hooks.slack.com/test",
      slackChannelName: "#alerts",
      googleCalendarId: "primary",
    });
    expect(result).toEqual({ success: true });
  });

  it("requires authentication — throws when unauthenticated", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.integrations.save({ slackWebhookUrl: "https://hooks.slack.com/test" })
    ).rejects.toThrow();
  });
});

// ─── integrations.clear ──────────────────────────────────────────────────────

describe("integrations.clear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears slack settings successfully", async () => {
    const db = await import("./db");
    vi.mocked(db.upsertUserIntegrations).mockResolvedValueOnce(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.clear({ field: "slack" });
    expect(result).toEqual({ success: true });
    expect(db.upsertUserIntegrations).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ slackWebhookUrl: null, slackChannelName: null })
    );
  });

  it("clears google settings successfully", async () => {
    const db = await import("./db");
    vi.mocked(db.upsertUserIntegrations).mockResolvedValueOnce(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.clear({ field: "google" });
    expect(result).toEqual({ success: true });
    expect(db.upsertUserIntegrations).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        googleAccessToken: null,
        googleRefreshToken: null,
        googleCalendarId: null,
      })
    );
  });

  it("rejects invalid field values", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error — testing invalid input
    await expect(caller.integrations.clear({ field: "invalid" })).rejects.toThrow();
  });
});

// ─── googleCalendar.status ───────────────────────────────────────────────────

describe("googleCalendar.status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns connected: false when no google tokens exist", async () => {
    const db = await import("./db");
    vi.mocked(db.getUserIntegrations).mockResolvedValueOnce(null);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.googleCalendar.status();
    expect(result).toEqual({ connected: false });
  });

  it("returns connected: false when integration has no access token", async () => {
    const db = await import("./db");
    vi.mocked(db.getUserIntegrations).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      googleAccessToken: null,
      googleRefreshToken: null,
      googleCalendarId: null,
      googleTokenExpiry: null,
      slackWebhookUrl: null,
      slackChannelName: null,
      notionToken: null,
      notionDatabaseId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.googleCalendar.status();
    expect(result).toEqual({ connected: false });
  });

  it("returns connected: true when google access token is present", async () => {
    const db = await import("./db");
    vi.mocked(db.getUserIntegrations).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      googleAccessToken: "ya29.valid-token",
      googleRefreshToken: "1//refresh-token",
      googleCalendarId: "primary",
      googleTokenExpiry: new Date(Date.now() + 3600_000),
      slackWebhookUrl: null,
      slackChannelName: null,
      notionToken: null,
      notionDatabaseId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.googleCalendar.status();
    expect(result).toEqual({ connected: true });
  });

  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.googleCalendar.status()).rejects.toThrow();
  });
});

// ─── googleCalendar.disconnect ───────────────────────────────────────────────

describe("googleCalendar.disconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears google tokens on disconnect", async () => {
    const db = await import("./db");
    vi.mocked(db.upsertUserIntegrations).mockResolvedValueOnce(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.googleCalendar.disconnect();
    expect(result).toEqual({ success: true });
    expect(db.upsertUserIntegrations).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        googleAccessToken: null,
        googleRefreshToken: null,
        googleCalendarId: null,
        googleTokenExpiry: null,
      })
    );
  });

  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.googleCalendar.disconnect()).rejects.toThrow();
  });
});
