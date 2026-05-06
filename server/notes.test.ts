import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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
  getNotes: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      title: "My First Note",
      content: "Hello world",
      folder: "All Notes",
      pinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getNoteById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    title: "My First Note",
    content: "Hello world",
    folder: "All Notes",
    pinned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  searchNotes: vi.fn().mockResolvedValue([]),
  createNote: vi.fn().mockResolvedValue({
    id: 2,
    userId: 1,
    title: "New Note",
    content: "",
    folder: "Personal",
    pinned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateNote: vi.fn().mockResolvedValue(undefined),
  deleteNote: vi.fn().mockResolvedValue(undefined),
  getNoteFolders: vi.fn().mockResolvedValue(["All Notes", "Personal", "Work"]),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-notes",
      email: "notes@example.com",
      name: "Notes User",
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

describe("notes.list", () => {
  it("returns notes for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toBe("My First Note");
  });

  it("accepts optional folder filter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.list({ folder: "Personal" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("notes.get", () => {
  it("returns a specific note by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.get({ id: 1 });
    expect(result).toBeTruthy();
    expect(result?.id).toBe(1);
    expect(result?.title).toBe("My First Note");
  });
});

describe("notes.search", () => {
  it("returns search results", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.search({ query: "hello" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("notes.folders", () => {
  it("returns list of folders", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.folders();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain("All Notes");
    expect(result).toContain("Personal");
  });
});

describe("notes.create", () => {
  it("creates a new note with defaults", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.create({});
    expect(result).toBeTruthy();
    expect(result?.id).toBe(2);
  });

  it("creates a note with custom title and folder", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.create({
      title: "My Goals",
      content: "# 2026 Goals\n- Launch business",
      folder: "Goals",
    });
    expect(result).toBeTruthy();
  });
});

describe("notes.update", () => {
  it("updates note title", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.update({ id: 1, title: "Updated Title" });
    expect(result).toEqual({ success: true });
  });

  it("pins a note", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.update({ id: 1, pinned: true });
    expect(result).toEqual({ success: true });
  });

  it("updates note content", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.update({
      id: 1,
      content: "# Updated Content\n\nThis is my updated note.",
    });
    expect(result).toEqual({ success: true });
  });

  it("moves note to a different folder", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.update({ id: 1, folder: "Work" });
    expect(result).toEqual({ success: true });
  });
});

describe("notes.delete", () => {
  it("deletes a note by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});
