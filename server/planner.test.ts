import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
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
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-123",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeTruthy();
    expect(result?.id).toBe(1);
    expect(result?.email).toBe("test@example.com");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("annual.get", () => {
  it("returns null for a new user with no annual plan", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.annual.get({ year: 2026 });
    expect(result).toBeNull();
  });
});

describe("annual.save", () => {
  it("saves annual plan data successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.annual.save({
      year: 2026,
      data: {
        professional: "Launch my business",
        finance: "Save $50k",
        missionStatement: "To inspire and create",
      },
    });
    expect(result).toEqual({ success: true });
  });

  it("saves personal contract data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.annual.save({
      year: 2026,
      data: {
        contractName: "Jane Doe",
        contractBe: "present and intentional",
        contractDo: "show up every day",
        contractBecome: "the best version of myself",
        contractGoals: ["Goal 1", "Goal 2", "Goal 3", "Goal 4", "Goal 5"],
      },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("bigGoals.list", () => {
  it("returns empty array for new user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.bigGoals.list({ year: 2026 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe("bigGoals.save", () => {
  it("saves a big goal with steps", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.bigGoals.save({
      year: 2026,
      position: 1,
      title: "Write a book",
      description: "Complete my first novel",
      steps: ["Outline", "Draft chapter 1", "Draft chapter 2", "Edit", "Publish"],
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects invalid position (out of range)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.bigGoals.save({ year: 2026, position: 7, title: "Invalid" })
    ).rejects.toThrow();
  });
});

describe("monthly.get", () => {
  it("returns null for a new month", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.monthly.get({ year: 2026, month: 1 });
    expect(result).toBeNull();
  });
});

describe("monthly.save", () => {
  it("saves monthly plan data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.monthly.save({
      year: 2026,
      month: 3,
      data: {
        themeWord: "Growth",
        wellnessHabit: "Morning yoga",
        todos: "- Finish project\n- Call mom",
        businessCareerGoals: "Launch new product",
      },
    });
    expect(result).toEqual({ success: true });
  });

  it("saves social media follower counts", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.monthly.save({
      year: 2026,
      month: 3,
      data: {
        socialFollowers: {
          instagram: "10500",
          tiktok: "25000",
          facebook: "3200",
        },
      },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("weekly.get", () => {
  it("returns null for a new week", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.weekly.get({ year: 2026, weekNumber: 12 });
    expect(result).toBeNull();
  });
});

describe("weekly.save", () => {
  it("saves weekly plan with habits and social posts", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.weekly.save({
      year: 2026,
      weekNumber: 12,
      weekStartDate: "2026-03-16",
      data: {
        wordOfWeek: "Momentum",
        affirmation: "I am capable of achieving my goals",
        topBusinessGoals: "Close 3 deals",
        habitTracker: {
          vitamins: { name: "Vitamins", days: [true, true, false, true, true, false, false] },
          exercise: { name: "Exercise", days: [true, false, true, false, true, false, false] },
        },
        moneyEarned: "$2,500 - Client payment",
        moneySpent: "$150 - Office supplies",
      },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("daily.get", () => {
  it("returns null for a new day", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.daily.get({ date: "2026-03-20" });
    expect(result).toBeNull();
  });
});

describe("daily.save", () => {
  it("saves daily entry with time slots and gratitude", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.daily.save({
      date: "2026-03-20",
      data: {
        topPriorities: ["Finish report", "Team meeting", "Client call", "", ""],
        timeSlots: {
          "09:00": "Team standup",
          "10:00": "Deep work - project",
          "14:00": "Client call",
        },
        gratitude: ["Good health", "Supportive family", "Sunny weather", "", ""],
        waterGlasses: 6,
      },
    });
    expect(result).toEqual({ success: true });
  });

  it("saves water intake correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.daily.save({
      date: "2026-03-21",
      data: { waterGlasses: 8 },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("contentCalendar.get", () => {
  it("returns null for a new content calendar entry", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contentCalendar.get({ year: 2026, month: 3, weekNum: 1 });
    expect(result).toBeNull();
  });
});

describe("contentCalendar.save", () => {
  it("saves content calendar entries", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contentCalendar.save({
      year: 2026,
      month: 3,
      weekNum: 1,
      entries: [
        { day: "Monday", platform: "Instagram", contentType: "Reel", captionHook: "3 tips for productivity", goal: "Engagement" },
        { day: "Wednesday", platform: "TikTok", contentType: "Video", captionHook: "Day in my life", goal: "Reach" },
      ],
    });
    expect(result).toEqual({ success: true });
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});
