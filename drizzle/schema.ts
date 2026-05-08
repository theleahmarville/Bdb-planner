import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  index,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  gender: mysqlEnum("gender", ["female", "male", "other"]).default("other"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Annual planning data (one per user per year)
export const annualPlans = mysqlTable("annual_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  year: int("year").notNull(),
  // Life categories (Becoming section)
  professional: text("professional"),
  finance: text("finance"),
  learning: text("learning"),
  wellness: text("wellness"),
  relationships: text("relationships"),
  community: text("community"),
  creativity: text("creativity"),
  spirit: text("spirit"),
  // Basic needs & non-negotiables
  basicNeeds: json("basicNeeds"), // { relationships, career, wellness, finance }
  nonNegotiables: json("nonNegotiables"), // { relationships, career, wellness, finance }
  // Annual budget
  annualBudget: json("annualBudget"), // { livingExpenses, personalExpenses, savings, investment, entertainment, oneTime }
  // Who am I venn diagram
  knowledgeSkills: text("knowledgeSkills"),
  passionsCallings: text("passionsCallings"),
  naturalGifts: text("naturalGifts"),
  problemsToSolve: text("problemsToSolve"),
  vennOverlap: text("vennOverlap"),
  // Vision board
  visionBoardContent: text("visionBoardContent"),
  // Personal presentation
  missionStatement: text("missionStatement"),
  elevatorPitch: text("elevatorPitch"),
  // Personal contract
  contractName: text("contractName"),
  contractBe: text("contractBe"),
  contractDo: text("contractDo"),
  contractBecome: text("contractBecome"),
  contractGoals: json("contractGoals"), // array of 5 strings
  // Transformation timeline
  transformationTimeline: json("transformationTimeline"), // { jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec }
  // Notion integration
  notionDatabaseId: varchar("notionDatabaseId", { length: 128 }),
  notionToken: text("notionToken"),
  // Google Calendar
  googleCalendarId: varchar("googleCalendarId", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("annual_plans_userId_idx").on(table.userId),
}));

export type AnnualPlan = typeof annualPlans.$inferSelect;

// Big goals (6 per year)
export const bigGoals = mysqlTable("big_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  year: int("year").notNull(),
  position: int("position").notNull(), // 1-6
  title: text("title"),
  description: text("description"),
  steps: json("steps"), // array of 5 strings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("big_goals_userId_idx").on(table.userId),
}));

export type BigGoal = typeof bigGoals.$inferSelect;

// Monthly plans
export const monthlyPlans = mysqlTable("monthly_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(), // 1-12
  // Monthly intro
  themeWord: text("themeWord"),
  wellnessHabit: text("wellnessHabit"),
  wellnessMinutes: int("wellnessMinutes"),
  // Monthly lists
  todos: text("todos"),
  financialTargets: text("financialTargets"),
  shoppingList: text("shoppingList"),
  // Budget
  livingExpenses: text("livingExpenses"),
  personalExpenses: text("personalExpenses"),
  savings: text("savings"),
  investment: text("investment"),
  entertainment: text("entertainment"),
  oneTimeExpenses: text("oneTimeExpenses"),
  // Goals
  businessCareerGoals: text("businessCareerGoals"),
  wellnessGoals: text("wellnessGoals"),
  bookOfMonth: text("bookOfMonth"),
  birthdays: text("birthdays"),
  actsOfKindness: text("actsOfKindness"),
  // Social media management
  socialFollowers: json("socialFollowers"), // { facebook, instagram, twitter, tiktok, threads, pinterest }
  socialCampaigns: text("socialCampaigns"),
  socialCollaborations: text("socialCollaborations"),
  // Social media content map
  contentMapMonth: text("contentMapMonth"),
  contentMapPlatforms: json("contentMapPlatforms"),
  contentMapObjectives: json("contentMapObjectives"), // array of {goal, targetDate}
  contentMapCampaigns: json("contentMapCampaigns"), // array of {name, product, date, platforms, goal}
  contentMapPillars: json("contentMapPillars"), // array of {pillar, contentTypes}
  contentMapNotes: text("contentMapNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("monthly_plans_userId_idx").on(table.userId),
  userYearMonthIdx: index("monthly_plans_userId_year_month_idx").on(table.userId, table.year, table.month),
}));

export type MonthlyPlan = typeof monthlyPlans.$inferSelect;

// Weekly plans
export const weeklyPlans = mysqlTable("weekly_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  year: int("year").notNull(),
  weekNumber: int("weekNumber").notNull(), // ISO week number
  weekStartDate: varchar("weekStartDate", { length: 10 }).notNull(), // YYYY-MM-DD
  // Left panel
  wordOfWeek: text("wordOfWeek"),
  affirmation: text("affirmation"),
  bibleVerse: text("bibleVerse"),
  bibleReference: text("bibleReference"),
  topBusinessGoals: text("topBusinessGoals"),
  weekIntentions: text("weekIntentions"),
  wellnessTasks: text("wellnessTasks"),
  // Right panel
  moneyEarned: text("moneyEarned"),
  moneySpent: text("moneySpent"),
  winsOfWeek: text("winsOfWeek"),
  notes: text("notes"),
  // Social media posts (per day)
  socialPosts: json("socialPosts"), // { mon, tue, wed, thu, fri, sat, sun }
  // Habit tracker (per habit per day)
  habitTracker: json("habitTracker"), // { vitamins: [bool x7], exercise: [bool x7], meditation: [bool x7], custom1: { name, days: [bool x7] }, custom2: ... }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("weekly_plans_userId_idx").on(table.userId),
  userYearWeekIdx: index("weekly_plans_userId_year_week_idx").on(table.userId, table.year, table.weekNumber),
}));

export type WeeklyPlan = typeof weeklyPlans.$inferSelect;

// Daily entries (one per day)
export const dailyEntries = mysqlTable("daily_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  // Top priorities
  topPriorities: json("topPriorities"), // array of strings
  // Time slots (6:00am - 7:00pm, 30-min increments = 26 slots)
  timeSlots: json("timeSlots"), // { "06:00": "text", "06:30": "text", ... }
  // Gratitude
  gratitude: json("gratitude"), // array of 5 strings
  // Daily wins
  dailyWins: json("dailyWins"), // array of 5 strings
  // Water intake
  waterGlasses: int("waterGlasses").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("daily_entries_userId_idx").on(table.userId),
  userDateIdx: index("daily_entries_userId_date_idx").on(table.userId, table.date),
}));

export type DailyEntry = typeof dailyEntries.$inferSelect;

// Content calendar weekly entries
export const contentCalendarEntries = mysqlTable("content_calendar_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  weekNum: int("weekNum").notNull(), // 1-4
  entries: json("entries"), // array of { day, platform, contentType, captionHook, goal }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentCalendarEntry = typeof contentCalendarEntries.$inferSelect;

// Notes (Apple Notes-style)
export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 512 }).notNull().default("Untitled"),
  content: text("content").notNull().default(""),
  folder: varchar("folder", { length: 128 }).notNull().default("All Notes"),
  pinned: boolean("pinned").notNull().default(false),
  isLocked: boolean("isLocked").notNull().default(false),
  lockPasswordHash: text("lockPasswordHash"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("notes_userId_idx").on(table.userId),
  userFolderIdx: index("notes_userId_folder_idx").on(table.userId, table.folder),
}));

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// Reminders
export const reminders = mysqlTable("reminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  reminderAt: timestamp("reminderAt").notNull(), // UTC datetime to fire
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  timeSlot: varchar("timeSlot", { length: 5 }), // HH:MM (optional)
  notifyBrowser: boolean("notifyBrowser").default(true).notNull(),
  notifySlack: boolean("notifySlack").default(false).notNull(),
  sent: boolean("sent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("reminders_userId_idx").on(table.userId),
  userSentIdx: index("reminders_userId_sent_idx").on(table.userId, table.sent),
}));

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;

// User integrations (Google Calendar OAuth tokens, Slack webhook)
export const userIntegrations = mysqlTable("user_integrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Slack
  slackWebhookUrl: text("slackWebhookUrl"),
  slackChannelName: varchar("slackChannelName", { length: 128 }),
  // Google Calendar (OAuth)
  googleAccessToken: text("googleAccessToken"),
  googleRefreshToken: text("googleRefreshToken"),
  googleTokenExpiry: timestamp("googleTokenExpiry"),
  googleCalendarId: varchar("googleCalendarId", { length: 256 }),
  // Notion
  notionToken: text("notionToken"),
  notionDatabaseId: varchar("notionDatabaseId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserIntegration = typeof userIntegrations.$inferSelect;

// Vision board images
export const visionBoardImages = mysqlTable("vision_board_images", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  year: int("year").notNull(),
  imageUrl: text("imageUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  caption: varchar("caption", { length: 256 }).default(""),
  position: int("position").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("vision_board_images_userId_idx").on(table.userId),
}));

export type VisionBoardImage = typeof visionBoardImages.$inferSelect;

// Section attachments (PDFs and files attached to any planner section)
export const sectionAttachments = mysqlTable("section_attachments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  section: varchar("section", { length: 64 }).notNull(), // 'annual' | 'monthly' | 'weekly'
  sectionKey: varchar("sectionKey", { length: 128 }).notNull(), // e.g. 'annual-2026-biggoals', 'monthly-2026-3-budget'
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 256 }).notNull(),
  fileType: varchar("fileType", { length: 64 }).notNull(), // 'pdf' | 'image' | etc.
  fileSizeBytes: int("fileSizeBytes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userSectionIdx: index("section_attachments_userId_section_idx").on(table.userId, table.section),
}));

export type SectionAttachment = typeof sectionAttachments.$inferSelect;

// Social media accounts linked by user
export const socialAccounts = mysqlTable("social_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: varchar("platform", { length: 32 }).notNull(), // 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'threads' | 'pinterest' | 'youtube'
  handle: varchar("handle", { length: 128 }),
  profileUrl: varchar("profileUrl", { length: 512 }),
  displayName: varchar("displayName", { length: 128 }),
  followerCount: int("followerCount"),
  connected: boolean("connected").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialAccount = typeof socialAccounts.$inferSelect;

// Note attachments (photos and PDFs attached to notes)
export const noteAttachments = mysqlTable("note_attachments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  noteId: int("noteId").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 256 }).notNull(),
  fileType: varchar("fileType", { length: 64 }).notNull(), // 'image/jpeg' | 'image/png' | 'application/pdf' | etc.
  fileSizeBytes: int("fileSizeBytes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  noteIdIdx: index("note_attachments_noteId_idx").on(table.noteId),
}));

export type NoteAttachment = typeof noteAttachments.$inferSelect;

// Zion AI chat messages
export const zionMessages = mysqlTable("zion_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  // JSON metadata: { parsedItems?: ParsedPlannerItem[], actionsTaken?: string[], isVoice?: boolean }
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("zion_messages_userId_idx").on(table.userId),
}));
export type ZionMessage = typeof zionMessages.$inferSelect;
export type InsertZionMessage = typeof zionMessages.$inferInsert;

// Zion Nightly Reflection entries
export const nightReflections = mysqlTable("night_reflections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  // Three desire entries — each has a category label + the desire text
  category1: varchar("category1", { length: 128 }), // e.g. "Career", "Health", "Relationships"
  desire1: text("desire1"),
  category2: varchar("category2", { length: 128 }),
  desire2: text("desire2"),
  category3: varchar("category3", { length: 128 }),
  desire3: text("desire3"),
  // Optional negative thought + Zion-guided reframe
  negativeThought: text("negativeThought"),
  reframe: text("reframe"),
  // Zion's personalised closing message for the night
  zionMessage: text("zionMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type NightReflection = typeof nightReflections.$inferSelect;
export type InsertNightReflection = typeof nightReflections.$inferInsert;

// Daily Bible Verse & Affirmation (one per user per day)
export const dailyDevotions = mysqlTable("daily_devotions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  verse: text("verse").notNull(),          // Full verse text
  verseRef: varchar("verseRef", { length: 128 }).notNull(), // e.g. "Philippians 4:13"
  affirmation: text("affirmation").notNull(), // AI-generated personal affirmation
  theme: varchar("theme", { length: 128 }),   // e.g. "Strength", "Purpose", "Peace"
  dismissed: boolean("dismissed").default(false).notNull(),
  savedToPlanner: boolean("savedToPlanner").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DailyDevotion = typeof dailyDevotions.$inferSelect;
export type InsertDailyDevotion = typeof dailyDevotions.$inferInsert;
