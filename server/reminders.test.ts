import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module following the same pattern as existing tests
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

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      email: `user${userId}@example.com`,
      name: "Test User",
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

// ─── reminders.list ──────────────────────────────────────────────────────────

describe("reminders.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array for a new user with no reminders", async () => {
    const db = await import("./db");
    vi.mocked(db.getReminders).mockResolvedValueOnce([]);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reminders.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("returns reminders for the authenticated user", async () => {
    const db = await import("./db");
    const now = new Date();
    vi.mocked(db.getReminders).mockResolvedValueOnce([
      {
        id: 1,
        userId: 1,
        title: "Team meeting",
        reminderAt: now,
        date: "2026-05-10",
        timeSlot: "09:00",
        notifyBrowser: true,
        notifySlack: false,
        sent: false,
        createdAt: now,
      },
      {
        id: 2,
        userId: 1,
        title: "Client call",
        reminderAt: now,
        date: "2026-05-11",
        timeSlot: "14:00",
        notifyBrowser: true,
        notifySlack: false,
        sent: false,
        createdAt: now,
      },
    ]);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reminders.list();
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Team meeting");
    expect(result[1].title).toBe("Client call");
  });

  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.reminders.list()).rejects.toThrow();
  });
});

// ─── reminders.create ────────────────────────────────────────────────────────

describe("reminders.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a reminder with all required fields", async () => {
    const db = await import("./db");
    vi.mocked(db.createReminder).mockResolvedValueOnce(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reminders.create({
      title: "Submit quarterly report",
      date: "2026-05-10",
      time: "09:00",
      notifyBrowser: true,
      notifySlack: false,
    });
    expect(result).toEqual({ success: true });
    expect(db.createReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        title: "Submit quarterly report",
        date: "2026-05-10",
        notifyBrowser: true,
        notifySlack: false,
      })
    );
  });

  it("creates a reminder with optional timeSlot", async () => {
    const db = await import("./db");
    vi.mocked(db.createReminder).mockResolvedValueOnce(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reminders.create({
      title: "Morning standup",
      date: "2026-05-12",
      time: "10:00",
      notifyBrowser: true,
      notifySlack: true,
      timeSlot: "10:00",
    });
    expect(result).toEqual({ success: true });
    expect(db.createReminder).toHaveBeenCalledWith(
      expect.objectContaining({ timeSlot: "10:00" })
    );
  });

  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.reminders.create({
        title: "Unauthorized reminder",
        date: "2026-05-10",
        time: "09:00",
        notifyBrowser: true,
        notifySlack: false,
      })
    ).rejects.toThrow();
  });

  it("rejects empty title (min length 1)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.reminders.create({
        title: "",
        date: "2026-05-10",
        time: "09:00",
        notifyBrowser: true,
        notifySlack: false,
      })
    ).rejects.toThrow();
  });

  it("rejects title exceeding max length (512 chars)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.reminders.create({
        title: "x".repeat(513),
        date: "2026-05-10",
        time: "09:00",
        notifyBrowser: true,
        notifySlack: false,
      })
    ).rejects.toThrow();
  });
});

// ─── reminders.delete ────────────────────────────────────────────────────────

describe("reminders.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a reminder by id", async () => {
    const db = await import("./db");
    vi.mocked(db.deleteReminder).mockResolvedValueOnce(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reminders.delete({ id: 1 });
    expect(result).toEqual({ success: true });
    expect(db.deleteReminder).toHaveBeenCalledWith(1, 1);
  });

  it("passes the correct userId when deleting (cannot delete another user's reminder)", async () => {
    const db = await import("./db");
    vi.mocked(db.deleteReminder).mockResolvedValueOnce(undefined);

    // User 2 tries to delete reminder 1 (which belongs to user 1)
    const ctx = createAuthContext(2);
    const caller = appRouter.createCaller(ctx);
    await caller.reminders.delete({ id: 1 });
    // The delete call should use userId=2, not userId=1
    expect(db.deleteReminder).toHaveBeenCalledWith(2, 1);
  });

  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.reminders.delete({ id: 1 })).rejects.toThrow();
  });
});

// ─── reminders.markSent ──────────────────────────────────────────────────────

describe("reminders.markSent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks a reminder as sent when it belongs to the user", async () => {
    const db = await import("./db");
    const now = new Date();
    vi.mocked(db.getReminders).mockResolvedValueOnce([
      {
        id: 5,
        userId: 1,
        title: "Reminder to mark",
        reminderAt: now,
        date: "2026-05-10",
        timeSlot: "09:00",
        notifyBrowser: true,
        notifySlack: false,
        sent: false,
        createdAt: now,
      },
    ]);
    vi.mocked(db.markReminderSent).mockResolvedValueOnce(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reminders.markSent({ id: 5 });
    expect(result).toEqual({ success: true });
    expect(db.markReminderSent).toHaveBeenCalledWith(5);
  });

  it("does not call markReminderSent when reminder does not belong to user", async () => {
    const db = await import("./db");
    // User has no reminders with id=999
    vi.mocked(db.getReminders).mockResolvedValueOnce([
      {
        id: 1,
        userId: 1,
        title: "Other reminder",
        reminderAt: new Date(),
        date: "2026-05-10",
        timeSlot: "09:00",
        notifyBrowser: true,
        notifySlack: false,
        sent: false,
        createdAt: new Date(),
      },
    ]);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reminders.markSent({ id: 999 });
    expect(result).toEqual({ success: true });
    // markReminderSent should NOT have been called since id=999 isn't in user's list
    expect(db.markReminderSent).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.reminders.markSent({ id: 1 })).rejects.toThrow();
  });
});
