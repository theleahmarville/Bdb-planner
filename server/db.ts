import { eq, and, or, like, gte, lte, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { DefaultLogger, LogWriter } from "drizzle-orm/logger";
import mysql from "mysql2/promise";
import {
  InsertUser,
  users,
  annualPlans,
  bigGoals,
  monthlyPlans,
  weeklyPlans,
  dailyEntries,
  contentCalendarEntries,
  notes,
  userIntegrations,
  reminders,
  Reminder,
  InsertReminder,
  Note,
  AnnualPlan,
  BigGoal,
  MonthlyPlan,
  WeeklyPlan,
  DailyEntry,
  ContentCalendarEntry,
  UserIntegration,
  visionBoardImages,
  sectionAttachments,
  socialAccounts,
  noteAttachments,
  NoteAttachment,
  zionMessages,
  ZionMessage,
  InsertZionMessage,
} from "../drizzle/schema";

// ─── Slow Query Logger ────────────────────────────────────────────────────────

class SlowQueryLogWriter implements LogWriter {
  write(message: string) {
    if (process.env.NODE_ENV === "development") {
      console.log("[DB]", message);
    } else {
      // In production, only log queries that mention slow execution
      // Drizzle logs query + params; we log all to catch issues
      console.log("[DB QUERY]", message.slice(0, 200));
    }
  }
}

// ─── Connection Pool ──────────────────────────────────────────────────────────

let _pool: mysql.Pool | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

function getPool(): mysql.Pool | null {
  if (!_pool && process.env.DATABASE_URL) {
    try {
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });
    } catch (error) {
      console.warn("[Database] Failed to create pool:", error);
      _pool = null;
    }
  }
  return _pool;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = getPool();
      if (!pool) return null;
      _db = drizzle(pool, {
        logger: new DefaultLogger({ writer: new SlowQueryLogWriter() }),
      });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if ((user as any).gender !== undefined) {
      (values as any).gender = (user as any).gender;
      updateSet.gender = (user as any).gender;
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Annual Plans ─────────────────────────────────────────────────────────────

export async function getAnnualPlan(userId: number, year: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(annualPlans)
    .where(and(eq(annualPlans.userId, userId), eq(annualPlans.year, year)))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertAnnualPlan(
  userId: number,
  year: number,
  data: Partial<Omit<AnnualPlan, "id" | "userId" | "year" | "createdAt" | "updatedAt">>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getAnnualPlan(userId, year);
  if (existing) {
    await db
      .update(annualPlans)
      .set(data as any)
      .where(and(eq(annualPlans.userId, userId), eq(annualPlans.year, year)));
  } else {
    await db.insert(annualPlans).values({ userId, year, ...data } as any);
  }
}

// ─── Big Goals ────────────────────────────────────────────────────────────────

export async function getBigGoals(userId: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(bigGoals)
    .where(and(eq(bigGoals.userId, userId), eq(bigGoals.year, year)));
}

export async function upsertBigGoal(
  userId: number,
  year: number,
  position: number,
  data: Partial<Omit<BigGoal, "id" | "userId" | "year" | "position" | "createdAt" | "updatedAt">>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(bigGoals)
    .where(
      and(
        eq(bigGoals.userId, userId),
        eq(bigGoals.year, year),
        eq(bigGoals.position, position)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(bigGoals)
      .set(data as any)
      .where(
        and(
          eq(bigGoals.userId, userId),
          eq(bigGoals.year, year),
          eq(bigGoals.position, position)
        )
      );
  } else {
    await db.insert(bigGoals).values({ userId, year, position, ...data } as any);
  }
}

// ─── Monthly Plans ────────────────────────────────────────────────────────────

export async function getMonthlyPlan(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(monthlyPlans)
    .where(
      and(
        eq(monthlyPlans.userId, userId),
        eq(monthlyPlans.year, year),
        eq(monthlyPlans.month, month)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

export async function upsertMonthlyPlan(
  userId: number,
  year: number,
  month: number,
  data: Partial<Omit<MonthlyPlan, "id" | "userId" | "year" | "month" | "createdAt" | "updatedAt">>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getMonthlyPlan(userId, year, month);
  if (existing) {
    await db
      .update(monthlyPlans)
      .set(data as any)
      .where(
        and(
          eq(monthlyPlans.userId, userId),
          eq(monthlyPlans.year, year),
          eq(monthlyPlans.month, month)
        )
      );
  } else {
    await db.insert(monthlyPlans).values({ userId, year, month, ...data } as any);
  }
}

// ─── Weekly Plans ─────────────────────────────────────────────────────────────

export async function getWeeklyPlan(userId: number, year: number, weekNumber: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.userId, userId),
        eq(weeklyPlans.year, year),
        eq(weeklyPlans.weekNumber, weekNumber)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

export async function upsertWeeklyPlan(
  userId: number,
  year: number,
  weekNumber: number,
  weekStartDate: string,
  data: Partial<Omit<WeeklyPlan, "id" | "userId" | "year" | "weekNumber" | "weekStartDate" | "createdAt" | "updatedAt">>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getWeeklyPlan(userId, year, weekNumber);
  if (existing) {
    await db
      .update(weeklyPlans)
      .set(data as any)
      .where(
        and(
          eq(weeklyPlans.userId, userId),
          eq(weeklyPlans.year, year),
          eq(weeklyPlans.weekNumber, weekNumber)
        )
      );
  } else {
    await db.insert(weeklyPlans).values({ userId, year, weekNumber, weekStartDate, ...data } as any);
  }
}

// ─── Daily Entries ────────────────────────────────────────────────────────────

export async function getDailyEntry(userId: number, date: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(dailyEntries)
    .where(and(eq(dailyEntries.userId, userId), eq(dailyEntries.date, date)))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertDailyEntry(
  userId: number,
  date: string,
  data: Partial<Omit<DailyEntry, "id" | "userId" | "date" | "createdAt" | "updatedAt">>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getDailyEntry(userId, date);
  if (existing) {
    await db
      .update(dailyEntries)
      .set(data as any)
      .where(and(eq(dailyEntries.userId, userId), eq(dailyEntries.date, date)));
  } else {
    await db.insert(dailyEntries).values({ userId, date, ...data } as any);
  }
}

// ─── Content Calendar ─────────────────────────────────────────────────────────

export async function getContentCalendar(userId: number, year: number, month: number, weekNum: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(contentCalendarEntries)
    .where(
      and(
        eq(contentCalendarEntries.userId, userId),
        eq(contentCalendarEntries.year, year),
        eq(contentCalendarEntries.month, month),
        eq(contentCalendarEntries.weekNum, weekNum)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

export async function upsertContentCalendar(
  userId: number,
  year: number,
  month: number,
  weekNum: number,
  entries: unknown
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getContentCalendar(userId, year, month, weekNum);
  if (existing) {
    await db
      .update(contentCalendarEntries)
      .set({ entries } as any)
      .where(
        and(
          eq(contentCalendarEntries.userId, userId),
          eq(contentCalendarEntries.year, year),
          eq(contentCalendarEntries.month, month),
          eq(contentCalendarEntries.weekNum, weekNum)
        )
      );
  } else {
    await db.insert(contentCalendarEntries).values({ userId, year, month, weekNum, entries } as any);
  }
}

// ─── Notes ────────────────────────────────────────────────────────────────────
export async function getNotes(userId: number, folder?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(notes.userId, userId)];
  if (folder && folder !== "All Notes") {
    conditions.push(eq(notes.folder, folder));
  }
  const result = await db
    .select()
    .from(notes)
    .where(and(...conditions))
    .orderBy(notes.pinned, notes.updatedAt);
  return result;
}

export async function getNoteById(userId: number, id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.id, id)))
    .limit(1);
  return result[0] ?? null;
}

export async function searchNotes(userId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        or(
          like(notes.title, `%${query}%`),
          like(notes.content, `%${query}%`)
        )
      )
    )
    .orderBy(notes.updatedAt);
  return result;
}

export async function createNote(userId: number, title: string, content: string, folder: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(notes).values({ userId, title, content, folder });
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  if (!insertId) return null;
  return getNoteById(userId, insertId);
}

export async function updateNote(
  userId: number,
  id: number,
  data: { title?: string; content?: string; folder?: string; pinned?: boolean }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notes)
    .set(data as any)
    .where(and(eq(notes.userId, userId), eq(notes.id, id)));
}

export async function deleteNote(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notes).where(and(eq(notes.userId, userId), eq(notes.id, id)));
}

export async function getNoteFolders(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .selectDistinct({ folder: notes.folder })
    .from(notes)
    .where(eq(notes.userId, userId));
  return result.map((r) => r.folder);
}

// ─── Daily Entries Year List ─────────────────────────────────────────────────
export async function getDailyEntriesForYear(userId: number, year: number): Promise<{ date: string }[]> {
  const db = await getDb();
  if (!db) return [];
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const result = await db
    .select({ date: dailyEntries.date })
    .from(dailyEntries)
    .where(and(eq(dailyEntries.userId, userId), gte(dailyEntries.date, startDate), lte(dailyEntries.date, endDate)));
  return result;
}

// ─── User Integrations ────────────────────────────────────────────────────────
export async function getUserIntegrations(userId: number): Promise<UserIntegration | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userIntegrations).where(eq(userIntegrations.userId, userId)).limit(1);
  return result[0];
}

export async function upsertUserIntegrations(userId: number, data: Partial<Omit<UserIntegration, "id" | "userId" | "createdAt" | "updatedAt">>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserIntegrations(userId);
  if (existing) {
    await db.update(userIntegrations).set(data as any).where(eq(userIntegrations.userId, userId));
  } else {
    await db.insert(userIntegrations).values({ userId, ...data } as any);
  }
}

// ─── Note Lock Helpers ────────────────────────────────────────────────────────
export async function setNoteLock(userId: number, noteId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notes)
    .set({ isLocked: true, lockPasswordHash: passwordHash })
    .where(and(eq(notes.userId, userId), eq(notes.id, noteId)));
}

export async function removeNoteLock(userId: number, noteId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notes)
    .set({ isLocked: false, lockPasswordHash: null })
    .where(and(eq(notes.userId, userId), eq(notes.id, noteId)));
}

export async function getNotePasswordHash(userId: number, noteId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ lockPasswordHash: notes.lockPasswordHash })
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
    .limit(1);
  return result[0]?.lockPasswordHash ?? null;
}

// ─── Vision Board Images ──────────────────────────────────────────────────────
export async function getVisionBoardImages(userId: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(visionBoardImages)
    .where(and(eq(visionBoardImages.userId, userId), eq(visionBoardImages.year, year)))
    .orderBy(visionBoardImages.position);
}

export async function addVisionBoardImage(
  userId: number,
  year: number,
  data: { imageUrl: string; fileKey: string; caption?: string; position?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(visionBoardImages).values({
    userId,
    year,
    imageUrl: data.imageUrl,
    fileKey: data.fileKey,
    caption: data.caption ?? "",
    position: data.position ?? 0,
  });
}

export async function updateVisionBoardImageCaption(
  id: number,
  userId: number,
  caption: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(visionBoardImages)
    .set({ caption })
    .where(and(eq(visionBoardImages.id, id), eq(visionBoardImages.userId, userId)));
}

export async function deleteVisionBoardImage(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(visionBoardImages)
    .where(and(eq(visionBoardImages.id, id), eq(visionBoardImages.userId, userId)));
}

// ─── Section Attachments ──────────────────────────────────────────────────────
export async function getSectionAttachments(userId: number, sectionKey: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(sectionAttachments)
    .where(
      and(
        eq(sectionAttachments.userId, userId),
        eq(sectionAttachments.sectionKey, sectionKey)
      )
    )
    .orderBy(sectionAttachments.createdAt);
}

export async function addSectionAttachment(
  userId: number,
  data: {
    section: string;
    sectionKey: string;
    fileUrl: string;
    fileKey: string;
    fileName: string;
    fileType: string;
    fileSizeBytes?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(sectionAttachments).values({
    userId,
    section: data.section,
    sectionKey: data.sectionKey,
    fileUrl: data.fileUrl,
    fileKey: data.fileKey,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSizeBytes: data.fileSizeBytes,
  });
  return result;
}

export async function deleteSectionAttachment(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(sectionAttachments)
    .where(and(eq(sectionAttachments.id, id), eq(sectionAttachments.userId, userId)));
}

// ─── Social Accounts ──────────────────────────────────────────────────────────
export async function getSocialAccounts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.userId, userId))
    .orderBy(socialAccounts.platform);
}

export async function upsertSocialAccount(
  userId: number,
  data: {
    platform: string;
    handle?: string;
    profileUrl?: string;
    displayName?: string;
    followerCount?: number;
    connected?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Check if exists
  const existing = await db
    .select()
    .from(socialAccounts)
    .where(and(eq(socialAccounts.userId, userId), eq(socialAccounts.platform, data.platform)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(socialAccounts)
      .set({
        handle: data.handle,
        profileUrl: data.profileUrl,
        displayName: data.displayName,
        followerCount: data.followerCount,
        connected: data.connected ?? true,
      })
      .where(and(eq(socialAccounts.userId, userId), eq(socialAccounts.platform, data.platform)));
  } else {
    await db.insert(socialAccounts).values({
      userId,
      platform: data.platform,
      handle: data.handle,
      profileUrl: data.profileUrl,
      displayName: data.displayName,
      followerCount: data.followerCount,
      connected: data.connected ?? true,
    });
  }
}

export async function deleteSocialAccount(userId: number, platform: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(socialAccounts)
    .where(and(eq(socialAccounts.userId, userId), eq(socialAccounts.platform, platform)));
}

// ─── AI Digest Data Helpers ───────────────────────────────────────────────────

export interface DailyDigestData {
  date: string;
  topPriorities: string[];
  timeSlots: Record<string, string>;
  waterGlasses: number;
  weeklyWordOfWeek: string;
  weeklyAffirmation: string;
  weeklyIntentions: string;
  weeklyTopGoals: string;
  monthlyTheme: string;
  monthlyGoals: string;
  bigGoals: Array<{ title: string; steps: string }>;
  habits: Record<string, { name: string; days: boolean[] }>;
  socialAccounts: Array<{ platform: string; handle: string }>;
}

export interface WeeklyDigestData {
  weekNumber: number;
  year: number;
  weekStartDate: string;
  wordOfWeek: string;
  affirmation: string;
  bibleVerse: string;
  weekIntentions: string;
  topBusinessGoals: string;
  wellnessTasks: string;
  moneyEarned: string;
  moneySpent: string;
  winsOfWeek: string;
  habitTracker: Record<string, { name: string; days: boolean[] }>;
  dailyPriorities: Array<{ date: string; priorities: string[] }>;
  dailyTimeSlots: Array<{ date: string; slots: Record<string, string> }>;
  monthlyTheme: string;
  monthlyGoals: string;
  bigGoals: Array<{ title: string; steps: string }>;
}

export async function getDailyDigestData(
  userId: number,
  date: string,
  year: number,
  month: number,
  weekNumber: number
): Promise<DailyDigestData> {
  const db = await getDb();
  const results: Partial<DailyDigestData> = {
    date,
    topPriorities: [],
    timeSlots: {},
    waterGlasses: 0,
    weeklyWordOfWeek: "",
    weeklyAffirmation: "",
    weeklyIntentions: "",
    weeklyTopGoals: "",
    monthlyTheme: "",
    monthlyGoals: "",
    bigGoals: [],
    habits: {},
    socialAccounts: [],
  };

  if (!db) return results as DailyDigestData;

    // Daily entry
  const daily = await getDailyEntry(userId, date);
  if (daily) {
    results.topPriorities = (daily.topPriorities as string[]) || [];
    results.timeSlots = (daily.timeSlots as Record<string, string>) || {};
    results.waterGlasses = daily.waterGlasses || 0;
  }
  // Weekly plan
  const weekly = await getWeeklyPlan(userId, year, weekNumber);
  if (weekly) {
    results.weeklyWordOfWeek = weekly.wordOfWeek || "";
    results.weeklyAffirmation = weekly.affirmation || "";
    results.weeklyIntentions = weekly.weekIntentions || "";
    results.weeklyTopGoals = weekly.topBusinessGoals || "";
    results.habits = (weekly.habitTracker as Record<string, { name: string; days: boolean[] }>) || {};
  }
  // Monthly plan
  const monthly = await getMonthlyPlan(userId, year, month);
  if (monthly) {
    results.monthlyTheme = monthly.themeWord || "";
    results.monthlyGoals = monthly.businessCareerGoals || "";
  }
  // Big goals
  const goals = await getBigGoals(userId, year);
  results.bigGoals = goals.map((g) => ({
    title: g.title || "",
    steps: Array.isArray(g.steps) ? (g.steps as string[]).join(", ") : "",
  })).filter((g) => g.title);;

  // Social accounts
  const socials = await getSocialAccounts(userId);
  results.socialAccounts = socials
    .filter((s) => s.connected && s.handle)
    .map((s) => ({ platform: s.platform, handle: s.handle || "" }));

  return results as DailyDigestData;
}

export async function getWeeklyDigestData(
  userId: number,
  year: number,
  month: number,
  weekNumber: number,
  weekDates: string[]
): Promise<WeeklyDigestData> {
  const db = await getDb();
  const results: Partial<WeeklyDigestData> = {
    weekNumber,
    year,
    weekStartDate: weekDates[0] || "",
    wordOfWeek: "",
    affirmation: "",
    bibleVerse: "",
    weekIntentions: "",
    topBusinessGoals: "",
    wellnessTasks: "",
    moneyEarned: "",
    moneySpent: "",
    winsOfWeek: "",
    habitTracker: {},
    dailyPriorities: [],
    dailyTimeSlots: [],
    monthlyTheme: "",
    monthlyGoals: "",
    bigGoals: [],
  };

  if (!db) return results as WeeklyDigestData;

  // Weekly plan
  const weekly = await getWeeklyPlan(userId, year, weekNumber);
  if (weekly) {
    results.wordOfWeek = weekly.wordOfWeek || "";
    results.affirmation = weekly.affirmation || "";
    results.bibleVerse = weekly.bibleVerse || "";
    results.weekIntentions = weekly.weekIntentions || "";
    results.topBusinessGoals = weekly.topBusinessGoals || "";
    results.wellnessTasks = weekly.wellnessTasks || "";
    results.moneyEarned = weekly.moneyEarned || "";
    results.moneySpent = weekly.moneySpent || "";
    results.winsOfWeek = weekly.winsOfWeek || "";
    results.habitTracker = (weekly.habitTracker as Record<string, { name: string; days: boolean[] }>) || {};
  }
  // Daily entries for each day of the week
  const dailyPriorities: Array<{ date: string; priorities: string[] }> = [];
  const dailyTimeSlots: Array<{ date: string; slots: Record<string, string> }> = [];
  for (const date of weekDates) {
    const daily = await getDailyEntry(userId, date);
    dailyPriorities.push({ date, priorities: (daily?.topPriorities as string[]) || [] });
    dailyTimeSlots.push({ date, slots: (daily?.timeSlots as Record<string, string>) || {} });
  }
  results.dailyPriorities = dailyPriorities;
  results.dailyTimeSlots = dailyTimeSlots;
  // Monthly plan
  const monthly = await getMonthlyPlan(userId, year, month);
  if (monthly) {
    results.monthlyTheme = monthly.themeWord || "";
    results.monthlyGoals = monthly.businessCareerGoals || "";
  }
  // Big goals
  const goals = await getBigGoals(userId, year);
  results.bigGoals = goals.map((g) => ({
    title: g.title || "",
    steps: Array.isArray(g.steps) ? (g.steps as string[]).join(", ") : "",
  })).filter((g) => g.title);
  return results as WeeklyDigestData;
}

// ── Note Attachments ──────────────────────────────────────────────────────────
export async function getNoteAttachments(userId: number, noteId: number): Promise<NoteAttachment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(noteAttachments)
    .where(and(eq(noteAttachments.userId, userId), eq(noteAttachments.noteId, noteId)))
    .orderBy(noteAttachments.createdAt);
}

export async function addNoteAttachment(data: {
  userId: number;
  noteId: number;
  fileUrl: string;
  fileKey: string;
  fileName: string;
  fileType: string;
  fileSizeBytes?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(noteAttachments).values(data);
}

export async function deleteNoteAttachment(userId: number, attachmentId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(noteAttachments)
    .where(and(eq(noteAttachments.id, attachmentId), eq(noteAttachments.userId, userId)));
}

export async function deleteAllNoteAttachments(userId: number, noteId: number): Promise<NoteAttachment[]> {
  const db = await getDb();
  if (!db) return [];
  const existing = await getNoteAttachments(userId, noteId);
  await db.delete(noteAttachments)
    .where(and(eq(noteAttachments.noteId, noteId), eq(noteAttachments.userId, userId)));
  return existing;
}

// ── Zion AI Chat Helpers ──────────────────────────────────────────────────────

export async function getZionHistory(userId: number, limit = 50): Promise<ZionMessage[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(zionMessages)
    .where(eq(zionMessages.userId, userId))
    .orderBy(zionMessages.createdAt)
    .limit(limit);
  return rows;
}

export async function saveZionMessage(msg: InsertZionMessage): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(zionMessages).values(msg);
}

export async function clearZionHistory(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(zionMessages).where(eq(zionMessages.userId, userId));
}

export async function getUserPlannerContext(userId: number) {
  const db = await getDb();
  if (!db) return {
    annualPlan: null, bigGoals: [], allMonthlyPlans: [], monthlyPlan: null,
    weeklyPlan: null, recentDailyEntries: [], upcomingReminders: [], recentNotes: [],
    now: new Date(), year: new Date().getFullYear(), month: new Date().getMonth() + 1,
    weekNumber: 1, weekStartDate: '',
  };

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // ISO week number
  const getISOWeek = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };
  const weekNumber = getISOWeek(now);

  // Monday of current ISO week
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const weekStartDate = monday.toISOString().slice(0, 10);

  // 7 days ago and 14 days ahead for reminders
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAhead = new Date(now); fourteenDaysAhead.setDate(now.getDate() + 14);

  const [annualRows, goalsRows, allMonthlyRows, weeklyRows, dailyRows, reminderRows, noteRows] = await Promise.all([
    db.select().from(annualPlans).where(and(eq(annualPlans.userId, userId), eq(annualPlans.year, year))).limit(1),
    db.select().from(bigGoals).where(and(eq(bigGoals.userId, userId), eq(bigGoals.year, year))).orderBy(bigGoals.position),
    db.select().from(monthlyPlans).where(and(eq(monthlyPlans.userId, userId), eq(monthlyPlans.year, year))).orderBy(monthlyPlans.month),
    db.select().from(weeklyPlans).where(and(eq(weeklyPlans.userId, userId), eq(weeklyPlans.year, year), eq(weeklyPlans.weekNumber, weekNumber))).limit(1),
    db.select().from(dailyEntries).where(and(eq(dailyEntries.userId, userId), gte(dailyEntries.date, sevenDaysAgo.toISOString().slice(0, 10)))).orderBy(dailyEntries.date),
    db.select().from(reminders).where(and(eq(reminders.userId, userId), eq(reminders.sent, false), lte(reminders.reminderAt, fourteenDaysAhead))).orderBy(reminders.reminderAt).limit(20),
    db.select().from(notes).where(eq(notes.userId, userId)).orderBy(notes.updatedAt).limit(10),
  ]);

  const currentMonthPlan = allMonthlyRows.find(m => m.month === month) ?? null;

  return {
    annualPlan: annualRows[0] ?? null,
    bigGoals: goalsRows,
    allMonthlyPlans: allMonthlyRows,
    monthlyPlan: currentMonthPlan,
    weeklyPlan: weeklyRows[0] ?? null,
    recentDailyEntries: dailyRows,
    upcomingReminders: reminderRows,
    recentNotes: noteRows,
    now,
    year,
    month,
    weekNumber,
    weekStartDate,
  };
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export async function getReminders(userId: number): Promise<Reminder[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reminders)
    .where(eq(reminders.userId, userId))
    .orderBy(reminders.reminderAt);
}

export async function getUnsentReminders(): Promise<Reminder[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(reminders)
    .where(and(eq(reminders.sent, false), lte(reminders.reminderAt, now)));
}

export async function createReminder(data: Omit<InsertReminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(reminders).values(data as InsertReminder);
}

export async function deleteReminder(userId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(reminders).where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
}

export async function markReminderSent(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(reminders).set({ sent: true }).where(eq(reminders.id, id));
}
