import { useState, useEffect } from "react";
import { format, addDays, startOfISOWeek, getISOWeek, getISOWeekYear } from "date-fns";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  CalendarDays, Clock, Flame, Trophy, ChevronRight,
  Target, CheckCircle2, TrendingUp, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const year = getISOWeekYear(now);
  const weekNumber = getISOWeek(now);
  const weekStart = startOfISOWeek(now);
  const weekStartDate = format(weekStart, "yyyy-MM-dd");
  const month = now.getMonth() + 1;

  const { data: weekData } = trpc.weekly.get.useQuery({ year, weekNumber });
  const { data: dailyData } = trpc.daily.get.useQuery({ date: todayStr });
  const { data: bigGoals = [] } = trpc.bigGoals.list.useQuery({ year });
  const { user } = useAuth();

  // ── Greeting ──────────────────────────────────────────────────────────────
  const hour = now.getHours();
  const greeting =
    hour >= 5 && hour < 12 ? "Good morning" :
    hour >= 12 && hour < 17 ? "Good afternoon" :
    hour >= 17 && hour < 21 ? "Good evening" :
    "Good night";
  const greetingEmoji =
    hour >= 5 && hour < 12 ? "🌅" :
    hour >= 12 && hour < 17 ? "☀️" :
    hour >= 17 && hour < 21 ? "🌆" :
    "🌙";
  const firstName = user?.name?.split(" ")[0] || "";
  const todayFormatted = format(now, "EEEE, MMMM d");

  // ── Quarterly progress ────────────────────────────────────────────────────
  const quarter = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4;
  const quarterMonths = quarter === 1 ? [1,2,3] : quarter === 2 ? [4,5,6] : quarter === 3 ? [7,8,9] : [10,11,12];
  const currentMonthInQuarter = ((month - 1) % 3) + 1;
  const quarterProgress = Math.round((currentMonthInQuarter / 3) * 100);

  const quarterLabel = (() => {
    const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const first = names[quarterMonths[0] - 1];
    const last = names[quarterMonths[2] - 1];
    return `${first} – ${last} ${year}`;
  })();

  // ── Habit stats ───────────────────────────────────────────────────────────
  const habitEntries = Object.entries((weekData?.habitTracker as any) || {});
  const totalHabitChecks = habitEntries.reduce((sum, [, h]: [string, any]) =>
    sum + (h.days as boolean[]).filter(Boolean).length, 0);
  const totalPossible = habitEntries.length * 7;
  const habitPct = totalPossible > 0 ? Math.round((totalHabitChecks / totalPossible) * 100) : 0;
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const todayHabitsDone = habitEntries.filter(([, h]: [string, any]) => (h.days as boolean[])[todayIdx]).length;

  // ── Today's schedule ──────────────────────────────────────────────────────
  const todaySlots = Object.entries((dailyData?.timeSlots as any) || {})
    .filter(([, v]) => v && (v as string).trim())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 5);
  const todayPriorities = ((dailyData?.topPriorities as string[]) || []).filter(Boolean).slice(0, 3);

  // ── Habit chip colour ─────────────────────────────────────────────────────
  const habitChipClass =
    habitPct >= 70 ? "bg-emerald-500/20 text-emerald-300" :
    habitPct >= 40 ? "bg-amber-500/20 text-amber-300" :
    "bg-rose-500/20 text-rose-300";

  // ── Habit bar colour ──────────────────────────────────────────────────────
  const habitBarClass =
    habitPct >= 70 ? "bg-emerald-500" :
    habitPct >= 40 ? "bg-amber-500" :
    "bg-rose-500";

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

      {/* ── Section 1: Hero Greeting Bar ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#1a1230] to-[#2d1f4e] text-white rounded-2xl px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-2xl font-black">
              {greetingEmoji} {greeting}{firstName ? `, ${firstName}` : ""}!
            </p>
            <p className="text-sm text-white/70 mt-0.5">{todayFormatted}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold">
              Week {weekNumber}
            </span>
            <span className={cn("px-3 py-1.5 rounded-full text-xs font-semibold", habitChipClass)}>
              {habitPct}% habits
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 2: This Week + Today's Schedule ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Left — This Week at a Glance */}
        <Link href={`/weekly/${year}/${weekNumber}`}>
          <div className="planner-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-emerald-600 flex-shrink-0" />
                <span className="font-bold text-sm">This Week</span>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-emerald-600 transition-colors flex items-center gap-0.5">
                Open planner <ChevronRight size={12} />
              </span>
            </div>

            {weekData ? (
              <>
                {/* Word of the week */}
                {(weekData as any).wordOfTheWeek && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Word of the Week</p>
                    <p className="text-xl font-black text-foreground">{(weekData as any).wordOfTheWeek}</p>
                  </div>
                )}

                {/* Business goals snippet */}
                {(weekData as any).topBusinessGoals && (
                  <div className="mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Business Goals</p>
                    <p className="text-sm text-foreground/80 line-clamp-2">
                      {((weekData as any).topBusinessGoals as string).slice(0, 80)}
                      {((weekData as any).topBusinessGoals as string).length > 80 ? "…" : ""}
                    </p>
                  </div>
                )}

                {/* Week intentions snippet */}
                {(weekData as any).weekIntentions && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Intentions</p>
                    <p className="text-sm text-foreground/80 line-clamp-2">
                      {((weekData as any).weekIntentions as string).slice(0, 80)}
                      {((weekData as any).weekIntentions as string).length > 80 ? "…" : ""}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                  <span>{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-500" />
                    {totalHabitChecks} habit checks
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between py-4 text-sm text-muted-foreground">
                <span>Start planning your week →</span>
              </div>
            )}
          </div>
        </Link>

        {/* Right — Today's Schedule */}
        <Link href={`/weekly/${year}/${weekNumber}`}>
          <div className="planner-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-emerald-600 flex-shrink-0" />
                <span className="font-bold text-sm">Today</span>
              </div>
            </div>

            {/* Top Priorities */}
            {todayPriorities.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Top Priorities</p>
                <div className="flex flex-wrap gap-1.5">
                  {todayPriorities.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                      <span className="text-emerald-400">•</span> {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Time Slots */}
            {todaySlots.length > 0 ? (
              <div className="space-y-1.5">
                {todaySlots.map(([time, val]) => (
                  <div key={time} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground text-xs font-mono flex-shrink-0 pt-0.5 w-16">{formatSlotTime(time)}</span>
                    <span className="text-foreground/80 leading-tight">{val as string}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                Nothing scheduled yet — add your first time block →
              </p>
            )}

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground group-hover:text-emerald-600 transition-colors flex items-center gap-0.5">
                View full day <ChevronRight size={11} />
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Section 3: Habit Progress Tracker ────────────────────────────── */}
      <Link href={`/weekly/${year}/${weekNumber}?tab=habits`}>
        <div className="planner-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-orange-500 flex-shrink-0" />
              <span className="font-bold text-sm">Habit Tracker — This Week</span>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-emerald-600 transition-colors flex items-center gap-0.5">
              View tracker <ChevronRight size={12} />
            </span>
          </div>

          {habitEntries.length > 0 ? (
            <>
              {/* Overall % + bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-3xl font-black text-foreground">{habitPct}%</span>
                  <span className="text-sm text-muted-foreground">this week</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", habitBarClass)}
                    style={{ width: `${habitPct}%` }}
                  />
                </div>
              </div>

              {/* Habit rows */}
              <div className="space-y-2 mb-4">
                {habitEntries.slice(0, 6).map(([name, h]: [string, any]) => {
                  const days = h.days as boolean[];
                  const done = days.filter(Boolean).length;
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-foreground/80 w-28 truncate flex-shrink-0">{name}</span>
                      <div className="flex items-center gap-1 flex-1">
                        {days.map((checked, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-4 h-4 rounded-full flex-shrink-0 transition-colors",
                              i === todayIdx
                                ? checked
                                  ? "bg-emerald-500 ring-2 ring-emerald-400 ring-offset-1"
                                  : "border-2 border-emerald-400 bg-transparent"
                                : checked
                                  ? "bg-emerald-500"
                                  : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 w-8 text-right">{done}/7</span>
                    </div>
                  );
                })}
              </div>

              {/* Today summary */}
              <div className="pt-2 border-t border-border flex items-center gap-1.5 text-sm">
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{todayHabitsDone}</span> of{" "}
                  <span className="font-semibold text-foreground">{habitEntries.length}</span> habits done today
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Set up your habit tracker in the Weekly Planner →
            </p>
          )}
        </div>
      </Link>

      {/* ── Section 4: Quarterly Review Prompt ───────────────────────────── */}
      <div className="planner-card relative overflow-hidden">
        {/* Amber accent strip */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400" />

        {/* Header */}
        <div className="flex items-center justify-between mb-3 mt-1">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-500 flex-shrink-0" />
            <span className="font-bold text-sm">Q{quarter} Progress Review</span>
          </div>
          <span className="text-xs text-muted-foreground">{quarterLabel}</span>
        </div>

        {/* Quarter progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">{quarterProgress}% through Q{quarter}</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
              style={{ width: `${quarterProgress}%` }}
            />
          </div>
        </div>

        {/* Big Goals 2x2 grid */}
        {bigGoals.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {bigGoals.slice(0, 4).map((goal: any, i) => (
              <div
                key={goal.id ?? i}
                className="flex items-center justify-between gap-1 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30"
              >
                <span className={cn("text-xs font-medium truncate", !(goal.title as string)?.trim() && "text-muted-foreground italic")}>
                  {(goal.title as string)?.trim() || `Goal ${i + 1}`}
                </span>
                <ChevronRight size={12} className="text-amber-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* CTA button */}
        <Link href="/annual">
          <div className="w-full text-center px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm cursor-pointer transition-all mb-2">
            Review Your Q{quarter} Progress →
          </div>
        </Link>

        {/* Sub-link */}
        <div className="text-center">
          <Link href={`/monthly/${year}/${month}`}>
            <span className="text-xs text-muted-foreground hover:text-amber-600 transition-colors cursor-pointer">
              Update monthly goals →
            </span>
          </Link>
        </div>
      </div>

    </div>
  );
}

/** Convert a "09:00" slot key into "9:00 AM" style */
function formatSlotTime(key: string): string {
  const [h, m] = key.split(":").map(Number);
  if (isNaN(h)) return key;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}
