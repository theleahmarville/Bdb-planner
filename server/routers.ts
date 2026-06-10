import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getAnnualPlan,
  upsertAnnualPlan,
  getBigGoals,
  upsertBigGoal,
  getMonthlyPlan,
  upsertMonthlyPlan,
  getWeeklyPlan,
  upsertWeeklyPlan,
  getDailyEntry,
  upsertDailyEntry,
  getContentCalendar,
  upsertContentCalendar,
  getNotes,
  getNoteById,
  searchNotes,
  createNote,
  updateNote,
  deleteNote,
  getNoteFolders,
  getUserIntegrations,
  upsertUserIntegrations,
  getDailyEntriesForYear,
  setNoteLock,
  removeNoteLock,
  getNotePasswordHash,
  getVisionBoardImages,
  addVisionBoardImage,
  updateVisionBoardImageCaption,
  deleteVisionBoardImage,
  getDailyDigestData,
  getWeeklyDigestData,
  getSectionAttachments,
  addSectionAttachment,
  deleteSectionAttachment,
  getSocialAccounts,
  upsertSocialAccount,
  deleteSocialAccount,
  getNoteAttachments,
  addNoteAttachment,
  deleteNoteAttachment,
  getZionHistory,
  saveZionMessage,
  clearZionHistory,
  getUserPlannerContext,
  getReminders,
  createReminder,
  deleteReminder,
  markReminderSent,
  globalSearch,
  upsertDailyCheckIn,
  getMyCheckIn,
  getTodayLeaderboard,
  getWeeklyTopPerformers,
  getCommunityMessages,
  sendCommunityMessage,
  deleteCommunityMessage,
  adminDeleteCommunityMessage,
  toggleMessageReaction,
  flagCommunityMessage,
  isUserAdmin,
  savePushSubscription,
  deletePushSubscription,
  getUserPushSubscriptions,
  getUserByEmail,
  upsertUser,
  getUserStreak,
  getLastStreakNotification,
} from "./db";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";

// ─── Shared validators ────────────────────────────────────────────────────────
const zYear = z.number().int().min(2020).max(2030);
const zMonth = z.number().int().min(1).max(12);
const zWeekNumber = z.number().int().min(1).max(53);
const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
const zLongText = z.string().max(10000);
const zShortText = z.string().max(500);

// ─── Annual Router ────────────────────────────────────────────────────────────
const annualRouter = router({
  get: protectedProcedure
    .input(z.object({ year: zYear }))
    .query(async ({ ctx, input }) => {
      return getAnnualPlan(ctx.user.id, input.year);
    }),

  save: protectedProcedure
    .input(
      z.object({
        year: zYear,
        data: z.object({
          professional: zLongText.optional(),
          finance: zLongText.optional(),
          learning: zLongText.optional(),
          wellness: zLongText.optional(),
          relationships: zLongText.optional(),
          community: zLongText.optional(),
          creativity: zLongText.optional(),
          spirit: zLongText.optional(),
          basicNeeds: z.any().optional(),
          nonNegotiables: z.any().optional(),
          annualBudget: z.any().optional(),
          knowledgeSkills: zLongText.optional(),
          passionsCallings: zLongText.optional(),
          naturalGifts: zLongText.optional(),
          problemsToSolve: zLongText.optional(),
          vennOverlap: zLongText.optional(),
          visionBoardContent: zLongText.optional(),
          missionStatement: zLongText.optional(),
          elevatorPitch: zLongText.optional(),
          contractName: zShortText.optional(),
          contractBe: zLongText.optional(),
          contractDo: zLongText.optional(),
          contractBecome: zLongText.optional(),
          contractGoals: z.any().optional(),
          transformationTimeline: z.any().optional(),
          notionDatabaseId: zShortText.optional(),
          notionToken: zShortText.optional(),
          googleCalendarId: zShortText.optional(),
          visionBoardPinterest: zLongText.optional(),
          visionBoardCoverUrl: zLongText.optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertAnnualPlan(ctx.user.id, input.year, input.data);
      return { success: true };
    }),
});

// ─── Big Goals Router ─────────────────────────────────────────────────────────
const bigGoalsRouter = router({
  list: protectedProcedure
    .input(z.object({ year: zYear }))
    .query(async ({ ctx, input }) => {
      return getBigGoals(ctx.user.id, input.year);
    }),

  save: protectedProcedure
    .input(
      z.object({
        year: zYear,
        position: z.number().int().min(1).max(6),
        title: zShortText.optional(),
        description: zLongText.optional(),
        steps: z.array(zLongText).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { year, position, ...data } = input;
      await upsertBigGoal(ctx.user.id, year, position, data);
      return { success: true };
    }),
});

// ─── Monthly Router ───────────────────────────────────────────────────────────
const monthlyRouter = router({
  get: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ ctx, input }) => {
      return getMonthlyPlan(ctx.user.id, input.year, input.month);
    }),

  save: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number(),
        data: z.object({
          themeWord: z.string().optional(),
          wellnessHabit: z.string().optional(),
          wellnessMinutes: z.number().optional(),
          todos: z.string().optional(),
          financialTargets: z.string().optional(),
          shoppingList: z.string().optional(),
          livingExpenses: z.string().optional(),
          personalExpenses: z.string().optional(),
          savings: z.string().optional(),
          investment: z.string().optional(),
          entertainment: z.string().optional(),
          oneTimeExpenses: z.string().optional(),
          businessCareerGoals: z.string().optional(),
          wellnessGoals: z.string().optional(),
          bookOfMonth: z.string().optional(),
          birthdays: z.string().optional(),
          actsOfKindness: z.string().optional(),
          socialFollowers: z.any().optional(),
          socialCampaigns: z.string().optional(),
          socialCollaborations: z.string().optional(),
          contentMapMonth: z.string().optional(),
          contentMapPlatforms: z.any().optional(),
          contentMapObjectives: z.any().optional(),
          contentMapCampaigns: z.any().optional(),
          contentMapPillars: z.any().optional(),
          contentMapNotes: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertMonthlyPlan(ctx.user.id, input.year, input.month, input.data);
      return { success: true };
    }),
});

// ─── Weekly Router ────────────────────────────────────────────────────────────
const weeklyRouter = router({
  get: protectedProcedure
    .input(z.object({ year: z.number(), weekNumber: z.number() }))
    .query(async ({ ctx, input }) => {
      return getWeeklyPlan(ctx.user.id, input.year, input.weekNumber);
    }),

  save: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        weekNumber: z.number(),
        weekStartDate: z.string(),
        data: z.object({
          wordOfWeek: z.string().optional(),
          affirmation: z.string().optional(),
          bibleVerse: z.string().optional(),
          bibleReference: z.string().optional(),
          topBusinessGoals: z.string().optional(),
          weekIntentions: z.string().optional(),
          wellnessTasks: z.string().optional(),
          moneyEarned: z.string().optional(),
          moneySpent: z.string().optional(),
          winsOfWeek: z.string().optional(),
          notes: z.string().optional(),
          socialPosts: z.any().optional(),
          habitTracker: z.any().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { year, weekNumber, weekStartDate, data } = input;
      await upsertWeeklyPlan(ctx.user.id, year, weekNumber, weekStartDate, data);
      return { success: true };
    }),
});

// ─── Daily Router ─────────────────────────────────────────────────────────────
const dailyRouter = router({
  get: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      return getDailyEntry(ctx.user.id, input.date);
    }),

  listYear: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => {
      return getDailyEntriesForYear(ctx.user.id, input.year);
    }),
  save: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        data: z.object({
          topPriorities: z.any().optional(),
          timeSlots: z.any().optional(),
          gratitude: z.any().optional(),
          dailyWins: z.any().optional(),
          waterGlasses: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertDailyEntry(ctx.user.id, input.date, input.data);
      return { success: true };
    }),
});

// ─── Content Calendar Router ──────────────────────────────────────────────────
const contentCalendarRouter = router({
  get: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number(), weekNum: z.number() }))
    .query(async ({ ctx, input }) => {
      return getContentCalendar(ctx.user.id, input.year, input.month, input.weekNum);
    }),

  save: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number(),
        weekNum: z.number(),
        entries: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertContentCalendar(ctx.user.id, input.year, input.month, input.weekNum, input.entries);
      return { success: true };
    }),
});

// ─── Notes Router ───────────────────────────────────────────────────────────
const notesRouter = router({
  list: protectedProcedure
    .input(z.object({ folder: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return getNotes(ctx.user.id, input.folder);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return getNoteById(ctx.user.id, input.id);
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      return searchNotes(ctx.user.id, input.query);
    }),

  folders: protectedProcedure.query(async ({ ctx }) => {
    return getNoteFolders(ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().default("Untitled"),
        content: z.string().default(""),
        folder: z.string().default("All Notes"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const note = await createNote(ctx.user.id, input.title, input.content, input.folder);
      return note;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        folder: z.string().optional(),
        pinned: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateNote(ctx.user.id, id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteNote(ctx.user.id, input.id);
      return { success: true };
    }),
  lock: protectedProcedure
    .input(z.object({ id: z.number(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const hash = await bcrypt.hash(input.password, 10);
      await setNoteLock(ctx.user.id, input.id, hash);
      return { success: true };
    }),
  verifyLock: protectedProcedure
    .input(z.object({ id: z.number(), password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const hash = await getNotePasswordHash(ctx.user.id, input.id);
      if (!hash) return { valid: false };
      const valid = await bcrypt.compare(input.password, hash);
      return { valid };
    }),
  removeLock: protectedProcedure
    .input(z.object({ id: z.number(), password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const hash = await getNotePasswordHash(ctx.user.id, input.id);
      if (!hash) return { success: false, error: "Note is not locked" };
      const valid = await bcrypt.compare(input.password, hash);
      if (!valid) return { success: false, error: "Incorrect password" };
      await removeNoteLock(ctx.user.id, input.id);
      return { success: true };
    }),
  listAttachments: protectedProcedure
    .input(z.object({ noteId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getNoteAttachments(ctx.user.id, input.noteId);
    }),
  deleteAttachment: protectedProcedure
    .input(z.object({ attachmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteNoteAttachment(ctx.user.id, input.attachmentId);
      return { success: true };
    }),
  addAttachment: protectedProcedure
    .input(z.object({
      noteId: z.number(),
      fileUrl: z.string(),
      fileKey: z.string(),
      fileName: z.string(),
      fileType: z.string(),
      fileSizeBytes: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await addNoteAttachment({ userId: ctx.user.id, ...input });
      return { success: true };
    }),
});
// ─── Integrations Routerr ─────────────────────────────────────────────────────
const integrationsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return await getUserIntegrations(ctx.user.id) ?? null;
  }),
  save: protectedProcedure
    .input(z.object({
      slackWebhookUrl: z.string().optional(),
      slackChannelName: z.string().optional(),
      googleCalendarId: z.string().optional(),
      googleAccessToken: z.string().optional(),
      googleRefreshToken: z.string().optional(),
      notionToken: z.string().optional(),
      notionDatabaseId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertUserIntegrations(ctx.user.id, input);
      return { success: true };
    }),
  clear: protectedProcedure
    .input(z.object({ field: z.enum(["slack", "google", "notion"]) }))
    .mutation(async ({ ctx, input }) => {
      const clearMap: Record<string, object> = {
        slack: { slackWebhookUrl: null, slackChannelName: null },
        google: { googleAccessToken: null, googleRefreshToken: null, googleCalendarId: null, googleTokenExpiry: null },
        notion: { notionToken: null, notionDatabaseId: null },
      };
      await upsertUserIntegrations(ctx.user.id, clearMap[input.field] as any);
      return { success: true };
    }),
});

// ─── Vision Board Router ─────────────────────────────────────────────────────
const visionBoardRouter = router({
  listImages: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => getVisionBoardImages(ctx.user.id, input.year)),

  addImage: protectedProcedure
    .input(z.object({
      year: z.number(),
      imageUrl: z.string(),
      fileKey: z.string(),
      caption: z.string().optional(),
      position: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await addVisionBoardImage(ctx.user.id, input.year, input);
      return { success: true };
    }),

  updateCaption: protectedProcedure
    .input(z.object({ id: z.number(), caption: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await updateVisionBoardImageCaption(input.id, ctx.user.id, input.caption);
      return { success: true };
    }),

  deleteImage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteVisionBoardImage(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ─── Attachments Router ───────────────────────────────────────────────────────
const attachmentsRouter = router({
  list: protectedProcedure
    .input(z.object({ sectionKey: z.string() }))
    .query(async ({ ctx, input }) => getSectionAttachments(ctx.user.id, input.sectionKey)),

  add: protectedProcedure
    .input(z.object({
      section: z.string(),
      sectionKey: z.string(),
      fileUrl: z.string(),
      fileKey: z.string(),
      fileName: z.string(),
      fileType: z.string(),
      fileSizeBytes: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await addSectionAttachment(ctx.user.id, input);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSectionAttachment(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ─── Social Accounts Router ───────────────────────────────────────────────────
const socialAccountsRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => getSocialAccounts(ctx.user.id)),

  upsert: protectedProcedure
    .input(z.object({
      platform: z.string(),
      handle: z.string().optional(),
      profileUrl: z.string().optional(),
      displayName: z.string().optional(),
      followerCount: z.number().optional(),
      connected: z.boolean().optional(),
      lastPostLikes: z.number().optional(),
      lastPostComments: z.number().optional(),
      lastPostReach: z.number().optional(),
      lastPostDate: z.string().optional(),
      avgLikes: z.number().optional(),
      avgReach: z.number().optional(),
      engagementRate: z.number().optional(),
      contentNiche: z.string().optional(),
      contentGoal: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertSocialAccount(ctx.user.id, input);
      return { success: true };
    }),

  disconnect: protectedProcedure
    .input(z.object({ platform: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSocialAccount(ctx.user.id, input.platform);
      return { success: true };
    }),

  getContentStrategy: protectedProcedure
    .input(z.object({
      weeklyPosts: z.record(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const accounts = await getSocialAccounts(ctx.user.id);
      const connected = accounts.filter((a: any) => a.connected);
      if (connected.length === 0) {
        return { strategy: "Connect at least one social media account first, then come back for your strategy!" };
      }

      const { invokeLLM } = await import("./_core/llm");

      const accountSummary = connected.map((a: any) => {
        const lines = [`${a.platform.toUpperCase()} (${a.handle || a.profileUrl || "linked"})`];
        if (a.followerCount) lines.push(`  Followers: ${a.followerCount.toLocaleString()}`);
        if (a.contentNiche) lines.push(`  Niche: ${a.contentNiche}`);
        if (a.contentGoal) lines.push(`  Goal: ${a.contentGoal}`);
        if (a.lastPostLikes != null || a.lastPostComments != null) {
          lines.push(`  Last post: ${a.lastPostLikes ?? "?"} likes, ${a.lastPostComments ?? "?"} comments${a.lastPostReach ? `, ${a.lastPostReach} reach` : ""}`);
        }
        if (a.avgLikes != null) lines.push(`  Avg likes per post: ${a.avgLikes}`);
        if (a.engagementRate != null) lines.push(`  Engagement rate: ${a.engagementRate}%`);
        if (a.lastPostDate) lines.push(`  Last posted: ${a.lastPostDate}`);
        return lines.join("\n");
      }).join("\n\n");

      const postsSummary = input.weeklyPosts
        ? Object.entries(input.weeklyPosts)
            .filter(([, v]) => v?.trim())
            .map(([k, v]) => `- ${k}: ${v}`)
            .join("\n")
        : "No posts planned yet this week";

      // Check if any account actually has stats entered
      const hasAnyStats = connected.some((a: any) =>
        a.followerCount || a.lastPostLikes != null || a.engagementRate != null || a.contentNiche || a.contentGoal
      );

      const prompt = hasAnyStats
        ? `You are Zion, a sharp social media strategist and wellness coach for the Be Do Become platform.

Here is this creator's social media data:

${accountSummary}

Their planned posts this week:
${postsSummary}

Based on this data, give a focused, personalised content strategy. Include:
1. What content type is performing best (reference their actual engagement numbers)
2. The single best platform to prioritise this week and why
3. 2-3 specific post ideas tailored to their niche and goal
4. Best posting frequency and timing for their audience
5. One concrete growth action for this week

Be direct, specific, encouraging. Under 300 words. Reference their actual numbers. No generic advice.`
        : `You are Zion, a sharp social media strategist and wellness coach for the Be Do Become platform.

This creator has connected the following social media accounts:

${accountSummary}

Their planned posts this week:
${postsSummary}

They haven't added their stats yet. Give them a powerful, practical content strategy for their platform(s). Include:
1. The best content format to lead with on their platform right now (Reels, carousels, Stories, etc.) and why
2. 3 specific post ideas that would perform well in the wellness/lifestyle/entrepreneurship space
3. The ideal posting schedule (days and times) for maximum reach on their platform
4. One immediate growth action they can take this week to attract their ideal audience
5. What stats to start tracking so Zion can sharpen the strategy next time

Be direct, inspiring, and platform-specific. Under 300 words. Make every word count — this is their roadmap.`;

      const response = await invokeLLM({
        messages: [{ role: "user", content: prompt }],
        maxTokens: 500,
      });

      return {
        strategy: String(response.choices[0]?.message?.content || "").trim(),
      };
    }),
});

// ─── AI Digest Router ───────────────────────────────────────────────────────
const aiRouter = router({
  dailyDigest: protectedProcedure
    .input(z.object({
      date: z.string(),
      year: z.number(),
      month: z.number(),
      weekNumber: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { invokeLLM } = await import("./_core/llm");
      const data = await getDailyDigestData(
        ctx.user.id,
        input.date,
        input.year,
        input.month,
        input.weekNumber
      );

      // Build context summary for the LLM
      const prioritiesList = data.topPriorities.filter(Boolean).join(", ") || "None set";
      const appointmentsList = Object.entries(data.timeSlots)
        .filter(([, v]) => v && v.trim())
        .map(([time, title]) => `${time}: ${title}`)
        .join("; ") || "No appointments scheduled";
      const habitsStatus = Object.values(data.habits)
        .map((h: any) => h.name)
        .join(", ") || "None tracked";
      const goalsSnippet = data.bigGoals.slice(0, 3).map(g => g.title).join("; ") || "None set";

      const prompt = `You are a personal productivity coach for a wellness planner called "Be Do Become Wellness" by Leah Marville.

Today is ${input.date}. Here is the user's planner data:

**Today's Top Priorities:** ${prioritiesList}
**Today's Schedule/Appointments:** ${appointmentsList}
**Word of the Week:** ${data.weeklyWordOfWeek || "Not set"}
**Weekly Affirmation:** ${data.weeklyAffirmation || "Not set"}
**Weekly Intentions:** ${data.weeklyIntentions || "Not set"}
**Top Business Goals This Week:** ${data.weeklyTopGoals || "Not set"}
**Monthly Theme:** ${data.monthlyTheme || "Not set"}
**Monthly Goals:** ${data.monthlyGoals || "Not set"}
**Annual Big Goals:** ${goalsSnippet}
**Habits Being Tracked:** ${habitsStatus}
**Water Glasses Today:** ${data.waterGlasses}/8

Generate a warm, motivating Daily Digest for this person. Structure it as JSON with these exact fields:
- greeting: a short personalized good morning message (1 sentence, warm and encouraging)
- topPriorities: array of up to 3 most important things to focus on today (from their data, or gentle reminders if empty)
- upcomingAppointments: array of objects {time, title} for today's scheduled items (empty array if none)
- habitReminders: array of up to 3 habit nudges based on their tracked habits
- motivationalInsight: one powerful sentence of encouragement tied to their goals or theme
- quickWin: one small, specific action they can take in the next 15 minutes`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a warm, motivating personal productivity coach. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "daily_digest",
            strict: true,
            schema: {
              type: "object",
              properties: {
                greeting: { type: "string" },
                topPriorities: { type: "array", items: { type: "string" } },
                upcomingAppointments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { time: { type: "string" }, title: { type: "string" } },
                    required: ["time", "title"],
                    additionalProperties: false,
                  },
                },
                habitReminders: { type: "array", items: { type: "string" } },
                motivationalInsight: { type: "string" },
                quickWin: { type: "string" },
              },
              required: ["greeting", "topPriorities", "upcomingAppointments", "habitReminders", "motivationalInsight", "quickWin"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = String(response.choices[0]?.message?.content || "{}");
      return JSON.parse(content);
    }),
  weeklyDigest: protectedProcedure
    .input(z.object({
      year: z.number(),
      month: z.number(),
      weekNumber: z.number(),
      weekDates: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const { invokeLLM } = await import("./_core/llm");
      const data = await getWeeklyDigestData(
        ctx.user.id,
        input.year,
        input.month,
        input.weekNumber,
        input.weekDates
      );

      // Build appointments across the week
      const weekAppointments = data.dailyTimeSlots
        .flatMap(({ date, slots }) =>
          Object.entries(slots)
            .filter(([, v]) => v && v.trim())
            .map(([time, title]) => `${date} ${time}: ${title}`)
        )
        .join("; ") || "No appointments this week";

      // Build priorities across the week
      const weekPriorities = data.dailyPriorities
        .flatMap(({ date, priorities }) =>
          priorities.filter(Boolean).map((p) => `${date}: ${p}`)
        )
        .join("; ") || "No priorities set";

      // Habit completion summary
      const habitSummary = Object.values(data.habitTracker)
        .map((h: any) => {
          const done = (h.days as boolean[]).filter(Boolean).length;
          return `${h.name}: ${done}/7 days`;
        })
        .join(", ") || "No habits tracked";

      const goalsSnippet = data.bigGoals.slice(0, 3).map(g => g.title).join("; ") || "None set";

      const prompt = `You are a personal productivity coach for "Be Do Become Wellness" by Leah Marville.

This is Week ${input.weekNumber} of ${input.year}. Here is the user's planner data:

**Word of the Week:** ${data.wordOfWeek || "Not set"}
**Weekly Affirmation:** ${data.affirmation || "Not set"}
**Bible Verse:** ${data.bibleVerse || "Not set"}
**Weekly Intentions:** ${data.weekIntentions || "Not set"}
**Top Business Goals:** ${data.topBusinessGoals || "Not set"}
**Wellness Tasks:** ${data.wellnessTasks || "Not set"}
**This Week's Appointments:** ${weekAppointments}
**This Week's Priorities:** ${weekPriorities}
**Habit Progress:** ${habitSummary}
**Money Earned:** ${data.moneyEarned || "Not recorded"}
**Money Spent:** ${data.moneySpent || "Not recorded"}
**Monthly Theme:** ${data.monthlyTheme || "Not set"}
**Annual Big Goals:** ${goalsSnippet}

Generate a comprehensive Weekly Digest. Structure it as JSON with these exact fields:
- weekSummary: a 2-sentence overview of what this week looks like
- keyAppointments: array of up to 5 most important appointments {day, time, title}
- weeklyFocus: array of 3 top priorities to focus on this week
- habitInsights: array of 2-3 observations or encouragements about their habits
- financialSnapshot: one sentence about their financial week (if data available)
- goalAlignment: one sentence connecting this week's work to their bigger annual goals
- motivationalMessage: a powerful closing message to inspire the week ahead`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a warm, motivating personal productivity coach. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "weekly_digest",
            strict: true,
            schema: {
              type: "object",
              properties: {
                weekSummary: { type: "string" },
                keyAppointments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { day: { type: "string" }, time: { type: "string" }, title: { type: "string" } },
                    required: ["day", "time", "title"],
                    additionalProperties: false,
                  },
                },
                weeklyFocus: { type: "array", items: { type: "string" } },
                habitInsights: { type: "array", items: { type: "string" } },
                financialSnapshot: { type: "string" },
                goalAlignment: { type: "string" },
                motivationalMessage: { type: "string" },
              },
              required: ["weekSummary", "keyAppointments", "weeklyFocus", "habitInsights", "financialSnapshot", "goalAlignment", "motivationalMessage"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = String(response.choices[0]?.message?.content || "{}");
      return JSON.parse(content);
    }),
});
// ─── Zion AI Chat Router ─────────────────────────────────────────────────────
import { invokeLLM } from "./_core/llm";

const zionRouter = router({

  // ── Daily personalised greeting ───────────────────────────────────────────
  dailyGreeting: protectedProcedure
    .input(z.object({ timezone: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const userId = ctx.user.id;
    const context = await getUserPlannerContext(userId);

    // Get user's gender for pronoun-aware messaging
    const { getDb } = await import('./db');
    const { users } = await import('../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    const db = await getDb();
    const userRow = db ? (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0] : null;
    const gender = userRow?.gender ?? 'other';
    const firstName = ctx.user.name?.split(' ')[0] || 'friend';

    // Priority: 1) timezone sent by the browser (always accurate), 2) saved in profile, 3) UTC fallback
    // Railway runs in UTC so we must never use new Date().getHours() directly
    const userTimezone = input?.timezone || (userRow as any)?.timezone || 'UTC';
    let hour: number;
    try {
      hour = parseInt(
        new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: userTimezone }).format(new Date()),
        10
      );
    } catch {
      // Invalid timezone string — fall back to UTC
      hour = new Date().getUTCHours();
    }
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

    const pronounContext = gender === 'female'
      ? 'She uses she/her pronouns. Address her warmly as a woman.'
      : gender === 'male'
      ? 'He uses he/him pronouns. Address him warmly as a man.'
      : 'They use inclusive language. Keep the message gender-neutral.';

    const goalsSnippet = context.bigGoals.filter(g => g.title).slice(0, 3).map(g => g.title).join(', ');
    const winsSnippet = context.weeklyPlan?.winsOfWeek || '';
    const monthTheme = context.monthlyPlan?.themeWord || '';
    const habitsData = context.weeklyPlan?.habitTracker as any;
    const habitSummary = habitsData
      ? Object.entries(habitsData).map(([k, v]: [string, any]) => {
          const name = v?.name || k;
          const done = Array.isArray(v?.days) ? v.days.filter(Boolean).length : 0;
          return `${name} ${done}/7`;
        }).join(', ')
      : '';

    const prompt = `Write a SHORT (2-4 sentences MAX), warm, personalised good ${timeOfDay} message for ${firstName}.

${pronounContext}

Context about their life right now:
${goalsSnippet ? `- Working toward: ${goalsSnippet}` : ''}
${monthTheme ? `- This month's theme: ${monthTheme}` : ''}
${winsSnippet ? `- Recent wins: ${winsSnippet}` : ''}
${habitSummary ? `- Habit progress: ${habitSummary}` : ''}

Rules:
- Start with "Good ${timeOfDay}, ${firstName}!"
- Be specific to their actual goals/wins if available — make them feel SEEN
- Warm, encouraging, grounded — not generic or cheesy
- If no data yet, welcome them and encourage them to start their journey
- 2-4 sentences only. No bullet points. Plain text.`;

    const response = await invokeLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 200,
    });

    return {
      message: String(response.choices[0]?.message?.content || `Good ${timeOfDay}, ${firstName}! Ready to make today count?`).trim(),
      timeOfDay,
      firstName,
    };
  }),

  history: protectedProcedure.query(async ({ ctx }) => {
    return getZionHistory(ctx.user.id, 60);
  }),

  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    await clearZionHistory(ctx.user.id);
    return { success: true };
  }),

  chat: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(10000),
      isVoice: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Save the user message
      await saveZionMessage({ userId, role: "user", content: input.message, metadata: input.isVoice ? JSON.stringify({ isVoice: true }) : null });

      // Get rich planner context
      const context = await getUserPlannerContext(userId);
      const history = await getZionHistory(userId, 20);

      // ── Build rich context strings ────────────────────────────────────────
      const today = context.now.toISOString().slice(0, 10);
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

      const goalsContext = context.bigGoals.length
        ? context.bigGoals.map(g => `  • Goal ${g.position}: ${g.title || '(untitled)'}${g.description ? ` — ${g.description}` : ''}${Array.isArray(g.steps) && g.steps.filter(Boolean).length ? `\n    Steps: ${(g.steps as string[]).filter(Boolean).join(', ')}` : ''}`).join('\n')
        : '  (No annual goals set yet)';

      const monthlyContext = context.allMonthlyPlans.length
        ? context.allMonthlyPlans.map(m => {
            const parts = [];
            if (m.themeWord) parts.push(`Theme: ${m.themeWord}`);
            if (m.businessCareerGoals) parts.push(`Business goals: ${m.businessCareerGoals}`);
            if (m.wellnessGoals) parts.push(`Wellness goals: ${m.wellnessGoals}`);
            if (m.winsOfWeek) parts.push(`Wins: ${m.winsOfWeek}`);
            return parts.length ? `  ${monthNames[m.month-1]}: ${parts.join(' | ')}` : null;
          }).filter(Boolean).join('\n')
        : '  (No monthly plans logged yet)';

      const weeklyContext = context.weeklyPlan ? [
        context.weeklyPlan.wordOfWeek && `Word of week: ${context.weeklyPlan.wordOfWeek}`,
        context.weeklyPlan.weekIntentions && `Intentions: ${context.weeklyPlan.weekIntentions}`,
        context.weeklyPlan.topBusinessGoals && `Business goals: ${context.weeklyPlan.topBusinessGoals}`,
        context.weeklyPlan.winsOfWeek && `Wins: ${context.weeklyPlan.winsOfWeek}`,
        context.weeklyPlan.moneyEarned && `Money earned: ${context.weeklyPlan.moneyEarned}`,
        context.weeklyPlan.moneySpent && `Money spent: ${context.weeklyPlan.moneySpent}`,
        context.weeklyPlan.habitTracker && (() => {
          const ht = context.weeklyPlan!.habitTracker as any;
          const habits = [];
          const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
          for (const [key, val] of Object.entries(ht || {})) {
            if (!val) continue;
            const v = val as any;
            const name = v.name || key;
            const completed = Array.isArray(v.days) ? v.days.filter(Boolean).length : (Array.isArray(val) ? (val as boolean[]).filter(Boolean).length : 0);
            habits.push(`${name}: ${completed}/7 days`);
          }
          return habits.length ? `Habits this week: ${habits.join(', ')}` : null;
        })(),
      ].filter(Boolean).join('\n  ') : '  (No weekly plan for this week yet)';

      const dailyContext = context.recentDailyEntries.length
        ? context.recentDailyEntries.map(d => {
            const slots = d.timeSlots as Record<string, string> | null;
            const priorities = d.topPriorities as string[] | null;
            const parts = [];
            if (priorities?.filter(Boolean).length) parts.push(`priorities: ${priorities.filter(Boolean).join(', ')}`);
            if (slots) {
              const events = Object.entries(slots).filter(([,v]) => v).map(([k,v]) => `${k} ${v}`).join(', ');
              if (events) parts.push(`schedule: ${events}`);
            }
            return parts.length ? `  ${d.date}: ${parts.join(' | ')}` : null;
          }).filter(Boolean).join('\n')
        : '  (No daily entries in the past 7 days)';

      const remindersContext = context.upcomingReminders.length
        ? context.upcomingReminders.map(r => `  • ${r.date} at ${r.timeSlot || '?'}: ${r.title}`).join('\n')
        : '  (No upcoming reminders)';

      const notesContext = context.recentNotes.length
        ? context.recentNotes.map(n => `  • [${n.folder || 'General'}] ${n.title}: ${(n.content || '').slice(0, 100)}`).join('\n')
        : '  (No notes yet)';

      const systemPrompt = `You are Zion, a warm, encouraging, and deeply intuitive AI wellness assistant for the Be Do Become Wellness platform by Leah Marville. You have FULL ACCESS to the user's planner data and must use it intelligently in every response.

Today's date: ${today} (Week ${context.weekNumber} of ${context.year})

## YOUR PERSONALITY
- Warm, empathetic, and motivating — like a wise best friend who keeps you accountable
- You speak with gentle authority and wisdom
- You celebrate wins and reframe challenges as growth opportunities
- You use the Be Do Become framework: who you're BEING, what you're DOING, and who you're BECOMING

## FULL PLANNER DATA (use this to answer any question about the user's life, progress, and schedule)

### ANNUAL BIG GOALS (${context.year})
${goalsContext}

### MONTHLY PROGRESS (all months logged this year)
${monthlyContext}

### THIS WEEK (Week ${context.weekNumber}, starting ${context.weekStartDate})
${weeklyContext}

### LAST 7 DAYS (daily schedule & priorities)
${dailyContext}

### UPCOMING REMINDERS
${remindersContext}

### RECENT NOTES
${notesContext}

## HOW TO USE THIS DATA

**For "How is my year going?" or "Am I hitting my goals?":**
Look at the Annual Big Goals above. Cross-reference with monthly business/wellness goals and wins logged. Give a specific, honest assessment per goal — celebrate progress, flag what's falling behind, suggest one action per lagging goal.

**For "Summarize my week" or "How did my week go?":**
Look at "This Week" and "Last 7 Days" above. Summarize: what was scheduled, what priorities were set, habits completed, wins logged, money tracked. Be specific — mention actual items from their data.

**For "What do I have coming up?" or "What's on my calendar?":**
Reference the Upcoming Reminders and recent daily schedule data. List items clearly by date/time.

**For "What are my habits?" or habit check-ins:**
Reference the habit tracker data in "This Week". Give completion rates and encouragement.

## CRITICAL RULE — PLANNER_ACTIONS
Whenever the user shares ANY content that can be organized (goals, tasks, habits, events, reminders, ideas, wins, intentions), you MUST include a <PLANNER_ACTIONS> block at the END of your response. Do NOT ask for confirmation — just do it.

For REMINDERS specifically: ALWAYS include BOTH a 'reminder' action (creates the reminder + adds to calendar) AND optionally a 'schedule' action if a specific day/time is given. The reminder type automatically populates the Reminders section AND the daily calendar.

Response structure for brain dumps / action requests:
1. Warm 1-2 sentence acknowledgment
2. Structured summary (bullet points) of what you organised
3. ONE thoughtful follow-up question
4. PLANNER_ACTIONS block

For pure questions (summaries, progress checks), respond directly with your analysis — no PLANNER_ACTIONS needed unless you spot something to add.

<PLANNER_ACTIONS> block format (EXACT — valid JSON only, no extra text inside tags):
<PLANNER_ACTIONS>
{"actions":[{"type":"reminder","section":"reminders","content":"Go to the gym","reminderDate":"${today}","reminderTime":"18:00"},{"type":"schedule","section":"weekly","content":"Gym","day":"Today","time":"6:00 PM"}]}
</PLANNER_ACTIONS>

Valid action types:
- reminder → Reminders list + daily calendar. Fields: content, reminderDate (YYYY-MM-DD), reminderTime (HH:MM)
- schedule → Daily time slot. Fields: content, day ('Monday'…'Sunday'), time ('9:00 AM')
- calendar → Calendar entry by date. Fields: content, reminderDate (YYYY-MM-DD), time (HH:MM)
- goal → Annual Big Goals. Fields: content
- monthly_goal → Monthly goals. Fields: content, field ('businessCareerGoals' or 'wellnessGoals')
- priority → Daily top priorities. Fields: content, day
- habit → Habit tracker. Fields: content (habit name)
- intention → Weekly intentions. Fields: content
- win → Weekly wins. Fields: content
- budget → Monthly budget. Fields: content, budgetCategory ('savings','investment','living','personal','entertainment')
- social_post → Social media posts. Fields: content, day, platform ('Instagram','TikTok','Twitter',etc.)
- gratitude → Daily gratitude. Fields: content, day
- note → Notes. Fields: content, folder ('Ideas','Work','Personal','Goals','Health')

RULES:
1. Use REAL content from the user's message — never placeholder text
2. For reminders: reminderDate defaults to today (${today}) if not specified; reminderTime defaults to '09:00'
3. Be generous — extract every actionable item
4. Always reference actual planner data when answering questions about progress or schedule`;

      // Build message history for context
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-16).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: input.message },
      ];

      let response;
      try {
        response = await invokeLLM({ messages });
      } catch (llmErr: any) {
        console.error("[Zion] LLM call failed:", llmErr?.message || llmErr);
        throw new Error(`AI unavailable: ${llmErr?.message || "Unknown error"}`);
      }
      const rawContent = String(response.choices[0]?.message?.content || '');

      // Parse planner actions if present
      let plannerActions: Array<{ type: string; section: string; content: string; [key: string]: string }> = [];
      let displayContent = rawContent;
      const actionsMatch = rawContent.match(/<PLANNER_ACTIONS>([\s\S]*?)<\/PLANNER_ACTIONS>/);
      if (actionsMatch) {
        try {
          const parsed = JSON.parse(actionsMatch[1].trim());
          plannerActions = parsed.actions || [];
        } catch (err) { console.error("Failed to parse planner actions from Zion response:", err); }
        displayContent = rawContent.replace(/<PLANNER_ACTIONS>[\s\S]*?<\/PLANNER_ACTIONS>/, '').trim();
      }

      // Save assistant response
      await saveZionMessage({
        userId,
        role: 'assistant',
        content: displayContent,
        metadata: plannerActions.length > 0 ? JSON.stringify({ plannerActions }) : null,
      });

      return { content: displayContent, plannerActions };
    }),

  transcribeVoice: protectedProcedure
    .input(z.object({ audioUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      const { transcribeAudio } = await import("./_core/voiceTranscription");
      const result = await transcribeAudio({ audioUrl: input.audioUrl, language: 'en' });
      if ('text' in result) return { text: result.text };
      return { text: '' };
    }),

  // ── Night Reflection Procedures ──────────────────────────────────────────
  // Check if tonight's reflection has been completed
  checkNightlyPrompt: protectedProcedure.query(async ({ ctx }) => {
    const { nightReflections } = await import('../drizzle/schema');
    const { eq, and } = await import('drizzle-orm');
    const db = await (await import('./db')).getDb();
    if (!db) return { due: false, completed: false, date: '' };
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.select().from(nightReflections)
      .where(and(eq(nightReflections.userId, ctx.user.id), eq(nightReflections.date, today)))
      .limit(1);
    const completed = rows.length > 0 && !!(rows[0].desire1 && rows[0].desire2 && rows[0].desire3);
    // Due after 7pm local time (server uses UTC; we check hour >= 19 UTC as a proxy)
    const hour = new Date().getUTCHours();
    const due = !completed; // always show until completed
    return { due, completed, date: today, existing: rows[0] ?? null };
  }),

  // Get today's reflection
  getNightReflection: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const { nightReflections } = await import('../drizzle/schema');
      const { eq, and } = await import('drizzle-orm');
      const db = await (await import('./db')).getDb();
      if (!db) return null;
      const rows = await db.select().from(nightReflections)
        .where(and(eq(nightReflections.userId, ctx.user.id), eq(nightReflections.date, input.date)))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Generate a Zion reframe for a negative thought
  generateReframe: protectedProcedure
    .input(z.object({ negativeThought: z.string().min(1).max(2000) }))
    .mutation(async ({ input }) => {
      const reframePrompt = `You are Zion, a warm and wise wellness coach. The user has shared a negative thought they want to release before sleep. Your job is to gently reframe it into a positive, empowering belief using the Be Do Become framework.

Negative thought: "${input.negativeThought}"

Write a SHORT, warm reframe (1-2 sentences max). Start with "Instead, I choose to believe..." or a similar affirming opener. Be specific to their thought. No bullet points, no headers — just a single flowing affirmation.`;
      const response = await invokeLLM({
        messages: [{ role: 'user', content: reframePrompt }],
      });
      const reframe = String(response.choices[0]?.message?.content || '').trim();
      return { reframe };
    }),

  // Save the completed night reflection
  saveNightReflection: protectedProcedure
    .input(z.object({
      date: z.string(),
      category1: z.string().min(1),
      desire1: z.string().min(1),
      category2: z.string().min(1),
      desire2: z.string().min(1),
      category3: z.string().min(1),
      desire3: z.string().min(1),
      negativeThought: z.string().optional(),
      reframe: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { nightReflections } = await import('../drizzle/schema');
      const { eq, and } = await import('drizzle-orm');
      const db = await (await import('./db')).getDb();
      if (!db) throw new Error('DB not available');

      // Generate a personalised closing message from Zion
      const closingPrompt = `You are Zion, a warm wellness coach. A user just completed their nightly reflection. They wrote these three desires:
1. ${input.category1}: ${input.desire1}
2. ${input.category2}: ${input.desire2}
3. ${input.category3}: ${input.desire3}${input.reframe ? `\nThey also reframed a negative thought into: "${input.reframe}"` : ''}

Write a SHORT, warm, personalised goodnight message (2-3 sentences). Reference their specific desires. End with a gentle affirmation for sleep. No bullet points, no headers.`;

      const closingResponse = await invokeLLM({
        messages: [{ role: 'user', content: closingPrompt }],
      });
      const zionMessage = String(closingResponse.choices[0]?.message?.content || '').trim();

      // Upsert the reflection row
      const existing = await db.select().from(nightReflections)
        .where(and(eq(nightReflections.userId, ctx.user.id), eq(nightReflections.date, input.date)))
        .limit(1);

      if (existing.length > 0) {
        await db.update(nightReflections)
          .set({ ...input, zionMessage })
          .where(and(eq(nightReflections.userId, ctx.user.id), eq(nightReflections.date, input.date)));
      } else {
        await db.insert(nightReflections).values({
          userId: ctx.user.id,
          ...input,
          zionMessage,
        });
      }

      // Also save each desire as a gratitude entry in daily_entries
      const { upsertDailyEntry, getDailyEntry } = await import('./db');
      const existing_entry = await getDailyEntry(ctx.user.id, input.date);
      const gratitude: string[] = (existing_entry?.gratitude as string[]) ?? [];
      const desires = [
        `[${input.category1}] ${input.desire1}`,
        `[${input.category2}] ${input.desire2}`,
        `[${input.category3}] ${input.desire3}`,
      ];
      for (const d of desires) {
        if (!gratitude.includes(d) && gratitude.length < 10) gratitude.push(d);
      }
      await upsertDailyEntry(ctx.user.id, input.date, { gratitude });

      return { success: true, zionMessage };
    }),

  // Delete today's reflection so the user can redo it
  clearTodayReflection: protectedProcedure
    .input(z.object({ date: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { nightReflections } = await import('../drizzle/schema');
      const { eq, and } = await import('drizzle-orm');
      const db = await (await import('./db')).getDb();
      if (!db) return { success: false };
      await db.delete(nightReflections)
        .where(and(eq(nightReflections.userId, ctx.user.id), eq(nightReflections.date, input.date)));
      return { success: true };
    }),

  // ── saveParsedItem ─────────────────────────────────────────────────────────
  // Writes a single parsed brain-dump item into the correct planner table.
  // Called when the user clicks "Save" on a Zion action card.
  saveParsedItem: protectedProcedure
    .input(z.object({
      type: z.enum([
        'goal', 'note', 'schedule', 'habit', 'monthly_goal',
        'priority', 'intention', 'win',
        'reminder', 'budget', 'social_post', 'gratitude', 'calendar',
      ]),
      section: z.string(),
      content: z.string(),
      // Optional context fields supplied by the AI
      folder: z.string().optional(),      // for notes: folder name
      day: z.string().optional(),         // e.g. 'Monday' — for schedule/priority/social_post
      time: z.string().optional(),        // e.g. '9:00 AM' — for schedule / reminder
      field: z.string().optional(),       // target field name hint (e.g. 'wellnessGoals')
      reminderDate: z.string().optional(),// YYYY-MM-DD for reminder
      reminderTime: z.string().optional(),// HH:MM for reminder
      platform: z.string().optional(),    // for social_post: 'instagram', 'twitter', etc.
      budgetCategory: z.string().optional(), // for budget: 'livingExpenses', 'savings', etc.
      // Date context (defaults to today / current week / current month)
      year: z.number().optional(),
      month: z.number().optional(),
      weekNumber: z.number().optional(),
      weekStartDate: z.string().optional(),
      date: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const now = new Date();
      const year = input.year ?? now.getFullYear();
      const month = input.month ?? (now.getMonth() + 1);

      // Helper: compute ISO week number for a date
      const getISOWeek = (d: Date) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      };
      const weekNumber = input.weekNumber ?? getISOWeek(now);
      // Compute Monday of the current ISO week
      const getMondayOfWeek = (d: Date) => {
        const day = d.getDay() || 7;
        const monday = new Date(d);
        monday.setDate(d.getDate() - day + 1);
        return monday.toISOString().slice(0, 10);
      };
      const weekStartDate = input.weekStartDate ?? getMondayOfWeek(now);
      const todayDate = input.date ?? now.toISOString().slice(0, 10);

      // Map day name to YYYY-MM-DD offset from week start
      const dayNameToDate = (dayName: string): string => {
        const days: Record<string, number> = {
          monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
          friday: 4, saturday: 5, sunday: 6,
          mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
        };
        const offset = days[dayName.toLowerCase()] ?? 0;
        const base = new Date(weekStartDate);
        base.setDate(base.getDate() + offset);
        return base.toISOString().slice(0, 10);
      };

      // Normalise time string to HH:MM key (e.g. '9:00 AM' → '09:00')
      const normaliseTime = (t: string): string => {
        const match = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
        if (!match) return '09:00';
        let h = parseInt(match[1], 10);
        const m = match[2];
        const ampm = (match[3] || '').toLowerCase();
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${m}`;
      };

      switch (input.type) {
        // ── Big Goal → annual big_goals table ────────────────────────────────
        case 'goal': {
          // Find the first empty goal slot (1-6) or append to slot 1
          const existing = await getBigGoals(userId, year);
          const usedPositions = new Set(existing.map(g => g.position));
          let position = 1;
          for (let p = 1; p <= 6; p++) {
            if (!usedPositions.has(p)) { position = p; break; }
          }
          // If all 6 slots taken, append to slot 6 (overwrite last)
          await upsertBigGoal(userId, year, position, {
            title: input.content,
            description: '',
            steps: [],
          });
          return { success: true, target: `Annual Big Goals — slot ${position}`, year, navPath: '/annual' };
        }

        // ── Monthly Goal → monthly_plans businessCareerGoals or wellnessGoals ─
        case 'monthly_goal': {
          const existing = await getMonthlyPlan(userId, year, month);
          const fieldKey = (input.field === 'wellnessGoals') ? 'wellnessGoals' : 'businessCareerGoals';
          const current = (existing as any)?.[fieldKey] ?? '';
          const updated = current ? `${current}\n• ${input.content}` : `• ${input.content}`;
          await upsertMonthlyPlan(userId, year, month, { [fieldKey]: updated });
          return { success: true, target: `Monthly ${fieldKey} — ${month}/${year}`, navPath: `/monthly/${year}/${month}` };
        }

        // ── Schedule → daily_entries timeSlots ───────────────────────────────
        case 'schedule': {
          const targetDate = input.day ? dayNameToDate(input.day) : todayDate;
          const existing = await getDailyEntry(userId, targetDate);
          const timeSlots: Record<string, string> = (existing?.timeSlots as any) ?? {};
          const timeKey = input.time ? normaliseTime(input.time) : '09:00';
          // Append to existing slot text if occupied
          const currentSlot = timeSlots[timeKey] ?? '';
          timeSlots[timeKey] = currentSlot ? `${currentSlot}; ${input.content}` : input.content;
          await upsertDailyEntry(userId, targetDate, { timeSlots });
          return { success: true, target: `Schedule — ${targetDate} at ${timeKey}`, navPath: `/weekly/${year}/${weekNumber}` };
        }

        // ── Priority → daily_entries topPriorities ───────────────────────────
        case 'priority': {
          const targetDate = input.day ? dayNameToDate(input.day) : todayDate;
          const existing = await getDailyEntry(userId, targetDate);
          const priorities: string[] = (existing?.topPriorities as string[]) ?? [];
          if (priorities.length < 5) priorities.push(input.content);
          await upsertDailyEntry(userId, targetDate, { topPriorities: priorities });
          return { success: true, target: `Top Priorities — ${targetDate}`, navPath: `/weekly/${year}/${weekNumber}` };
        }

        // ── Habit → weekly_plans habitTracker ────────────────────────────────
        case 'habit': {
          const existing = await getWeeklyPlan(userId, year, weekNumber);
          const tracker: Record<string, any> = (existing?.habitTracker as any) ?? {};
          // Find a free custom slot (custom1 … custom5)
          let slot = 'custom1';
          for (const s of ['custom1', 'custom2', 'custom3', 'custom4', 'custom5']) {
            if (!tracker[s]) { slot = s; break; }
          }
          tracker[slot] = { name: input.content, days: [false, false, false, false, false, false, false] };
          await upsertWeeklyPlan(userId, year, weekNumber, weekStartDate, { habitTracker: tracker });
          return { success: true, target: `Habit Tracker — Week ${weekNumber}`, navPath: `/weekly/${year}/${weekNumber}` };
        }

        // ── Intention → weekly_plans weekIntentions ──────────────────────────
        case 'intention': {
          const existing = await getWeeklyPlan(userId, year, weekNumber);
          const current = existing?.weekIntentions ?? '';
          const updated = current ? `${current}\n• ${input.content}` : `• ${input.content}`;
          await upsertWeeklyPlan(userId, year, weekNumber, weekStartDate, { weekIntentions: updated });
          return { success: true, target: `Weekly Intentions — Week ${weekNumber}`, navPath: `/weekly/${year}/${weekNumber}` };
        }

        // ── Win → weekly_plans winsOfWeek ────────────────────────────────────
        case 'win': {
          const existing = await getWeeklyPlan(userId, year, weekNumber);
          const current = existing?.winsOfWeek ?? '';
          const updated = current ? `${current}\n• ${input.content}` : `• ${input.content}`;
          await upsertWeeklyPlan(userId, year, weekNumber, weekStartDate, { winsOfWeek: updated });
          return { success: true, target: `Wins of the Week — Week ${weekNumber}`, navPath: `/weekly/${year}/${weekNumber}` };
        }

        // ── Reminder → reminders table (fires browser notification) ──────────────
        case 'reminder': {
          const { reminders: remindersTable } = await import('../drizzle/schema');
          const db = await (await import('./db')).getDb();
          if (!db) throw new Error('DB not available');
          // Parse the reminder date/time
          const rDate = input.reminderDate ?? todayDate;
          const rTime = input.reminderTime ?? (input.time ? normaliseTime(input.time) : '09:00');
          const [rHour, rMin] = rTime.split(':').map(Number);
          const reminderAt = new Date(`${rDate}T${rTime}:00`);
          // Also write to daily schedule so it appears on the calendar
          const existing = await getDailyEntry(userId, rDate);
          const timeSlots: Record<string, string> = (existing?.timeSlots as any) ?? {};
          const slotKey = `${String(rHour).padStart(2,'0')}:${String(rMin).padStart(2,'0')}`;
          const currentSlot = timeSlots[slotKey] ?? '';
          timeSlots[slotKey] = currentSlot ? `${currentSlot}; ⏰ ${input.content}` : `⏰ ${input.content}`;
          await upsertDailyEntry(userId, rDate, { timeSlots });
          // Insert reminder row
          await db.insert(remindersTable).values({
            userId,
            title: input.content.slice(0, 512),
            reminderAt,
            date: rDate,
            timeSlot: slotKey,
            notifyBrowser: true,
            notifySlack: false,
            sent: false,
          });
          return { success: true, target: `Reminder set for ${rDate} at ${rTime}`, navPath: `/weekly/${year}/${weekNumber}` };
        }

        // ── Calendar (explicit date) → daily_entries timeSlots ─────────────────
        case 'calendar': {
          // 'calendar' is like 'schedule' but uses reminderDate as the target date
          const targetDate = input.reminderDate ?? (input.day ? dayNameToDate(input.day) : todayDate);
          const existing = await getDailyEntry(userId, targetDate);
          const timeSlots: Record<string, string> = (existing?.timeSlots as any) ?? {};
          const timeKey = input.time ? normaliseTime(input.time) : (input.reminderTime ?? '09:00');
          const currentSlot = timeSlots[timeKey] ?? '';
          timeSlots[timeKey] = currentSlot ? `${currentSlot}; ${input.content}` : input.content;
          await upsertDailyEntry(userId, targetDate, { timeSlots });
          return { success: true, target: `Calendar — ${targetDate} at ${timeKey}`, navPath: `/weekly/${year}/${weekNumber}` };
        }

        // ── Budget → monthly_plans financial fields ───────────────────────────
        case 'budget': {
          const BUDGET_FIELDS: Record<string, string> = {
            living: 'livingExpenses', livingexpenses: 'livingExpenses',
            personal: 'personalExpenses', personalexpenses: 'personalExpenses',
            savings: 'savings', saving: 'savings',
            investment: 'investment', invest: 'investment',
            entertainment: 'entertainment',
            oneTime: 'oneTimeExpenses', onetimeexpenses: 'oneTimeExpenses',
            financial: 'financialTargets', target: 'financialTargets', financialtargets: 'financialTargets',
          };
          const rawCat = (input.budgetCategory ?? input.field ?? 'financial').toLowerCase().replace(/[^a-z]/g,'');
          const fieldKey = BUDGET_FIELDS[rawCat] ?? 'financialTargets';
          const existing = await getMonthlyPlan(userId, year, month);
          const current = (existing as any)?.[fieldKey] ?? '';
          const updated = current ? `${current}\n• ${input.content}` : `• ${input.content}`;
          await upsertMonthlyPlan(userId, year, month, { [fieldKey]: updated });
          return { success: true, target: `Budget — ${fieldKey} (${month}/${year})`, navPath: `/monthly/${year}/${month}` };
        }

        // ── Social Post → weekly_plans socialPosts ───────────────────────────
        case 'social_post': {
          // Map day name → 0-based index (Mon=0 … Sun=6) matching the planner grid key format
          const DAY_IDX: Record<string, number> = {
            monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
            mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
          };
          const dayIdx = DAY_IDX[(input.day ?? 'monday').toLowerCase()] ?? 0;

          // Normalise platform to one of the known keys used by SOCIAL_PLATFORMS
          const PLATFORM_KEYS = ['facebook', 'instagram', 'twitter', 'tiktok', 'threads', 'pinterest', 'youtube', 'linkedin'];
          const rawPlatform = (input.platform ?? 'instagram').toLowerCase();
          const platformKey = PLATFORM_KEYS.find(k => rawPlatform.includes(k) || k.includes(rawPlatform)) ?? 'instagram';

          // Key format used by the WeeklyPage social posts grid: e.g. "instagram_0", "tiktok_2"
          const postKey = `${platformKey}_${dayIdx}`;

          const existing = await getWeeklyPlan(userId, year, weekNumber);
          const posts: Record<string, string> = (existing?.socialPosts as any) ?? {};
          const currentPost = posts[postKey] ?? '';
          posts[postKey] = currentPost
            ? `${currentPost}\n${input.content}`
            : input.content;
          await upsertWeeklyPlan(userId, year, weekNumber, weekStartDate, { socialPosts: posts });

          const dayName = input.day ?? 'Monday';
          const platformLabel = platformKey.charAt(0).toUpperCase() + platformKey.slice(1);
          // navPath includes ?tab=social so WeeklyPage opens on the correct tab
          return {
            success: true,
            target: `Social Posts — ${platformLabel} · ${dayName}`,
            navPath: `/weekly/${year}/${weekNumber}?tab=social`,
          };
        }

        // ── Gratitude → daily_entries gratitude array ────────────────────────
        case 'gratitude': {
          const targetDate = input.day ? dayNameToDate(input.day) : todayDate;
          const existing = await getDailyEntry(userId, targetDate);
          const gratitude: string[] = (existing?.gratitude as string[]) ?? [];
          if (gratitude.length < 5) gratitude.push(input.content);
          await upsertDailyEntry(userId, targetDate, { gratitude });
          return { success: true, target: `Gratitude — ${targetDate}`, navPath: `/weekly/${year}/${weekNumber}` };
        }

        // ── Note → notes table ───────────────────────────────────────────────
        case 'note':
        default: {
          const folder = input.folder ?? 'Ideas';
          // Use first line as title, rest as content
          const lines = input.content.split('\n');
          const title = lines[0].slice(0, 100) || 'Zion Note';
          const content = lines.join('\n');
          await createNote(userId, title, content, folder);
          return { success: true, target: `Notes — ${folder}`, navPath: '/notes' };
        }
      }
    }),

  // ── Streak: how many consecutive days has the user shown up ──────────────
  streak: protectedProcedure.query(async ({ ctx }) => {
    return getUserStreak(ctx.user.id);
  }),

  // ── Check streak & send Zion miss-notification if broken ─────────────────
  checkAndNotifyStreak: protectedProcedure.mutation(async ({ ctx }) => {
    const streak = await getUserStreak(ctx.user.id);
    const today = new Date().toISOString().slice(0, 10);

    // Only send a notification if the streak is broken AND we haven't sent one today
    if (!streak.streakBroken) return { notified: false, streak };
    const lastNotified = await getLastStreakNotification(ctx.user.id);
    if (lastNotified === today) return { notified: false, streak };

    // Build the encouragement message
    const messages = [
      `Hey, I noticed you missed a day — and that's okay. 💛 Every comeback is a story worth telling. Your streak is ready to be rebuilt, starting right now. What's one thing you want to get done today?`,
      `Life happened — no judgment here. 🌱 The fact that you're back means everything. You don't need a perfect streak; you need a persistent one. Let's go again. What's on your mind today?`,
      `Missed a day? No big deal — the work doesn't disappear, and neither does your potential. 🔥 The best thing you can do is show up today. Even 10 minutes counts. What would you like to tackle?`,
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    await saveZionMessage({
      userId: ctx.user.id,
      role: "assistant",
      content: `## Your streak was broken — but you're back! 💪\n\n${msg}`,
      metadata: JSON.stringify({ type: "streak_break_notification" }),
    });

    return { notified: true, streak };
  }),

  // ── Chief of Staff: structured daily briefing ────────────────────────────
  chiefOfStaff: protectedProcedure
    .input(z.object({ date: zDate.optional(), includeEmails: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const today = input.date ?? new Date().toISOString().slice(0, 10);
      const todayDate = new Date(today + "T12:00:00Z");
      const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const dayName = dayNames[todayDate.getUTCDay()];
      const dateLabel = `${dayName}, ${monthNames[todayDate.getUTCMonth()]} ${todayDate.getUTCDate()}, ${todayDate.getUTCFullYear()}`;

      // Gather planner data
      const context = await getUserPlannerContext(userId);
      const todayEntry = context.recentDailyEntries.find((e: any) => e.date === today);
      const upcomingReminders = context.upcomingReminders.slice(0, 5);

      // Weekly priorities & schedule
      const weeklyPlan = context.weeklyPlan as any;
      const priorities: string[] = [];
      const schedule: string[] = [];
      if (weeklyPlan) {
        const dayKey = dayName.toLowerCase();
        const slots = weeklyPlan[dayKey] ?? {};
        Object.entries(slots).forEach(([time, val]: any) => {
          if (val?.name) schedule.push(`${time}: ${val.name}`);
        });
        const weekPriorities = weeklyPlan.priorities ?? [];
        weekPriorities.slice(0, 3).forEach((p: any) => {
          if (p?.text) priorities.push(p.text);
        });
      }

      // Today's tasks from daily entry
      const todayTasks: string[] = [];
      if (todayEntry) {
        const tasks = (todayEntry as any).tasks ?? [];
        tasks.slice(0, 5).forEach((t: any) => { if (t?.text) todayTasks.push(t.text); });
      }

      // Optionally fetch emails
      let emailContext = "";
      if (input.includeEmails) {
        try {
          const integration = await getUserIntegrations(userId);
          if (integration?.gmailEnabled && integration.googleAccessToken) {
            const { google } = await import("googleapis");
            const oauth2Client = new google.auth.OAuth2(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET,
              process.env.GOOGLE_REDIRECT_URI
            );
            oauth2Client.setCredentials({
              access_token: integration.googleAccessToken,
              refresh_token: integration.googleRefreshToken ?? undefined,
            });
            const gmail = google.gmail({ version: "v1", auth: oauth2Client });
            const nextDay = new Date(todayDate); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            const q = `after:${today.replace(/-/g, "/")} before:${nextDay.toISOString().slice(0,10).replace(/-/g,"/")} -category:promotions -category:social`;
            const listRes = await gmail.users.messages.list({ userId: "me", q, maxResults: 10 });
            const msgs = listRes.data.messages ?? [];
            if (msgs.length > 0) {
              const details = await Promise.all(msgs.slice(0, 8).map(async (m) => {
                try {
                  const d = await gmail.users.messages.get({ userId: "me", id: m.id!, format: "metadata", metadataHeaders: ["Subject","From"] });
                  const h = d.data.payload?.headers ?? [];
                  return `- ${h.find((x:any) => x.name==="From")?.value ?? "?"}: ${h.find((x:any) => x.name==="Subject")?.value ?? "(no subject)"}`;
                } catch { return null; }
              }));
              emailContext = `\n\nEmails today (${msgs.length}):\n${details.filter(Boolean).join("\n")}`;
            }
          }
        } catch { /* email fetch is best-effort */ }
      }

      // Build AI prompt
      const bigGoals = (context.bigGoals as any[]).slice(0, 5).map((g: any) => g.title).filter(Boolean);
      const reminderLines = upcomingReminders.map((r: any) => `- ${r.title}${r.reminderAt ? ` (${new Date(r.reminderAt).toLocaleDateString()})` : ""}`).join("\n");

      const prompt = `You are Zion, acting as an elite Chief of Staff giving a sharp, warm morning briefing.

Today: ${dateLabel}
Big Goals: ${bigGoals.join(", ") || "None set"}
Today's schedule slots: ${schedule.length ? schedule.join(", ") : "No scheduled items"}
Weekly priorities: ${priorities.length ? priorities.join(", ") : "None set"}
Today's tasks: ${todayTasks.length ? todayTasks.join(", ") : "None set"}
Upcoming reminders: ${reminderLines || "None"}${emailContext}

Write a structured briefing with these EXACT sections (use these exact headers):

## Good Morning
One warm, motivating sentence personalized to today and what's on the schedule.

## Today's Focus
3 bullet points — the most important things to accomplish today based on the data above.

## Your Schedule
List today's scheduled items. If empty, suggest 2-3 time blocks based on priorities.

## On Your Radar
Up to 3 upcoming reminders or important things to keep in mind this week.

## Zion's Insight
One strategic observation or encouragement based on the overall picture. Be specific, not generic.

Keep each section tight — max 3-4 bullet points. Tone: warm, direct, executive.`;

      const { invokeLLM } = await import("./_core/llm");
      const result = await invokeLLM({
        model: "claude-opus-4-5",
        max_tokens: 900,
        messages: [{ role: "user", content: prompt }],
      });

      const rawContent = result.choices?.[0]?.message?.content;
      const briefing = typeof rawContent === "string" ? rawContent : "Could not generate briefing.";
      return { briefing, dateLabel, hasEmails: !!emailContext };
    }),
});

// ─── Daily Devotion Router ──────────────────────────────────────────────────
// 52 curated verse themes aligned with BDB wellness pillars
const VERSE_POOL = [
  { ref: "Philippians 4:13 (NKJV)", verse: "I can do all things through Christ who strengthens me.", theme: "Strength" },
  { ref: "Jeremiah 29:11 (NKJV)", verse: "For I know the thoughts that I think toward you, says the Lord, thoughts of peace and not of evil, to give you a future and a hope.", theme: "Purpose" },
  { ref: "Isaiah 40:31 (NKJV)", verse: "But those who wait on the Lord shall renew their strength; they shall mount up with wings like eagles, they shall run and not be weary, they shall walk and not faint.", theme: "Renewal" },
  { ref: "Proverbs 31:25 (NKJV)", verse: "Strength and honor are her clothing; she shall rejoice in time to come.", theme: "Confidence" },
  { ref: "Romans 8:28 (NKJV)", verse: "And we know that all things work together for good to those who love God, to those who are the called according to His purpose.", theme: "Faith" },
  { ref: "Psalm 46:5 (NKJV)", verse: "God is in the midst of her, she shall not be moved; God shall help her, just at the break of dawn.", theme: "Resilience" },
  { ref: "Joshua 1:9 (NKJV)", verse: "Have I not commanded you? Be strong and of good courage; do not be afraid, nor be dismayed, for the Lord your God is with you wherever you go.", theme: "Courage" },
  { ref: "Matthew 6:33 (NKJV)", verse: "But seek first the kingdom of God and His righteousness, and all these things shall be added to you.", theme: "Priority" },
  { ref: "Proverbs 3:5-6 (NKJV)", verse: "Trust in the Lord with all your heart, and lean not on your own understanding; in all your ways acknowledge Him, and He shall direct your paths.", theme: "Trust" },
  { ref: "2 Corinthians 5:7 (NKJV)", verse: "For we walk by faith, not by sight.", theme: "Faith" },
  { ref: "Psalm 23:1 (NKJV)", verse: "The Lord is my shepherd; I shall not want.", theme: "Abundance" },
  { ref: "Romans 12:2 (NKJV)", verse: "And do not be conformed to this world, but be transformed by the renewing of your mind, that you may prove what is that good and acceptable and perfect will of God.", theme: "Transformation" },
  { ref: "Galatians 6:9 (NKJV)", verse: "And let us not grow weary while doing good, for in due season we shall reap if we do not lose heart.", theme: "Perseverance" },
  { ref: "Psalm 37:4 (NKJV)", verse: "Delight yourself also in the Lord, and He shall give you the desires of your heart.", theme: "Desires" },
  { ref: "1 Corinthians 10:31 (NKJV)", verse: "Therefore, whether you eat or drink, or whatever you do, do all to the glory of God.", theme: "Excellence" },
  { ref: "Ephesians 3:20 (NKJV)", verse: "Now to Him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us.", theme: "Abundance" },
  { ref: "Isaiah 43:19 (NKJV)", verse: "Behold, I will do a new thing, now it shall spring forth; shall you not know it? I will even make a road in the wilderness and rivers in the desert.", theme: "New Beginnings" },
  { ref: "Psalm 139:14 (NKJV)", verse: "I will praise You, for I am fearfully and wonderfully made; marvelous are Your works, and that my soul knows very well.", theme: "Identity" },
  { ref: "2 Timothy 1:7 (NKJV)", verse: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.", theme: "Power" },
  { ref: "Lamentations 3:22-23 (NKJV)", verse: "Through the Lord's mercies we are not consumed, because His compassions fail not. They are new every morning; great is Your faithfulness.", theme: "Grace" },
  { ref: "Proverbs 16:3 (NKJV)", verse: "Commit your works to the Lord, and your thoughts will be established.", theme: "Planning" },
  { ref: "Matthew 5:16 (NKJV)", verse: "Let your light so shine before men, that they may see your good works and glorify your Father in heaven.", theme: "Impact" },
  { ref: "Psalm 119:105 (NKJV)", verse: "Your word is a lamp to my feet and a light to my path.", theme: "Guidance" },
  { ref: "Colossians 3:23 (NKJV)", verse: "And whatever you do, do it heartily, as to the Lord and not to men.", theme: "Diligence" },
  { ref: "James 1:5 (NKJV)", verse: "If any of you lacks wisdom, let him ask of God, who gives to all liberally and without reproach, and it will be given to him.", theme: "Wisdom" },
  { ref: "Philippians 4:6-7 (NKJV)", verse: "Be anxious for nothing, but in everything by prayer and supplication, with thanksgiving, let your requests be made known to God; and the peace of God, which surpasses all understanding, will guard your hearts and minds through Christ Jesus.", theme: "Peace" },
  { ref: "Isaiah 41:10 (NKJV)", verse: "Fear not, for I am with you; be not dismayed, for I am your God. I will strengthen you, yes, I will help you, I will uphold you with My righteous right hand.", theme: "Strength" },
  { ref: "Psalm 16:11 (NKJV)", verse: "You will show me the path of life; in Your presence is fullness of joy; at Your right hand are pleasures forevermore.", theme: "Joy" },
  { ref: "Habakkuk 2:2 (NKJV)", verse: "Write the vision and make it plain on tablets, that he may run who reads it.", theme: "Vision" },
  { ref: "Proverbs 4:23 (NKJV)", verse: "Keep your heart with all diligence, for out of it spring the issues of life.", theme: "Wellness" },
  { ref: "Romans 15:13 (NKJV)", verse: "Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope by the power of the Holy Spirit.", theme: "Hope" },
  { ref: "1 Peter 5:7 (NKJV)", verse: "Casting all your care upon Him, for He cares for you.", theme: "Peace" },
  { ref: "Psalm 27:1 (NKJV)", verse: "The Lord is my light and my salvation; whom shall I fear? The Lord is the strength of my life; of whom shall I be afraid?", theme: "Courage" },
  { ref: "Hebrews 11:1 (NKJV)", verse: "Now faith is the substance of things hoped for, the evidence of things not seen.", theme: "Faith" },
  { ref: "Proverbs 18:21 (NKJV)", verse: "Death and life are in the power of the tongue, and those who love it will eat its fruit.", theme: "Words" },
  { ref: "Deuteronomy 31:8 (NKJV)", verse: "And the Lord, He is the One who goes before you. He will be with you, He will not leave you nor forsake you; do not fear nor be dismayed.", theme: "Presence" },
  { ref: "John 10:10 (NKJV)", verse: "The thief does not come except to steal, and to kill, and to destroy. I have come that they may have life, and that they may have it more abundantly.", theme: "Abundance" },
  { ref: "Psalm 1:3 (NKJV)", verse: "He shall be like a tree planted by the rivers of water, that brings forth its fruit in its season, whose leaf also shall not wither; and whatever he does shall prosper.", theme: "Prosperity" },
  { ref: "Nehemiah 8:10 (NKJV)", verse: "Do not sorrow, for the joy of the Lord is your strength.", theme: "Joy" },
  { ref: "Micah 6:8 (NKJV)", verse: "He has shown you, O man, what is good; and what does the Lord require of you but to do justly, to love mercy, and to walk humbly with your God?", theme: "Character" },
  { ref: "Psalm 46:10 (NKJV)", verse: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth!", theme: "Rest" },
  { ref: "2 Chronicles 20:15 (NKJV)", verse: "Do not be afraid nor dismayed because of this great multitude, for the battle is not yours, but God's.", theme: "Surrender" },
  { ref: "Luke 1:37 (NKJV)", verse: "For with God nothing will be impossible.", theme: "Promise" },
  { ref: "Psalm 34:18 (NKJV)", verse: "The Lord is near to those who have a broken heart, and saves such as have a contrite spirit.", theme: "Healing" },
  { ref: "Romans 8:37 (NKJV)", verse: "Yet in all these things we are more than conquerors through Him who loved us.", theme: "Victory" },
  { ref: "Proverbs 31:30 (NKJV)", verse: "Charm is deceitful and beauty is passing, but a woman who fears the Lord, she shall be praised.", theme: "Identity" },
  { ref: "Philippians 1:6 (NKJV)", verse: "Being confident of this very thing, that He who has begun a good work in you will complete it until the day of Jesus Christ.", theme: "Growth" },
  { ref: "Isaiah 26:3 (NKJV)", verse: "You will keep him in perfect peace, whose mind is stayed on You, because he trusts in You.", theme: "Peace" },
  { ref: "Psalm 91:11 (NKJV)", verse: "For He shall give His angels charge over you, to keep you in all your ways.", theme: "Protection" },
  { ref: "Matthew 11:28 (NKJV)", verse: "Come to Me, all you who labor and are heavy laden, and I will give you rest.", theme: "Rest" },
  { ref: "Proverbs 11:25 (NKJV)", verse: "The generous soul will be made rich, and he who waters will also be watered himself.", theme: "Generosity" },
  { ref: "Zephaniah 3:17 (NKJV)", verse: "The Lord your God in your midst, the Mighty One, will save; He will rejoice over you with gladness, He will quiet you with His love, He will rejoice over you with singing.", theme: "Beloved" },
];

const devotionRouter = router({
  // Get or generate today's devotion
  getToday: protectedProcedure.query(async ({ ctx }) => {
    const { dailyDevotions } = await import('../drizzle/schema');
    const { eq, and } = await import('drizzle-orm');
    const db = await (await import('./db')).getDb();
    if (!db) throw new Error('DB not available');

    const today = new Date().toISOString().slice(0, 10);

    // Check if already generated today
    const existing = await db.select().from(dailyDevotions)
      .where(and(eq(dailyDevotions.userId, ctx.user.id), eq(dailyDevotions.date, today)))
      .limit(1);
    if (existing.length > 0) return existing[0];

    // Pick verse deterministically by day-of-year so all users see the same verse each day
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const verseEntry = VERSE_POOL[dayOfYear % VERSE_POOL.length];

    // Generate personalised affirmation via Zion/LLM
    const affirmationPrompt = `You are Zion, a warm wellness coach for the Be Do Become platform. Today's Bible verse is:
"${verseEntry.verse}" — ${verseEntry.ref} (Theme: ${verseEntry.theme})

Write a SHORT, powerful personal affirmation (1-2 sentences) inspired by this verse. Write it in first person ("I am...", "I have...", "I choose..."). Make it specific to the theme of ${verseEntry.theme}. No bullet points, no headers — just the affirmation itself.`;

    const response = await invokeLLM({
      messages: [{ role: 'user', content: affirmationPrompt }],
    });
    const affirmation = String(response.choices[0]?.message?.content || '').trim();

    // Save to DB
    await db.insert(dailyDevotions).values({
      userId: ctx.user.id,
      date: today,
      verse: verseEntry.verse,
      verseRef: verseEntry.ref,
      affirmation,
      theme: verseEntry.theme,
    });

    const rows = await db.select().from(dailyDevotions)
      .where(and(eq(dailyDevotions.userId, ctx.user.id), eq(dailyDevotions.date, today)))
      .limit(1);
    return rows[0];
  }),

  dismiss: protectedProcedure.mutation(async ({ ctx }) => {
    const { dailyDevotions } = await import('../drizzle/schema');
    const { eq, and } = await import('drizzle-orm');
    const db = await (await import('./db')).getDb();
    if (!db) return { success: false };
    const today = new Date().toISOString().slice(0, 10);
    await db.update(dailyDevotions)
      .set({ dismissed: true })
      .where(and(eq(dailyDevotions.userId, ctx.user.id), eq(dailyDevotions.date, today)));
    return { success: true };
  }),

  saveToPlanner: protectedProcedure.mutation(async ({ ctx }) => {
    const { dailyDevotions } = await import('../drizzle/schema');
    const { eq, and } = await import('drizzle-orm');
    const db = await (await import('./db')).getDb();
    if (!db) return { success: false };
    const today = new Date().toISOString().slice(0, 10);

    const rows = await db.select().from(dailyDevotions)
      .where(and(eq(dailyDevotions.userId, ctx.user.id), eq(dailyDevotions.date, today)))
      .limit(1);
    if (!rows.length) return { success: false };
    const d = rows[0];

    // Save as a note in "Daily Devotions" folder
    const { createNote } = await import('./db');
    const noteContent = `**${d.verseRef}**\n\n> "${d.verse}"\n\n**Today's Affirmation:**\n${d.affirmation}\n\n*Theme: ${d.theme} · ${today}*`;
    await createNote(ctx.user.id, `Devotion — ${today}`, noteContent, 'Daily Devotions');

    await db.update(dailyDevotions)
      .set({ savedToPlanner: true })
      .where(and(eq(dailyDevotions.userId, ctx.user.id), eq(dailyDevotions.date, today)));

    return { success: true };
  }),
});

// ─── Reminders Router ─────────────────────────────────────────────────────────
const remindersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getReminders(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(512),
      date: z.string(), // YYYY-MM-DD
      time: z.string(), // HH:MM
      notifyBrowser: z.boolean().default(true),
      notifySlack: z.boolean().default(false),
      timeSlot: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const reminderAt = new Date(`${input.date}T${input.time}:00`);
      await createReminder({
        userId: ctx.user.id,
        title: input.title,
        reminderAt,
        date: input.date,
        timeSlot: input.timeSlot ?? null,
        notifyBrowser: input.notifyBrowser,
        notifySlack: input.notifySlack,
        sent: false,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteReminder(ctx.user.id, input.id);
      return { success: true };
    }),

  markSent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Only mark sent if reminder belongs to this user
      const userReminders = await getReminders(ctx.user.id);
      const found = userReminders.find(r => r.id === input.id);
      if (found) await markReminderSent(input.id);
      return { success: true };
    }),
});

// ─── Slack Router ─────────────────────────────────────────────────────────────
const slackRouter = router({
  testWebhook: protectedProcedure.mutation(async ({ ctx }) => {
    const integration = await getUserIntegrations(ctx.user.id);
    if (!integration?.slackWebhookUrl) {
      throw new Error("No Slack webhook URL configured. Please add it in Integrations.");
    }
    const { default: axios } = await import("axios");
    await axios.post(integration.slackWebhookUrl, {
      text: "✅ BDB Digital Wellness Planner — Slack integration test successful! Your notifications are working.",
    });
    return { success: true };
  }),

  sendDailySummary: protectedProcedure
    .input(z.object({ date: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const integration = await getUserIntegrations(ctx.user.id);
      if (!integration?.slackWebhookUrl) {
        throw new Error("No Slack webhook URL configured. Please add it in Integrations.");
      }

      const daily = await getDailyEntry(ctx.user.id, input.date);
      const priorities: string[] = (daily?.topPriorities as string[] | null) ?? [];
      const slots: Record<string, string> = (daily?.timeSlots as Record<string, string> | null) ?? {};

      const priorityLines = priorities.filter(Boolean).map((p, i) => `${i + 1}. ${p}`).join("\n") || "_No priorities set_";
      const scheduleLines = Object.entries(slots)
        .filter(([, v]) => v?.trim())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, title]) => `• *${time}* — ${title}`)
        .join("\n") || "_No schedule entries_";

      const text = `📅 *BDB Daily Summary — ${input.date}*\n\n*Today's Top Priorities:*\n${priorityLines}\n\n*Today's Schedule:*\n${scheduleLines}`;

      const { default: axios } = await import("axios");
      await axios.post(integration.slackWebhookUrl, { text });
      return { success: true };
    }),
});

// ─── Google Calendar Router ───────────────────────────────────────────────────
const googleCalendarRouter = router({
  getAuthUrl: protectedProcedure.mutation(async ({ ctx }) => {
    const { google } = await import("googleapis");
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback";

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.");
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    // Encode userId in state so the callback can identify the user without relying on cookies
    const state = Buffer.from(JSON.stringify({ userId: ctx.user.id })).toString("base64");
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
      prompt: "consent",
      state,
    });
    return { url };
  }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await upsertUserIntegrations(ctx.user.id, {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleCalendarId: null,
      googleTokenExpiry: null,
    } as any);
    return { success: true };
  }),

  pushEvent: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      date: z.string(), // YYYY-MM-DD
      startTime: z.string(), // HH:MM
      endTime: z.string(),   // HH:MM
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const integration = await getUserIntegrations(ctx.user.id);
      if (!integration?.googleAccessToken) {
        throw new Error("Google Calendar not connected. Please connect in Integrations.");
      }

      const { google } = await import("googleapis");
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback";

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      oauth2Client.setCredentials({
        access_token: integration.googleAccessToken,
        refresh_token: integration.googleRefreshToken ?? undefined,
        expiry_date: integration.googleTokenExpiry ? integration.googleTokenExpiry.getTime() : undefined,
      });

      // If token is expired, refresh it
      const tokenInfo = await oauth2Client.getAccessToken();
      if (tokenInfo.token && tokenInfo.token !== integration.googleAccessToken) {
        await upsertUserIntegrations(ctx.user.id, { googleAccessToken: tokenInfo.token });
      }

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const calendarId = integration.googleCalendarId ?? "primary";

      await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: input.title,
          description: input.description ?? "",
          start: { dateTime: `${input.date}T${input.startTime}:00`, timeZone: "UTC" },
          end: { dateTime: `${input.date}T${input.endTime}:00`, timeZone: "UTC" },
        },
      });

      return { success: true };
    }),

  status: protectedProcedure.query(async ({ ctx }) => {
    const integration = await getUserIntegrations(ctx.user.id);
    return { connected: !!(integration?.googleAccessToken) };
  }),
});

// ─── Gmail Router ─────────────────────────────────────────────────────────────
const gmailRouter = router({
  /** Whether this user has Gmail scope granted */
  status: protectedProcedure.query(async ({ ctx }) => {
    const integration = await getUserIntegrations(ctx.user.id);
    return {
      connected: !!(integration?.googleAccessToken),
      gmailEnabled: !!(integration as any)?.gmailEnabled,
    };
  }),

  /** Fetch + AI-summarise today's emails */
  summarizeToday: protectedProcedure
    .input(z.object({ date: z.string() })) // YYYY-MM-DD in user's local time
    .mutation(async ({ ctx, input }) => {
      const integration = await getUserIntegrations(ctx.user.id);
      if (!integration?.googleAccessToken) {
        throw new Error("Google account not connected. Connect it in Integrations.");
      }
      if (!(integration as any).gmailEnabled) {
        throw new Error("Gmail access not yet granted. Re-authorize your Google account in Integrations to enable this.");
      }

      const { google } = await import("googleapis");
      const clientId = process.env.GOOGLE_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback";

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      oauth2Client.setCredentials({
        access_token: integration.googleAccessToken,
        refresh_token: integration.googleRefreshToken ?? undefined,
        expiry_date: integration.googleTokenExpiry ? integration.googleTokenExpiry.getTime() : undefined,
      });

      // Refresh token if needed
      try {
        const tokenInfo = await oauth2Client.getAccessToken();
        if (tokenInfo.token && tokenInfo.token !== integration.googleAccessToken) {
          await upsertUserIntegrations(ctx.user.id, { googleAccessToken: tokenInfo.token } as any);
        }
      } catch { /* token might still be valid */ }

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Build a Gmail search query: emails received on input.date
      // Gmail uses date in YYYY/MM/DD format
      const dateParts = input.date.split("-");
      const gmailDate = `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`;
      const nextDay = new Date(input.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDateParts = nextDay.toISOString().slice(0, 10).split("-");
      const gmailNextDate = `${nextDateParts[0]}/${nextDateParts[1]}/${nextDateParts[2]}`;

      let messageList: any[] = [];
      try {
        const listRes = await gmail.users.messages.list({
          userId: "me",
          q: `after:${gmailDate} before:${gmailNextDate} -category:promotions -category:social`,
          maxResults: 25,
        });
        messageList = listRes.data.messages ?? [];
      } catch (err: any) {
        if (err?.status === 403 || err?.code === 403) {
          throw new Error("Gmail permission denied. Please re-authorize your Google account in Integrations.");
        }
        throw err;
      }

      if (messageList.length === 0) {
        return {
          summary: "No emails found for today outside of Promotions and Social categories. Your inbox looks clear! 🎉",
          emailCount: 0,
          emails: [],
        };
      }

      // Fetch details for each message (subject, from, snippet)
      const emailDetails = await Promise.all(
        messageList.slice(0, 20).map(async (msg) => {
          try {
            const detail = await gmail.users.messages.get({
              userId: "me",
              id: msg.id!,
              format: "metadata",
              metadataHeaders: ["Subject", "From", "Date"],
            });
            const headers = detail.data.payload?.headers ?? [];
            const subject = headers.find((h: any) => h.name === "Subject")?.value ?? "(no subject)";
            const from = headers.find((h: any) => h.name === "From")?.value ?? "Unknown";
            const snippet = detail.data.snippet ?? "";
            return { subject, from, snippet };
          } catch {
            return null;
          }
        })
      );
      const validEmails = emailDetails.filter(Boolean) as { subject: string; from: string; snippet: string }[];

      // Use Claude to summarise
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const emailsText = validEmails.map((e, i) =>
        `${i + 1}. From: ${e.from}\n   Subject: ${e.subject}\n   Preview: ${e.snippet}`
      ).join("\n\n");

      const response = await anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `You are Zion, a wellness assistant. Summarise the following ${validEmails.length} emails from today in a warm, helpful tone. Group by theme if possible. Flag any action items or urgent messages. Keep it concise — use bullet points.

${emailsText}`,
        }],
      });

      const summary = response.content[0].type === "text" ? response.content[0].text : "Could not generate summary.";

      return {
        summary,
        emailCount: validEmails.length,
        emails: validEmails,
      };
    }),
});

// ─── Community Router ─────────────────────────────────────────────────────────
const communityRouter = router({
  checkIn: protectedProcedure
    .input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      rating: z.number().int().min(1).max(5),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertDailyCheckIn(ctx.user.id, input.date, input.rating, input.note);
      return { success: true };
    }),

  myCheckIn: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      return getMyCheckIn(ctx.user.id, input.date);
    }),

  leaderboard: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input }) => {
      return getTodayLeaderboard(input.date);
    }),

  weeklyTop: protectedProcedure
    .input(z.object({
      weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .query(async ({ input }) => {
      return getWeeklyTopPerformers(input.weekStart, input.weekEnd);
    }),

  messages: protectedProcedure
    .input(z.object({ beforeId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getCommunityMessages({ beforeId: input?.beforeId, limit: 50 });
    }),

  sendMessage: protectedProcedure
    .input(z.object({ content: z.string().min(1).max(1000).trim() }))
    .mutation(async ({ ctx, input }) => {
      await sendCommunityMessage(ctx.user.id, input.content);
      return { success: true };
    }),

  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteCommunityMessage(input.messageId, ctx.user.id);
      return { success: true };
    }),

  adminDeleteMessage: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const admin = await isUserAdmin(ctx.user.id);
      if (!admin) throw new Error("Unauthorized");
      await adminDeleteCommunityMessage(input.messageId);
      return { success: true };
    }),

  reactToMessage: protectedProcedure
    .input(z.object({ messageId: z.number(), emoji: z.string().max(10) }))
    .mutation(async ({ ctx, input }) => {
      await toggleMessageReaction(input.messageId, ctx.user.id, input.emoji);
      return { success: true };
    }),

  flagMessage: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await flagCommunityMessage(input.messageId);
      return { success: true };
    }),

  isAdmin: protectedProcedure.query(async ({ ctx }) => {
    return isUserAdmin(ctx.user.id);
  }),
});

// ─── Push Notifications Router ───────────────────────────────────────────────
const pushRouter = router({
  vapidPublicKey: publicProcedure.query(() => {
    return process.env.VAPID_PUBLIC_KEY || null;
  }),

  subscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string().url(),
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await savePushSubscription(ctx.user.id, input.endpoint, input.p256dh, input.auth);
      return { success: true };
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deletePushSubscription(ctx.user.id, input.endpoint);
      return { success: true };
    }),

  status: protectedProcedure.query(async ({ ctx }) => {
    const subs = await getUserPushSubscriptions(ctx.user.id);
    return { subscribed: subs.length > 0, count: subs.length };
  }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
// ─── Invite Router ───────────────────────────────────────────────────────────
const inviteRouter = router({
  // Admin-only: generate a shareable magic-access link (no sign-up needed)
  generateAccessLink: protectedProcedure
    .mutation(async ({ ctx }) => {
      const admin = await isUserAdmin(ctx.user.id);
      if (!admin) throw new Error("Unauthorized");
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const token = await new SignJWT({ type: "magic_access", nonce: nanoid(8) })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(secret);
      return { token };
    }),

  // Admin-only: generate a one-time invite link token (7-day expiry)
  create: protectedProcedure
    .input(z.object({ role: z.enum(["user", "admin"]).default("user") }))
    .mutation(async ({ ctx, input }) => {
      const admin = await isUserAdmin(ctx.user.id);
      if (!admin) throw new Error("Unauthorized");
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const token = await new SignJWT({ type: "invite", role: input.role, nonce: nanoid(8) })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(secret);
      return { token };
    }),

  // Public: validate an invite token before showing the registration form
  validate: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(input.token, secret);
        if (payload.type !== "invite") return { valid: false };
        return { valid: true, role: payload.role as string };
      } catch {
        return { valid: false };
      }
    }),

  // Public: register using a valid invite token
  register: publicProcedure
    .input(z.object({
      token: z.string(),
      name: z.string().min(1).max(100),
      email: z.string().email(),
      password: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate token first
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      let role = "user";
      try {
        const { payload } = await jwtVerify(input.token, secret);
        if (payload.type !== "invite") throw new Error("Invalid invite");
        role = (payload.role as string) ?? "user";
      } catch {
        throw new Error("This invite link is invalid or has expired.");
      }

      const existing = await getUserByEmail(input.email.toLowerCase());
      if (existing) throw new Error("An account with this email already exists.");

      const passwordHash = await bcrypt.hash(input.password, 12);
      const openId = nanoid(21);
      await upsertUser({
        openId,
        name: input.name.trim(),
        email: input.email.toLowerCase(),
        passwordHash,
        loginMethod: "email",
        role: role as "user" | "admin",
        lastSignedIn: new Date(),
      } as any);

      const user = await getUserByEmail(input.email.toLowerCase());
      if (!user) throw new Error("Failed to create account.");

      const { authService } = await import("./_core/sdk");
      const { ONE_YEAR_MS } = await import("@shared/const");
      const { getSessionCookieOptions } = await import("./_core/cookies");
      const { COOKIE_NAME } = await import("@shared/const");

      const sessionToken = await authService.createSessionToken(
        { id: user.id, openId: user.openId, name: user.name },
        { expiresInMs: ONE_YEAR_MS }
      );
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true, user: { id: user.id, name: user.name, email: user.email } };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  annual: annualRouter,
  bigGoals: bigGoalsRouter,
  monthly: monthlyRouter,
  weekly: weeklyRouter,
  daily: dailyRouter,
   contentCalendar: contentCalendarRouter,
  notes: notesRouter,
  integrations: integrationsRouter,
  visionBoard: visionBoardRouter,
  attachments: attachmentsRouter,
  socialAccounts: socialAccountsRouter,
  ai: aiRouter,
  zion: zionRouter,
  devotion: devotionRouter,
  reminders: remindersRouter,
  slack: slackRouter,
  googleCalendar: googleCalendarRouter,
  gmail: gmailRouter,
  search: router({
    global: protectedProcedure
      .input(z.object({ query: z.string().min(1).max(200) }))
      .query(async ({ ctx, input }) => globalSearch(ctx.user.id, input.query)),
  }),
  community: communityRouter,
  push: pushRouter,
  invite: inviteRouter,
});
export type AppRouter = typeof appRouter;
