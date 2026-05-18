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

export function getPool(): mysql.Pool | null {
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

// ─── Safe Schema Migrations (raw SQL, idempotent) ─────────────────────────────
// These ensure columns that were added after initial deploy exist in the DB.
// Each ALTER is guarded by an INFORMATION_SCHEMA check so it's safe to run repeatedly.
export async function ensureSchema(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    console.warn("[DB] ensureSchema: no pool, skipping");
    return;
  }
  const conn = await pool.getConnection();
  try {
    const checks: Array<{ table: string; column: string; ddl: string }> = [
      {
        table: "users",
        column: "gender",
        ddl: "ALTER TABLE `users` ADD COLUMN `gender` ENUM('female','male','other') DEFAULT 'other'",
      },
      {
        table: "daily_entries",
        column: "dailyWins",
        ddl: "ALTER TABLE `daily_entries` ADD COLUMN `dailyWins` JSON",
      },
      {
        table: "users",
        column: "avatarUrl",
        ddl: "ALTER TABLE `users` ADD COLUMN `avatarUrl` TEXT",
      },
      {
        table: "users",
        column: "bio",
        ddl: "ALTER TABLE `users` ADD COLUMN `bio` VARCHAR(280)",
      },
      {
        table: "users",
        column: "timezone",
        ddl: "ALTER TABLE `users` ADD COLUMN `timezone` VARCHAR(64) DEFAULT 'UTC'",
      },
      {
        table: "users",
        column: "onboardingCompleted",
        ddl: "ALTER TABLE `users` ADD COLUMN `onboardingCompleted` BOOLEAN NOT NULL DEFAULT FALSE",
      },
      { table: "users", column: "role", ddl: "ALTER TABLE `users` ADD COLUMN `role` ENUM('member','admin') NOT NULL DEFAULT 'member'" },
      { table: "community_messages", column: "isDeleted", ddl: "ALTER TABLE `community_messages` ADD COLUMN `isDeleted` TINYINT(1) NOT NULL DEFAULT 0" },
      { table: "community_messages", column: "deletedByAdmin", ddl: "ALTER TABLE `community_messages` ADD COLUMN `deletedByAdmin` TINYINT(1) NOT NULL DEFAULT 0" },
      { table: "community_messages", column: "reactions", ddl: "ALTER TABLE `community_messages` ADD COLUMN `reactions` JSON" },
      { table: "community_messages", column: "flagCount", ddl: "ALTER TABLE `community_messages` ADD COLUMN `flagCount` INT NOT NULL DEFAULT 0" },
      { table: "annual_plans", column: "visionBoardPinterest", ddl: "ALTER TABLE `annual_plans` ADD COLUMN `visionBoardPinterest` TEXT" },
      { table: "annual_plans", column: "visionBoardCoverUrl", ddl: "ALTER TABLE `annual_plans` ADD COLUMN `visionBoardCoverUrl` TEXT" },
      { table: "social_accounts", column: "lastPostLikes", ddl: "ALTER TABLE `social_accounts` ADD COLUMN `lastPostLikes` INT DEFAULT NULL" },
      { table: "social_accounts", column: "lastPostComments", ddl: "ALTER TABLE `social_accounts` ADD COLUMN `lastPostComments` INT DEFAULT NULL" },
      { table: "social_accounts", column: "lastPostReach", ddl: "ALTER TABLE `social_accounts` ADD COLUMN `lastPostReach` INT DEFAULT NULL" },
      { table: "social_accounts", column: "lastPostDate", ddl: "ALTER TABLE `social_accounts` ADD COLUMN `lastPostDate` VARCHAR(10) DEFAULT NULL" },
      { table: "social_accounts", column: "avgLikes", ddl: "ALTER TABLE `social_accounts` ADD COLUMN `avgLikes` INT DEFAULT NULL" },
      { table: "social_accounts", column: "avgReach", ddl: "ALTER TABLE `social_accounts` ADD COLUMN `avgReach` INT DEFAULT NULL" },
      { table: "social_accounts", column: "engagementRate", ddl: "ALTER TABLE `social_accounts` ADD COLUMN `engagementRate` DECIMAL(5,2) DEFAULT NULL" },
      { table: "social_accounts", column: "contentNiche", ddl: "ALTER TABLE `social_accounts` ADD COLUMN `contentNiche` VARCHAR(100) DEFAULT NULL" },
      { table: "social_accounts", column: "contentGoal", ddl: "ALTER TABLE `social_accounts` ADD COLUMN `contentGoal` VARCHAR(200) DEFAULT NULL" },
      { table: "user_integrations", column: "gmailEnabled", ddl: "ALTER TABLE `user_integrations` ADD COLUMN `gmailEnabled` TINYINT(1) NOT NULL DEFAULT 0" },
    ];

    // Create community tables if they don't exist
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`daily_check_ins\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`userId\` INT NOT NULL,
        \`date\` VARCHAR(10) NOT NULL,
        \`rating\` INT NOT NULL,
        \`note\` VARCHAR(500),
        \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        UNIQUE KEY \`uq_user_date\` (\`userId\`, \`date\`),
        INDEX \`idx_date\` (\`date\`)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`community_messages\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`userId\` INT NOT NULL,
        \`content\` VARCHAR(1000) NOT NULL,
        \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX \`idx_createdAt\` (\`createdAt\`)
      )
    `);

    // Push subscriptions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`push_subscriptions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`userId\` INT NOT NULL,
        \`endpoint\` TEXT NOT NULL,
        \`p256dh\` TEXT NOT NULL,
        \`auth\` TEXT NOT NULL,
        \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE KEY \`uq_endpoint\` (\`endpoint\`(255)),
        INDEX \`idx_userId\` (\`userId\`)
      )
    `);

    for (const { table, column, ddl } of checks) {
      const [rows] = await conn.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );
      if ((rows as any[]).length === 0) {
        await conn.query(ddl);
        console.log(`✅ [DB] Added column ${table}.${column}`);
      } else {
        console.log(`✓ [DB] Column ${table}.${column} already exists`);
      }
    }
  } catch (err) {
    console.error("[DB] ensureSchema error:", err);
  } finally {
    conn.release();
  }
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
    const extraFields = ["gender", "avatarUrl", "bio", "timezone", "onboardingCompleted"] as const;
    for (const field of extraFields) {
      if ((user as any)[field] !== undefined) {
        (values as any)[field] = (user as any)[field];
        updateSet[field] = (user as any)[field];
      }
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

/**
 * Remove undefined values from an update payload so Drizzle does NOT generate
 * "SET col = NULL" for keys the caller simply didn't provide.
 * NULL is kept (explicit clear), undefined means "don't touch this column".
 */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export async function upsertAnnualPlan(
  userId: number,
  year: number,
  data: Partial<Omit<AnnualPlan, "id" | "userId" | "year" | "createdAt" | "updatedAt">>
) {
  const db = await getDb();
  if (!db) return;
  const clean = stripUndefined(data);
  if (Object.keys(clean).length === 0) return; // nothing to save
  const existing = await getAnnualPlan(userId, year);
  if (existing) {
    await db
      .update(annualPlans)
      .set(clean as any)
      .where(and(eq(annualPlans.userId, userId), eq(annualPlans.year, year)));
  } else {
    await db.insert(annualPlans).values({ userId, year, ...clean } as any);
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
  const clean = stripUndefined(data);
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
    if (Object.keys(clean).length > 0) {
      await db
        .update(bigGoals)
        .set(clean as any)
        .where(
          and(
            eq(bigGoals.userId, userId),
            eq(bigGoals.year, year),
            eq(bigGoals.position, position)
          )
        );
    }
  } else {
    await db.insert(bigGoals).values({ userId, year, position, ...clean } as any);
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
  const clean = stripUndefined(data);
  if (Object.keys(clean).length === 0) return;
  const existing = await getMonthlyPlan(userId, year, month);
  if (existing) {
    await db
      .update(monthlyPlans)
      .set(clean as any)
      .where(
        and(
          eq(monthlyPlans.userId, userId),
          eq(monthlyPlans.year, year),
          eq(monthlyPlans.month, month)
        )
      );
  } else {
    await db.insert(monthlyPlans).values({ userId, year, month, ...clean } as any);
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
  const clean = stripUndefined(data);
  if (Object.keys(clean).length === 0) return;
  const existing = await getWeeklyPlan(userId, year, weekNumber);
  if (existing) {
    await db
      .update(weeklyPlans)
      .set(clean as any)
      .where(
        and(
          eq(weeklyPlans.userId, userId),
          eq(weeklyPlans.year, year),
          eq(weeklyPlans.weekNumber, weekNumber)
        )
      );
  } else {
    await db.insert(weeklyPlans).values({ userId, year, weekNumber, weekStartDate, ...clean } as any);
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
  const clean = stripUndefined(data);
  if (Object.keys(clean).length === 0) return;
  const existing = await getDailyEntry(userId, date);
  if (existing) {
    await db
      .update(dailyEntries)
      .set(clean as any)
      .where(and(eq(dailyEntries.userId, userId), eq(dailyEntries.date, date)));
  } else {
    await db.insert(dailyEntries).values({ userId, date, ...clean } as any);
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
    lastPostLikes?: number;
    lastPostComments?: number;
    lastPostReach?: number;
    lastPostDate?: string;
    avgLikes?: number;
    avgReach?: number;
    engagementRate?: number;
    contentNiche?: string;
    contentGoal?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(socialAccounts)
    .where(and(eq(socialAccounts.userId, userId), eq(socialAccounts.platform, data.platform)))
    .limit(1);

  const fields: Record<string, any> = {
    handle: data.handle,
    profileUrl: data.profileUrl,
    displayName: data.displayName,
    followerCount: data.followerCount,
    connected: data.connected ?? true,
  };
  // Only include new analytic fields if provided (avoid overwriting with undefined)
  if (data.lastPostLikes !== undefined) fields.lastPostLikes = data.lastPostLikes;
  if (data.lastPostComments !== undefined) fields.lastPostComments = data.lastPostComments;
  if (data.lastPostReach !== undefined) fields.lastPostReach = data.lastPostReach;
  if (data.lastPostDate !== undefined) fields.lastPostDate = data.lastPostDate;
  if (data.avgLikes !== undefined) fields.avgLikes = data.avgLikes;
  if (data.avgReach !== undefined) fields.avgReach = data.avgReach;
  if (data.engagementRate !== undefined) fields.engagementRate = data.engagementRate;
  if (data.contentNiche !== undefined) fields.contentNiche = data.contentNiche;
  if (data.contentGoal !== undefined) fields.contentGoal = data.contentGoal;

  if (existing.length > 0) {
    await db
      .update(socialAccounts)
      .set(fields)
      .where(and(eq(socialAccounts.userId, userId), eq(socialAccounts.platform, data.platform)));
  } else {
    await db.insert(socialAccounts).values({
      userId,
      platform: data.platform,
      ...fields,
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

// ─── Global Search ────────────────────────────────────────────────────────────

export type SearchResultItem = {
  id: string;
  type: "note" | "attachment" | "goal" | "reminder" | "todo";
  title: string;
  excerpt?: string;
  meta?: string;        // e.g. file type, date, section name
  navPath?: string;     // where to navigate on click
  fileUrl?: string;     // for attachments — direct open link
  fileType?: string;
};

export async function globalSearch(userId: number, query: string): Promise<SearchResultItem[]> {
  const db = await getDb();
  if (!db || !query.trim()) return [];
  const q = query.trim();
  const results: SearchResultItem[] = [];

  await Promise.all([
    // ── Notes ──────────────────────────────────────────────────────────────────
    db.select().from(notes)
      .where(and(eq(notes.userId, userId), or(like(notes.title, `%${q}%`), like(notes.content, `%${q}%`))))
      .limit(10)
      .then(rows => rows.forEach(n => results.push({
        id: `note-${n.id}`,
        type: "note",
        title: n.title,
        excerpt: n.content?.replace(/<[^>]+>/g, "").slice(0, 120),
        meta: n.folder || "Notes",
        navPath: `/notes`,
      }))),

    // ── Section attachments (PDFs, images, links) ──────────────────────────────
    db.select().from(sectionAttachments)
      .where(and(eq(sectionAttachments.userId, userId), like(sectionAttachments.fileName, `%${q}%`)))
      .limit(15)
      .then(rows => rows.forEach(a => {
        const sectionLabel = a.sectionKey
          .replace(/^annual-\d+-/, "Annual: ")
          .replace(/^monthly-\d+-\d+-/, "Monthly: ")
          .replace(/^weekly-\d+-\d+-/, "Weekly: ")
          .replace(/-/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase());
        results.push({
          id: `att-${a.id}`,
          type: "attachment",
          title: a.fileName,
          meta: sectionLabel,
          fileUrl: a.fileUrl,
          fileType: a.fileType,
          navPath: a.section === "annual" ? "/annual" : undefined,
        });
      })),

    // ── Big Goals ──────────────────────────────────────────────────────────────
    db.select().from(bigGoals)
      .where(and(eq(bigGoals.userId, userId), or(like(bigGoals.title, `%${q}%`), like(bigGoals.description, `%${q}%`))))
      .limit(6)
      .then(rows => rows.forEach(g => results.push({
        id: `goal-${g.id}`,
        type: "goal",
        title: g.title || `Big Goal ${g.position}`,
        excerpt: g.description?.slice(0, 120) ?? undefined,
        meta: `${g.year} · Goal ${g.position}`,
        navPath: `/annual`,
      }))),

    // ── Reminders ──────────────────────────────────────────────────────────────
    db.select().from(reminders)
      .where(and(eq(reminders.userId, userId), like(reminders.title, `%${q}%`)))
      .orderBy(reminders.reminderAt)
      .limit(10)
      .then(rows => rows.forEach(r => results.push({
        id: `reminder-${r.id}`,
        type: "reminder",
        title: r.title,
        meta: `${r.date}${r.timeSlot ? " at " + r.timeSlot : ""}`,
        navPath: r.date ? `/weekly/${new Date(r.date).getFullYear()}/${getISOWeekOfDate(r.date)}` : undefined,
      }))),

    // ── Annual plan text fields ────────────────────────────────────────────────
    db.select().from(annualPlans)
      .where(and(
        eq(annualPlans.userId, userId),
        or(
          like(annualPlans.missionStatement, `%${q}%`),
          like(annualPlans.elevatorPitch, `%${q}%`),
          like(annualPlans.contractBe, `%${q}%`),
          like(annualPlans.contractDo, `%${q}%`),
          like(annualPlans.contractBecome, `%${q}%`),
          like(annualPlans.professional, `%${q}%`),
          like(annualPlans.wellness, `%${q}%`),
          like(annualPlans.learning, `%${q}%`),
          like(annualPlans.finance, `%${q}%`),
          like(annualPlans.relationships, `%${q}%`),
          like(annualPlans.creativity, `%${q}%`),
        )
      ))
      .limit(5)
      .then(rows => rows.forEach(a => {
        const excerpt = [
          a.missionStatement, a.elevatorPitch, a.contractBe, a.contractDo,
          a.professional, a.wellness, a.learning,
        ].find(f => f?.toLowerCase().includes(q.toLowerCase()));
        results.push({
          id: `annual-${a.id}`,
          type: "annual",
          title: `Annual Plan ${a.year}`,
          excerpt: excerpt?.slice(0, 120),
          meta: `${a.year}`,
          navPath: "/annual",
        });
      })),

    // ── Weekly plan text fields ───────────────────────────────────────────────
    db.select().from(weeklyPlans)
      .where(and(
        eq(weeklyPlans.userId, userId),
        or(
          like(weeklyPlans.wordOfWeek, `%${q}%`),
          like(weeklyPlans.affirmation, `%${q}%`),
          like(weeklyPlans.winsOfWeek, `%${q}%`),
          like(weeklyPlans.weekIntentions, `%${q}%`),
          like(weeklyPlans.topBusinessGoals, `%${q}%`),
          like(weeklyPlans.notes, `%${q}%`),
        )
      ))
      .limit(8)
      .then(rows => rows.forEach(w => {
        const excerpt = [w.winsOfWeek, w.weekIntentions, w.affirmation, w.notes, w.wordOfWeek]
          .find(f => f?.toLowerCase().includes(q.toLowerCase()));
        results.push({
          id: `weekly-${w.id}`,
          type: "weekly",
          title: `Week ${w.weekNumber}, ${w.year}`,
          excerpt: excerpt?.slice(0, 120),
          meta: `${w.weekStartDate}`,
          navPath: `/weekly/${w.year}/${w.weekNumber}`,
        });
      })),

    // ── Vision board image captions ───────────────────────────────────────────
    db.select().from(visionBoardImages)
      .where(and(
        eq(visionBoardImages.userId, userId),
        like(visionBoardImages.caption, `%${q}%`)
      ))
      .limit(6)
      .then(rows => rows.forEach(v => results.push({
        id: `vb-${v.id}`,
        type: "visionboard",
        title: v.caption || "Vision Board Image",
        excerpt: `Year ${v.year} Vision Board`,
        navPath: "/annual",
      }))),
  ]);

  return results;
}

function getISOWeekOfDate(dateStr: string): number {
  const d = new Date(dateStr);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = d.getTime() - startOfWeek1.getTime();
  return Math.ceil((diff / 86400000 + 1) / 7);
}

// ─── Community Functions ──────────────────────────────────────────────────────

export async function upsertDailyCheckIn(
  userId: number,
  date: string,
  rating: number,
  note?: string
): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO \`daily_check_ins\` (userId, date, rating, note)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), note = VALUES(note), updatedAt = CURRENT_TIMESTAMP`,
      [userId, date, rating, note ?? null]
    );
  } finally {
    conn.release();
  }
}

export async function getMyCheckIn(userId: number, date: string): Promise<{ rating: number; note: string | null } | null> {
  const pool = getPool();
  if (!pool) return null;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT rating, note FROM \`daily_check_ins\` WHERE userId = ? AND date = ? LIMIT 1`,
      [userId, date]
    );
    const list = rows as any[];
    return list[0] ?? null;
  } finally {
    conn.release();
  }
}

export async function getUserCheckInStreak(userId: number, today: string): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;
  const conn = await pool.getConnection();
  try {
    // Fetch all check-in dates for this user, newest first
    const [rows] = await conn.query(
      `SELECT date FROM \`daily_check_ins\` WHERE userId = ? ORDER BY date DESC`,
      [userId]
    );
    const dates = (rows as any[]).map((r: any) => r.date as string);
    if (!dates.includes(today)) return 0;
    // Count consecutive days ending today
    let streak = 1;
    let current = new Date(today);
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(current);
      prev.setDate(prev.getDate() - 1);
      const prevStr = prev.toISOString().slice(0, 10);
      if (dates[i] === prevStr) {
        streak++;
        current = prev;
      } else {
        break;
      }
    }
    return streak;
  } finally {
    conn.release();
  }
}

export async function getTodayLeaderboard(date: string): Promise<Array<{
  userId: number;
  firstName: string;
  avatarUrl: string | null;
  rating: number;
  note: string | null;
  streak: number;
  totalCheckIns: number;
  checkedInAt: Date;
}>> {
  const pool = getPool();
  if (!pool) return [];
  const conn = await pool.getConnection();
  try {
    // Rolling 24-hour window — entries stay visible for a full day
    const [rows] = await conn.query(
      `SELECT c.userId, c.rating, c.note, c.createdAt, c.date, u.name, u.avatarUrl
       FROM \`daily_check_ins\` c
       JOIN \`users\` u ON u.id = c.userId
       WHERE c.createdAt >= NOW() - INTERVAL 24 HOUR
       ORDER BY c.rating DESC, c.createdAt ASC`
    );
    const entries = rows as any[];
    const result = await Promise.all(entries.map(async (row: any) => {
      const streak = await getUserCheckInStreak(row.userId, row.date);
      const totalCheckIns = await getUserTotalCheckIns(row.userId);
      return {
        userId: row.userId,
        firstName: (row.name as string || "Friend").split(" ")[0],
        avatarUrl: (row.avatarUrl as string | null) ?? null,
        rating: row.rating as number,
        note: (row.note as string | null) ?? null,
        streak,
        totalCheckIns,
        checkedInAt: row.createdAt as Date,
      };
    }));
    return result;
  } finally {
    conn.release();
  }
}

export async function getWeeklyTopPerformers(weekStart: string, weekEnd: string): Promise<Array<{
  userId: number;
  firstName: string;
  avatarUrl: string | null;
  checkInCount: number;
  avgRating: number;
  score: number;
}>> {
  const pool = getPool();
  if (!pool) return [];
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT c.userId, u.name, u.avatarUrl,
              COUNT(*) AS checkInCount,
              ROUND(AVG(c.rating), 1) AS avgRating,
              ROUND(COUNT(*) * AVG(c.rating), 2) AS score
       FROM \`daily_check_ins\` c
       JOIN \`users\` u ON u.id = c.userId
       WHERE c.date >= ? AND c.date <= ?
       GROUP BY c.userId, u.name, u.avatarUrl
       ORDER BY score DESC, checkInCount DESC
       LIMIT 3`,
      [weekStart, weekEnd]
    );
    return (rows as any[]).map((row: any) => ({
      userId: row.userId as number,
      firstName: (row.name as string || "Friend").split(" ")[0],
      avatarUrl: (row.avatarUrl as string | null) ?? null,
      checkInCount: Number(row.checkInCount),
      avgRating: Number(row.avgRating),
      score: Number(row.score),
    }));
  } finally {
    conn.release();
  }
}

export async function getCommunityMessages(opts: { beforeId?: number; limit?: number } = {}): Promise<Array<{
  id: number;
  userId: number;
  firstName: string;
  avatarUrl: string | null;
  content: string;
  isDeleted: boolean;
  deletedByAdmin: boolean;
  reactions: Record<string, number[]>;
  flagCount: number;
  createdAt: Date;
}>> {
  const pool = getPool();
  if (!pool) return [];
  const conn = await pool.getConnection();
  const limit = opts.limit ?? 50;
  try {
    let query: string;
    let params: any[];
    if (opts.beforeId) {
      query = `SELECT m.id, m.userId, m.content, m.isDeleted, m.deletedByAdmin, m.reactions, m.flagCount, m.createdAt, u.name, u.avatarUrl
               FROM \`community_messages\` m
               JOIN \`users\` u ON u.id = m.userId
               WHERE m.id < ?
               ORDER BY m.createdAt DESC
               LIMIT ?`;
      params = [opts.beforeId, limit];
    } else {
      query = `SELECT m.id, m.userId, m.content, m.isDeleted, m.deletedByAdmin, m.reactions, m.flagCount, m.createdAt, u.name, u.avatarUrl
               FROM \`community_messages\` m
               JOIN \`users\` u ON u.id = m.userId
               ORDER BY m.createdAt DESC
               LIMIT ?`;
      params = [limit];
    }
    const [rows] = await conn.query(query, params);
    return (rows as any[]).reverse().map((row: any) => {
      let reactions: Record<string, number[]> = {};
      try {
        if (row.reactions) {
          reactions = typeof row.reactions === "string" ? JSON.parse(row.reactions) : row.reactions;
        }
      } catch { reactions = {}; }
      return {
        id: row.id as number,
        userId: row.userId as number,
        firstName: (row.name as string || "Friend").split(" ")[0],
        avatarUrl: (row.avatarUrl as string | null) ?? null,
        content: row.content as string,
        isDeleted: !!(row.isDeleted),
        deletedByAdmin: !!(row.deletedByAdmin),
        reactions,
        flagCount: (row.flagCount as number) ?? 0,
        createdAt: row.createdAt as Date,
      };
    });
  } finally {
    conn.release();
  }
}

export async function sendCommunityMessage(userId: number, content: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO \`community_messages\` (userId, content) VALUES (?, ?)`,
      [userId, content]
    );
  } finally {
    conn.release();
  }
}

export async function deleteCommunityMessage(messageId: number, userId: number): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `UPDATE \`community_messages\` SET isDeleted = 1 WHERE id = ? AND userId = ?`,
      [messageId, userId]
    );
  } finally {
    conn.release();
  }
}

export async function adminDeleteCommunityMessage(messageId: number): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `UPDATE \`community_messages\` SET isDeleted = 1, deletedByAdmin = 1 WHERE id = ?`,
      [messageId]
    );
  } finally {
    conn.release();
  }
}

export async function toggleMessageReaction(messageId: number, userId: number, emoji: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT reactions FROM \`community_messages\` WHERE id = ? LIMIT 1`,
      [messageId]
    );
    const row = (rows as any[])[0];
    if (!row) return;
    let reactions: Record<string, number[]> = {};
    try {
      if (row.reactions) {
        reactions = typeof row.reactions === "string" ? JSON.parse(row.reactions) : row.reactions;
      }
    } catch { reactions = {}; }
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(userId);
    if (idx >= 0) {
      reactions[emoji].splice(idx, 1);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji].push(userId);
    }
    await conn.query(
      `UPDATE \`community_messages\` SET reactions = ? WHERE id = ?`,
      [JSON.stringify(reactions), messageId]
    );
  } finally {
    conn.release();
  }
}

export async function flagCommunityMessage(messageId: number): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `UPDATE \`community_messages\` SET flagCount = flagCount + 1 WHERE id = ?`,
      [messageId]
    );
  } finally {
    conn.release();
  }
}

export async function isUserAdmin(userId: number): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT role FROM \`users\` WHERE id = ? LIMIT 1`,
      [userId]
    );
    const row = (rows as any[])[0];
    return row?.role === "admin";
  } finally {
    conn.release();
  }
}

export async function getUserTotalCheckIns(userId: number): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT COUNT(*) as cnt FROM \`daily_check_ins\` WHERE userId = ?`,
      [userId]
    );
    return (rows as any[])[0]?.cnt ?? 0;
  } finally {
    conn.release();
  }
}

// ─── Push Notification Subscriptions ─────────────────────────────────────────

export async function savePushSubscription(
  userId: number,
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    // Upsert — endpoint is unique per browser/device
    await conn.query(
      `INSERT INTO \`push_subscriptions\` (userId, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth), userId = VALUES(userId)`,
      [userId, endpoint, p256dh, auth]
    );
  } finally {
    conn.release();
  }
}

export async function deletePushSubscription(userId: number, endpoint: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `DELETE FROM \`push_subscriptions\` WHERE userId = ? AND endpoint = ?`,
      [userId, endpoint]
    );
  } finally {
    conn.release();
  }
}

export async function getUserPushSubscriptions(userId: number): Promise<Array<{
  endpoint: string;
  p256dh: string;
  auth: string;
}>> {
  const pool = getPool();
  if (!pool) return [];
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT endpoint, p256dh, auth FROM \`push_subscriptions\` WHERE userId = ?`,
      [userId]
    );
    return rows as any[];
  } finally {
    conn.release();
  }
}

export async function getAllPushSubscriptionsForReminders(): Promise<Array<{
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}>> {
  const pool = getPool();
  if (!pool) return [];
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT userId, endpoint, p256dh, auth FROM \`push_subscriptions\``
    );
    return rows as any[];
  } finally {
    conn.release();
  }
}
