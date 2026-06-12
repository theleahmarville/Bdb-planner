/**
 * Zion Autonomous Scheduler
 *
 * Runs four recurring jobs:
 *  1. Morning briefing    — 7:00 am daily     → emails the day's Chief of Staff brief
 *  2. Habit nudge         — 9:00 pm daily     → emails anyone who hasn't checked in today
 *  3. Sunday review       — 8:00 pm Sundays   → week-ahead email with Zion's plan
 *  4. Monthly reflection  — 9:00 pm last day  → deep monthly review email
 *
 * Default timezone: America/Barbados (UTC-4, no DST).
 * Override with SCHEDULER_TIMEZONE env var.
 */

import cron from "node-cron";
import {
  getActiveUsers,
  getUserPlannerContext,
  schedulerAlreadyRan,
  markSchedulerRan,
  hasCheckInForDate,
  getZionMemory,
} from "./db";
import { invokeLLM } from "./_core/llm";
import {
  sendMorningBriefingEmail,
  sendWeekAheadEmail,
  sendMonthlyReflectionEmail,
  sendHabitNudgeEmail,
} from "./_core/email";

const TZ = process.env.SCHEDULER_TIMEZONE || "America/Los_Angeles";

// ─── Shared: build a planner-context string for LLM prompts ──────────────────

async function buildContextSummary(userId: number): Promise<string> {
  const ctx = await getUserPlannerContext(userId);
  const today = ctx.now.toISOString().slice(0, 10);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const goals = ctx.bigGoals.length
    ? ctx.bigGoals.map((g: any) => `• ${g.title || "(untitled)"}${g.description ? ` — ${g.description}` : ""}`).join("\n")
    : "(No annual goals set)";

  const monthly = ctx.allMonthlyPlans.length
    ? ctx.allMonthlyPlans.slice(-3).map((m: any) => {
        const parts: string[] = [];
        if (m.themeWord) parts.push(`Theme: ${m.themeWord}`);
        if (m.businessCareerGoals) parts.push(`Business: ${m.businessCareerGoals}`);
        if (m.wellnessGoals) parts.push(`Wellness: ${m.wellnessGoals}`);
        if (m.winsOfWeek) parts.push(`Wins: ${m.winsOfWeek}`);
        return `${monthNames[(m.month ?? 1) - 1]}: ${parts.join(" | ")}`;
      }).filter(Boolean).join("\n")
    : "(No monthly plans logged)";

  const weekly = ctx.weeklyPlan ? [
    ctx.weeklyPlan.wordOfWeek && `Word of week: ${ctx.weeklyPlan.wordOfWeek}`,
    ctx.weeklyPlan.weekIntentions && `Intentions: ${ctx.weeklyPlan.weekIntentions}`,
    ctx.weeklyPlan.topBusinessGoals && `Business goals: ${ctx.weeklyPlan.topBusinessGoals}`,
  ].filter(Boolean).join("\n") : "(No weekly plan this week)";

  const daily = ctx.recentDailyEntries.slice(0, 5).map((d: any) => {
    const priorities = (d.topPriorities as string[] | null)?.filter(Boolean);
    return priorities?.length ? `${d.date}: ${priorities.join(", ")}` : null;
  }).filter(Boolean).join("\n") || "(No recent daily entries)";

  const reminders = ctx.upcomingReminders.slice(0, 5).map((r: any) => `• ${r.date}: ${r.title}`).join("\n") || "(None)";

  return `Today: ${today} (Week ${ctx.weekNumber} of ${ctx.year})

## Annual Goals
${goals}

## Monthly Progress (recent)
${monthly}

## This Week
${weekly}

## Last 5 Days (priorities)
${daily}

## Upcoming Reminders
${reminders}`;
}

/** Format memories into a concise section for LLM */
async function buildMemorySection(userId: number): Promise<string> {
  const memories = await getZionMemory(userId);
  if (!memories.length) return "";
  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(`• [${m.key_name}] ${m.value}`);
  }
  return Object.entries(grouped)
    .map(([cat, items]) => `${cat.toUpperCase()}S:\n${items.join("\n")}`)
    .join("\n\n");
}

// ─── Job 1: Morning Briefing ──────────────────────────────────────────────────

async function runMorningBriefings() {
  console.log("[Scheduler] Running morning briefings…");
  const users = await getActiveUsers();
  const today = new Date().toISOString().slice(0, 10);

  for (const user of users) {
    try {
      const alreadySent = await schedulerAlreadyRan(user.id, "morning_briefing", today);
      if (alreadySent) continue;

      const context = await buildContextSummary(user.id);
      const memories = await buildMemorySection(user.id);
      const firstName = user.name?.split(" ")[0] || "there";
      const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

      const prompt = `You are Zion, AI Chief of Staff for ${firstName} on the BDB Digital Wellness Planner.
Generate a concise, warm morning briefing for ${dateLabel}.

${memories ? `## WHAT YOU KNOW ABOUT ${firstName.toUpperCase()}\n${memories}\n\n` : ""}## PLANNER CONTEXT
${context}

Write the briefing in these sections (use ## headers):
## Good Morning, ${firstName} 🌅
(A warm, personalised 1-2 sentence opener based on what's happening today)

## Today's Focus
(Top 2-3 priorities for today based on their planner data)

## On Your Radar
(Upcoming reminders or deadlines worth noting)

## Zion's Insight
(One motivating, personalised thought based on their goals and patterns)

Be warm, direct, and brief. Max 250 words total.`;

      const result = await invokeLLM({ max_tokens: 400, messages: [{ role: "user", content: prompt }] });
      const briefing = result.choices?.[0]?.message?.content;
      if (typeof briefing !== "string" || !briefing.trim()) continue;

      await sendMorningBriefingEmail(user.email, user.name || "", briefing, dateLabel);
      await markSchedulerRan(user.id, "morning_briefing", today);
    } catch (err) {
      console.error(`[Scheduler] Morning briefing failed for user ${user.id}:`, err);
    }
  }
}

// ─── Job 2: Habit Nudge ───────────────────────────────────────────────────────

async function runHabitNudges() {
  console.log("[Scheduler] Running habit nudges…");
  const users = await getActiveUsers();
  const today = new Date().toISOString().slice(0, 10);

  for (const user of users) {
    try {
      const alreadySent = await schedulerAlreadyRan(user.id, "habit_nudge", today);
      if (alreadySent) continue;

      const hasCheckedIn = await hasCheckInForDate(user.id, today);
      if (hasCheckedIn) continue; // already showed up, no nudge needed

      await sendHabitNudgeEmail(user.email, user.name || "");
      await markSchedulerRan(user.id, "habit_nudge", today);
    } catch (err) {
      console.error(`[Scheduler] Habit nudge failed for user ${user.id}:`, err);
    }
  }
}

// ─── Job 3: Sunday Week-Ahead Review ─────────────────────────────────────────

async function runSundayReviews() {
  console.log("[Scheduler] Running Sunday week-ahead reviews…");
  const users = await getActiveUsers();
  const today = new Date().toISOString().slice(0, 10);

  // Calculate start of next week
  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + 1); // Monday is tomorrow (Sunday + 1)
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  const weekLabel = `${nextMonday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${nextSunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  for (const user of users) {
    try {
      const alreadySent = await schedulerAlreadyRan(user.id, "sunday_review", today);
      if (alreadySent) continue;

      const context = await buildContextSummary(user.id);
      const memories = await buildMemorySection(user.id);
      const firstName = user.name?.split(" ")[0] || "there";

      const prompt = `You are Zion, AI Chief of Staff for ${firstName} on the BDB Digital Wellness Planner.
It's Sunday evening. Generate a warm, strategic week-ahead review for the week of ${weekLabel}.

${memories ? `## WHAT YOU KNOW ABOUT ${firstName.toUpperCase()}\n${memories}\n\n` : ""}## PLANNER CONTEXT
${context}

Write the review with these sections (use ## headers):

## The Week of ${weekLabel}
(1-2 sentence scene-setter)

## What's Already Planned
(Pull from their planner data — reminders, daily entries for next week if any)

## Strategic Focus for This Week
(2-3 specific recommended priorities based on their big goals)

## Suggested Actions
(3 concrete, specific things they should do this week to move toward their goals)

## Mindset Intention
(One powerful sentence — a mantra or intention for the week based on their BDB journey)

Be warm, strategic, and specific. Use their actual goal data. Max 300 words.`;

      const result = await invokeLLM({ max_tokens: 500, messages: [{ role: "user", content: prompt }] });
      const content = result.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) continue;

      await sendWeekAheadEmail(user.email, user.name || "", content, weekLabel);
      await markSchedulerRan(user.id, "sunday_review", today);
    } catch (err) {
      console.error(`[Scheduler] Sunday review failed for user ${user.id}:`, err);
    }
  }
}

// ─── Job 4: Monthly Reflection ────────────────────────────────────────────────

async function runMonthlyReflections() {
  console.log("[Scheduler] Running monthly reflections…");
  const users = await getActiveUsers();
  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = now.toISOString().slice(0, 10);

  for (const user of users) {
    try {
      const alreadySent = await schedulerAlreadyRan(user.id, "monthly_reflection", today);
      if (alreadySent) continue;

      const context = await buildContextSummary(user.id);
      const memories = await buildMemorySection(user.id);
      const firstName = user.name?.split(" ")[0] || "there";

      const prompt = `You are Zion, AI Chief of Staff for ${firstName} on the BDB Digital Wellness Planner.
${monthLabel} is ending. Generate a deep, warm monthly reflection.

${memories ? `## WHAT YOU KNOW ABOUT ${firstName.toUpperCase()}\n${memories}\n\n` : ""}## PLANNER CONTEXT (this month's data)
${context}

Write the reflection with these sections (use ## headers):

## ${monthLabel} — Your Month in Review
(2-3 sentence warm opening that honours this month's journey)

## What You Achieved
(Specific wins pulled from their planner data — monthly themes, weekly wins, goals progress)

## Patterns I've Noticed
(Based on their habit data, check-in history, and goals — what patterns emerged?)

## Growth Moments
(Where did they stretch, struggle, or surprise themselves this month?)

## Carrying Forward
(3 specific things to take into next month — mindset shifts, actions, lessons)

## Your Word for Next Month
(One word that encapsulates the energy they should bring into the next chapter, with a 1-sentence explanation)

Be deeply personal, warm, and grounded in their actual data. This should feel like a wise friend reflecting with them. Max 350 words.`;

      const result = await invokeLLM({ max_tokens: 600, messages: [{ role: "user", content: prompt }] });
      const content = result.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) continue;

      await sendMonthlyReflectionEmail(user.email, user.name || "", content, monthLabel);
      await markSchedulerRan(user.id, "monthly_reflection", today);
    } catch (err) {
      console.error(`[Scheduler] Monthly reflection failed for user ${user.id}:`, err);
    }
  }
}

// ─── Start All Jobs ────────────────────────────────────────────────────────────

export function startScheduler() {
  // Morning briefing — 7:00 am daily
  cron.schedule("0 7 * * *", () => { runMorningBriefings().catch(console.error); }, { timezone: TZ });

  // Habit nudge — 9:00 pm daily (only fires if user hasn't checked in)
  cron.schedule("0 21 * * *", () => { runHabitNudges().catch(console.error); }, { timezone: TZ });

  // Sunday week-ahead review — 8:00 pm every Sunday
  cron.schedule("0 20 * * 0", () => { runSundayReviews().catch(console.error); }, { timezone: TZ });

  // Monthly reflection — 9:00 pm on days 28-31 (checks internally if it's the last day)
  cron.schedule("0 21 28-31 * *", () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (tomorrow.getMonth() !== now.getMonth()) {
      runMonthlyReflections().catch(console.error);
    }
  }, { timezone: TZ });

  console.log(`[Scheduler] ✅ Zion autonomous jobs started — timezone: ${TZ}`);
  console.log(`[Scheduler]   • Morning briefing: 7:00 am daily`);
  console.log(`[Scheduler]   • Habit nudge:      9:00 pm daily`);
  console.log(`[Scheduler]   • Sunday review:    8:00 pm Sundays`);
  console.log(`[Scheduler]   • Monthly reflect:  9:00 pm last day of month`);
}
