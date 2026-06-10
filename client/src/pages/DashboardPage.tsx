import { useState, useEffect } from "react";
import { format, addDays, startOfISOWeek, getISOWeek, getISOWeekYear } from "date-fns";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  CalendarDays, Clock, Flame, Trophy, ChevronRight,
  CheckCircle2, TrendingUp, Star, Bell, BookOpen,
  Sparkles, Droplets, Share2, Moon, Send, Loader2,
  Instagram, Facebook, Twitter, Youtube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── helpers ───────────────────────────────────────────────────────────────────
function formatSlotTime(key: string): string {
  const [h, m] = key.split(":").map(Number);
  if (isNaN(h)) return key;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

const RATING_EMOJI: Record<number, string> = { 1: "😴", 2: "😐", 3: "💪", 4: "🔥", 5: "⚡" };
const RATING_LABEL: Record<number, string> = { 1: "Rest day", 2: "Getting by", 3: "Solid", 4: "Crushing it", 5: "On fire!" };
const RATING_COLOR: Record<number, string> = {
  1: "bg-slate-100 border-slate-200 text-slate-600",
  2: "bg-blue-50 border-blue-200 text-blue-600",
  3: "bg-emerald-50 border-emerald-200 text-emerald-700",
  4: "bg-orange-50 border-orange-200 text-orange-600",
  5: "bg-rose-50 border-rose-200 text-rose-600",
};

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram size={12} />, facebook: <Facebook size={12} />,
  twitter: <Twitter size={12} />, youtube: <Youtube size={12} />,
};

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const year = getISOWeekYear(now);
  const weekNumber = getISOWeek(now);
  const weekStart = startOfISOWeek(now);
  const month = now.getMonth() + 1;
  const hour = now.getHours();
  const [, navigate] = useLocation();

  const { user } = useAuth();

  // ── data fetches ─────────────────────────────────────────────────────────
  const { data: weekData } = trpc.weekly.get.useQuery({ year, weekNumber });
  const { data: dailyData } = trpc.daily.get.useQuery({ date: todayStr });
  const { data: bigGoals = [] } = trpc.bigGoals.list.useQuery({ year });
  const { data: monthlyData } = trpc.monthly.get.useQuery({ year, month });
  const { data: devotion } = trpc.devotion.getToday.useQuery(undefined, { staleTime: 3_600_000 });
  const { data: reminders = [] } = trpc.reminders.list.useQuery();
  const { data: myCheckIn, refetch: refetchCheckIn } = trpc.community.myCheckIn.useQuery({ date: todayStr });
  const checkInMutation = trpc.community.checkIn.useMutation({
    onSuccess: () => { refetchCheckIn(); toast.success("Check-in saved!"); },
  });
  const { data: streakData } = trpc.zion.streak.useQuery(undefined, { staleTime: 60_000 });
  const notifyStreakMutation = trpc.zion.checkAndNotifyStreak.useMutation();

  // On mount: silently check if streak was broken and queue a Zion note
  useEffect(() => {
    notifyStreakMutation.mutate();
  }, []);

  // ── greeting ──────────────────────────────────────────────────────────────
  const timeSlot =
    hour >= 5 && hour < 12 ? "morning" :
    hour >= 12 && hour < 17 ? "afternoon" :
    hour >= 17 && hour < 21 ? "evening" : "night";
  const greeting =
    timeSlot === "morning" ? "Good morning" :
    timeSlot === "afternoon" ? "Good afternoon" :
    timeSlot === "evening" ? "Good evening" : "Good night";
  const greetingEmoji =
    timeSlot === "morning" ? "🌅" : timeSlot === "afternoon" ? "☀️" :
    timeSlot === "evening" ? "🌆" : "🌙";
  const firstName = user?.name?.split(" ")[0] || "";
  const todayFormatted = format(now, "EEEE, MMMM d");

  // ── quarterly ─────────────────────────────────────────────────────────────
  const quarter = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4;
  const quarterMonths = quarter === 1 ? [1,2,3] : quarter === 2 ? [4,5,6] : quarter === 3 ? [7,8,9] : [10,11,12];
  const currentMonthInQuarter = ((month - 1) % 3) + 1;
  const quarterProgress = Math.round((currentMonthInQuarter / 3) * 100);
  const quarterLabel = (() => {
    const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${names[quarterMonths[0]-1]} – ${names[quarterMonths[2]-1]} ${year}`;
  })();

  // ── habit stats ───────────────────────────────────────────────────────────
  const habitEntries = Object.entries((weekData?.habitTracker as any) || {});
  const totalHabitChecks = habitEntries.reduce((sum, [, h]: [string, any]) =>
    sum + (h.days as boolean[]).filter(Boolean).length, 0);
  const totalPossible = habitEntries.length * 7;
  const habitPct = totalPossible > 0 ? Math.round((totalHabitChecks / totalPossible) * 100) : 0;
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const todayHabitsDone = habitEntries.filter(([, h]: [string, any]) => (h.days as boolean[])[todayIdx]).length;

  // ── today's schedule ──────────────────────────────────────────────────────
  const todaySlots = Object.entries((dailyData?.timeSlots as any) || {})
    .filter(([, v]) => v && (v as string).trim())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 5);
  const todayPriorities = ((dailyData?.topPriorities as string[]) || []).filter(Boolean).slice(0, 3);

  // ── chip colours ─────────────────────────────────────────────────────────
  const habitChipClass =
    habitPct >= 70 ? "bg-emerald-500/20 text-emerald-300" :
    habitPct >= 40 ? "bg-amber-500/20 text-amber-300" : "bg-rose-500/20 text-rose-300";
  const habitBarClass =
    habitPct >= 70 ? "bg-emerald-500" : habitPct >= 40 ? "bg-amber-500" : "bg-rose-500";

  // ── upcoming reminders (today + tomorrow only) ────────────────────────────
  const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
  const upcomingReminders = reminders
    .filter(r => !r.sent && (r.date === todayStr || r.date === tomorrow))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.timeSlot ?? "").localeCompare(b.timeSlot ?? ""))
    .slice(0, 3);

  // ── wins of the week ─────────────────────────────────────────────────────
  const wins = ((weekData as any)?.winsOfWeek as string || "")
    .split("\n").map((w: string) => w.trim()).filter(Boolean).slice(0, 4);

  // ── social posts today ────────────────────────────────────────────────────
  const DAY_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];
  const todayDayKey = DAY_KEYS[todayIdx];
  const socialPosts = (weekData?.socialPosts as Record<string, string> | null) || {};
  const todaySocialPosts = Object.entries(socialPosts)
    .filter(([k, v]) => k.endsWith(`_${todayIdx}`) && v?.trim())
    .map(([k, v]) => ({ platform: k.split("_")[0], text: v }))
    .slice(0, 3);

  // ── water intake ─────────────────────────────────────────────────────────
  const waterGlasses = (dailyData?.waterGlasses as number) ?? 0;
  const updateWaterMutation = trpc.daily.save.useMutation();
  const handleWater = (glasses: number) => {
    updateWaterMutation.mutate({ date: todayStr, data: { waterGlasses: glasses } });
  };

  // ── nightly reflection due? ───────────────────────────────────────────────
  const { data: nightlyStatus } = trpc.zion.checkNightlyPrompt.useQuery(undefined, {
    staleTime: 60_000,
  });
  const nightlyDue = nightlyStatus?.due && !nightlyStatus?.completed && hour >= 17;

  // ── Zion quick prompt ─────────────────────────────────────────────────────
  const [zionPrompt, setZionPrompt] = useState("");
  const handleZionPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zionPrompt.trim()) return;
    navigate(`/zion?q=${encodeURIComponent(zionPrompt.trim())}`);
    setZionPrompt("");
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

      {/* ── 1: Hero Greeting Bar ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#1a1230] to-[#2d1f4e] text-white rounded-2xl px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-2xl font-black">
              {greetingEmoji} {greeting}{firstName ? `, ${firstName}` : ""}!
            </p>
            <p className="text-sm text-white/70 mt-0.5">
              {todayFormatted}
              {nightlyDue && (
                <span className="ml-3 inline-flex items-center gap-1 text-violet-300 font-semibold animate-pulse">
                  <Moon size={12} /> Tonight's reflection is waiting →
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold">
              Week {weekNumber}
            </span>
            <span className={cn("px-3 py-1.5 rounded-full text-xs font-semibold", habitChipClass)}>
              {habitPct}% habits
            </span>
            {(monthlyData as any)?.themeWord && (
              <span className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold italic">
                ✨ {(monthlyData as any).themeWord}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2: Streak Counter ─────────────────────────────────────────────── */}
      {streakData !== undefined && (
        <div
          onClick={() => navigate("/zion")}
          className={cn(
            "planner-card cursor-pointer hover:shadow-md transition-all group",
            streakData.currentStreak === 0
              ? "border-amber-200 bg-amber-50/40"
              : streakData.currentStreak >= 7
              ? "border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50"
              : "border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Flame icon — grows with streak */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-110",
                streakData.currentStreak === 0 ? "bg-amber-100" :
                streakData.currentStreak >= 30 ? "bg-orange-500 shadow-lg shadow-orange-200" :
                streakData.currentStreak >= 7 ? "bg-orange-400 shadow-md shadow-orange-100" :
                "bg-emerald-100"
              )}>
                {streakData.currentStreak === 0 ? "💤" :
                 streakData.currentStreak >= 30 ? "🔥" :
                 streakData.currentStreak >= 7 ? "🔥" : "✨"}
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn(
                    "text-3xl font-black",
                    streakData.currentStreak === 0 ? "text-amber-600" :
                    streakData.currentStreak >= 7 ? "text-orange-600" : "text-emerald-700"
                  )}>
                    {streakData.currentStreak}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">
                    day{streakData.currentStreak !== 1 ? "s" : ""} in a row
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {streakData.currentStreak === 0
                    ? streakData.lastActiveDate
                      ? "You missed yesterday — today's the perfect day to restart 💛"
                      : "Start your streak today — open the planner and get to work ✨"
                    : streakData.currentStreak === 1
                    ? "Great start! Show up again tomorrow to build momentum 💪"
                    : streakData.currentStreak < 7
                    ? `Keep going — ${7 - streakData.currentStreak} more day${7 - streakData.currentStreak !== 1 ? "s" : ""} to your first week streak 🎯`
                    : streakData.currentStreak < 30
                    ? `You're on a roll! Don't break the chain 🔥`
                    : `Legendary consistency — ${streakData.currentStreak} days strong! 🏆`
                  }
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              {streakData.longestStreak > 0 && (
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Best</p>
                  <p className="text-sm font-bold text-muted-foreground">{streakData.longestStreak}d</p>
                </div>
              )}
              {streakData.isActiveToday && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                  <CheckCircle2 size={10} /> Today ✓
                </span>
              )}
              <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </div>
          </div>

          {/* Milestone badges */}
          {streakData.currentStreak >= 3 && (
            <div className="mt-3 pt-3 border-t border-current/5 flex gap-2 flex-wrap">
              {[
                { days: 3, label: "3-day", emoji: "⚡" },
                { days: 7, label: "Week", emoji: "🗓️" },
                { days: 14, label: "2 Weeks", emoji: "💪" },
                { days: 30, label: "Month", emoji: "🏆" },
              ].map(({ days, label, emoji }) => (
                <div
                  key={days}
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1",
                    streakData.currentStreak >= days
                      ? "bg-orange-100 text-orange-700"
                      : "bg-muted/50 text-muted-foreground/40"
                  )}
                >
                  {emoji} {label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Daily Devotion ────────────────────────────────────────────────── */}
      {devotion && !devotion.dismissed && (
        <div className="planner-card relative overflow-hidden border-0"
          style={{ background: "linear-gradient(135deg,#1a1230 0%,#2d1f4e 100%)" }}>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10 bg-white" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} className="text-white/60" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Daily Word</p>
              {devotion.theme && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-semibold">
                  {devotion.theme}
                </span>
              )}
            </div>
            <blockquote className="text-sm text-white/90 font-medium leading-relaxed mb-1 italic">
              "{devotion.verse}"
            </blockquote>
            <p className="text-xs text-white/50 mb-3">— {devotion.verseRef}</p>
            <div className="flex items-start gap-2 pt-3 border-t border-white/10">
              <Sparkles size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-300 leading-relaxed">{devotion.affirmation}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 3: Community Check-in ──────────────────────────────────────────── */}
      <div className="planner-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-amber-500 flex-shrink-0" />
            <span className="font-bold text-sm">How are you showing up today?</span>
          </div>
          {myCheckIn && (
            <span className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full border",
              RATING_COLOR[myCheckIn.rating]
            )}>
              {RATING_EMOJI[myCheckIn.rating]} {RATING_LABEL[myCheckIn.rating]}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {[1,2,3,4,5].map(r => (
            <button
              key={r}
              onClick={() => checkInMutation.mutate({ date: todayStr, rating: r })}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all text-lg",
                myCheckIn?.rating === r
                  ? "border-foreground bg-foreground/5 scale-105"
                  : "border-border hover:border-foreground/30 hover:bg-muted/50"
              )}
              title={RATING_LABEL[r]}
            >
              {RATING_EMOJI[r]}
              <span className="text-[9px] text-muted-foreground font-medium hidden sm:block">{RATING_LABEL[r]}</span>
            </button>
          ))}
        </div>
        {myCheckIn && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Checked in · <Link href="/community"><span className="underline cursor-pointer hover:text-foreground">See community →</span></Link>
          </p>
        )}
      </div>

      {/* ── 4: This Week + Today's Schedule ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* This Week at a Glance */}
        <Link href={`/weekly/${year}/${weekNumber}`}>
          <div className="planner-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group h-full">
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
                {(weekData as any).wordOfWeek && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Word of the Week</p>
                    <p className="text-xl font-black text-foreground">{(weekData as any).wordOfWeek}</p>
                  </div>
                )}
                {(weekData as any).topBusinessGoals && (
                  <div className="mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Business Goals</p>
                    <p className="text-sm text-foreground/80 line-clamp-2">
                      {((weekData as any).topBusinessGoals as string).slice(0, 80)}
                      {((weekData as any).topBusinessGoals as string).length > 80 ? "…" : ""}
                    </p>
                  </div>
                )}
                {(weekData as any).weekIntentions && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Intentions</p>
                    <p className="text-sm text-foreground/80 line-clamp-2">
                      {((weekData as any).weekIntentions as string).slice(0, 80)}
                      {((weekData as any).weekIntentions as string).length > 80 ? "…" : ""}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                  <span>{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-500" />
                    {totalHabitChecks} habit checks
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Start planning your week →</p>
            )}
          </div>
        </Link>

        {/* Today's Schedule */}
        <Link href={`/weekly/${year}/${weekNumber}`}>
          <div className="planner-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-emerald-600 flex-shrink-0" />
                <span className="font-bold text-sm">Today</span>
              </div>
            </div>
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
              <p className="text-sm text-muted-foreground py-2">Nothing scheduled yet — add your first time block →</p>
            )}
            <div className="mt-3 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground group-hover:text-emerald-600 transition-colors flex items-center gap-0.5">
                View full day <ChevronRight size={11} />
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── 5: Upcoming Reminders + Social Posts Today ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Upcoming Reminders */}
        <div className="planner-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-foreground flex-shrink-0" />
              <span className="font-bold text-sm">Upcoming Reminders</span>
            </div>
          </div>
          {upcomingReminders.length > 0 ? (
            <div className="space-y-2">
              {upcomingReminders.map(r => (
                <div key={r.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border">
                  <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell size={11} className="text-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.date === todayStr ? "Today" : "Tomorrow"}
                      {r.timeSlot && ` · ${r.timeSlot}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No reminders due today or tomorrow.</p>
          )}
          <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground flex items-center gap-0.5 cursor-pointer hover:text-foreground transition-colors"
            onClick={() => window.dispatchEvent(new CustomEvent("bdb:open-panel", { detail: "openReminders" }))}>
            Manage reminders <ChevronRight size={11} />
          </div>
        </div>

        {/* Social Posts Today */}
        <div className="planner-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Share2 size={16} className="text-violet-500 flex-shrink-0" />
              <span className="font-bold text-sm">Post Today</span>
            </div>
            <Link href={`/weekly/${year}/${weekNumber}?tab=social`}>
              <span className="text-xs text-muted-foreground hover:text-violet-500 transition-colors flex items-center gap-0.5 cursor-pointer">
                Edit <ChevronRight size={11} />
              </span>
            </Link>
          </div>
          {todaySocialPosts.length > 0 ? (
            <div className="space-y-2">
              {todaySocialPosts.map(({ platform, text }, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30">
                  <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-white">
                    {SOCIAL_ICONS[platform] ?? <Share2 size={11} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-violet-600 capitalize mb-0.5">{platform}</p>
                    <p className="text-xs text-foreground/80 line-clamp-2">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2 text-center">
              <p className="text-sm text-muted-foreground">No posts scheduled for today.</p>
              <Link href={`/weekly/${year}/${weekNumber}?tab=social`}>
                <p className="text-xs text-violet-500 mt-1 cursor-pointer hover:underline">Plan your content →</p>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── 6: Habit Tracker ─────────────────────────────────────────────── */}
      <Link href={`/weekly/${year}/${weekNumber}?tab=habits`}>
        <div className="planner-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group">
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
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-3xl font-black text-foreground">{habitPct}%</span>
                  <span className="text-sm text-muted-foreground">this week</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", habitBarClass)} style={{ width: `${habitPct}%` }} />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {habitEntries.slice(0, 6).map(([name, h]: [string, any]) => {
                  const days = h.days as boolean[];
                  const done = days.filter(Boolean).length;
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-foreground/80 w-28 truncate flex-shrink-0">{name}</span>
                      <div className="flex items-center gap-1 flex-1">
                        {days.map((checked, i) => (
                          <div key={i} className={cn(
                            "w-4 h-4 rounded-full flex-shrink-0 transition-colors",
                            i === todayIdx
                              ? checked ? "bg-emerald-500 ring-2 ring-emerald-400 ring-offset-1" : "border-2 border-emerald-400 bg-transparent"
                              : checked ? "bg-emerald-500" : "bg-muted"
                          )} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 w-8 text-right">{done}/7</span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-border flex items-center gap-1.5 text-sm">
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{todayHabitsDone}</span> of{" "}
                  <span className="font-semibold text-foreground">{habitEntries.length}</span> habits done today
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-2">Set up your habit tracker in the Weekly Planner →</p>
          )}
        </div>
      </Link>

      {/* ── 7: Wins of the Week + Water Intake ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Wins of the Week */}
        <div className="planner-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600 flex-shrink-0" />
              <span className="font-bold text-sm">Wins This Week</span>
            </div>
            <Link href={`/weekly/${year}/${weekNumber}`}>
              <span className="text-xs text-muted-foreground hover:text-emerald-600 transition-colors flex items-center gap-0.5 cursor-pointer">
                Log wins <ChevronRight size={11} />
              </span>
            </Link>
          </div>
          {wins.length > 0 ? (
            <ul className="space-y-2">
              {wins.map((win, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-emerald-500 font-bold mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-foreground/80 leading-snug">{win}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-3 text-center">
              <p className="text-sm text-muted-foreground">No wins logged yet — celebrate something!</p>
              <Link href={`/weekly/${year}/${weekNumber}`}>
                <p className="text-xs text-emerald-600 mt-1 cursor-pointer hover:underline">Add a win →</p>
              </Link>
            </div>
          )}
        </div>

        {/* Water Intake */}
        <div className="planner-card">
          <div className="flex items-center gap-2 mb-3">
            <Droplets size={16} className="text-blue-500 flex-shrink-0" />
            <span className="font-bold text-sm">Water Today</span>
            <span className="ml-auto text-sm font-bold text-blue-600">{waterGlasses} / 8 glasses</span>
          </div>
          <div className="flex gap-1.5 mb-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <button
                key={i}
                onClick={() => handleWater(i < waterGlasses ? i : i + 1)}
                className={cn(
                  "flex-1 h-8 rounded-lg transition-all border-2",
                  i < waterGlasses
                    ? "bg-blue-400 border-blue-400"
                    : "bg-muted border-border hover:border-blue-300"
                )}
                title={`${i + 1} glass${i > 0 ? "es" : ""}`}
              >
                <Droplets size={12} className={cn("mx-auto", i < waterGlasses ? "text-white" : "text-muted-foreground/30")} />
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {waterGlasses === 0 ? "Tap a drop to log your water 💧" :
             waterGlasses < 4 ? "Keep going — stay hydrated!" :
             waterGlasses < 8 ? "Great progress! Almost there." :
             "💧 Hydration goal reached!"}
          </p>
        </div>
      </div>

      {/* ── 8: Quarterly Review ──────────────────────────────────────────── */}
      <div className="planner-card relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
        <div className="flex items-center justify-between mb-3 mt-1">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-500 flex-shrink-0" />
            <span className="font-bold text-sm">Q{quarter} Progress Review</span>
          </div>
          <span className="text-xs text-muted-foreground">{quarterLabel}</span>
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">{quarterProgress}% through Q{quarter}</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
              style={{ width: `${quarterProgress}%` }} />
          </div>
        </div>
        {bigGoals.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {bigGoals.slice(0, 4).map((goal: any, i) => (
              <div key={goal.id ?? i}
                className="flex items-center justify-between gap-1 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30">
                <span className={cn("text-xs font-medium truncate", !(goal.title as string)?.trim() && "text-muted-foreground italic")}>
                  {(goal.title as string)?.trim() || `Goal ${i + 1}`}
                </span>
                <ChevronRight size={12} className="text-amber-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
        <Link href="/annual">
          <div className="w-full text-center px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm cursor-pointer transition-all mb-2">
            Review Your Q{quarter} Progress →
          </div>
        </Link>
        <div className="text-center">
          <Link href={`/monthly/${year}/${month}`}>
            <span className="text-xs text-muted-foreground hover:text-amber-600 transition-colors cursor-pointer">
              Update monthly goals →
            </span>
          </Link>
        </div>
      </div>

      {/* ── 9: Ask Zion ──────────────────────────────────────────────────── */}
      <div className="planner-card bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border border-emerald-100 dark:border-emerald-800/30">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-emerald-800 dark:text-emerald-300">Ask Zion anything</p>
            <p className="text-[11px] text-emerald-600/70">Your AI wellness coach is here</p>
          </div>
        </div>
        <form onSubmit={handleZionPrompt} className="flex gap-2">
          <input
            type="text"
            value={zionPrompt}
            onChange={e => setZionPrompt(e.target.value)}
            placeholder="What do you need help with today?"
            className="flex-1 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 placeholder:text-muted-foreground/50"
          />
          <button
            type="submit"
            disabled={!zionPrompt.trim()}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-colors flex items-center gap-1.5 text-sm font-semibold"
          >
            <Send size={13} /> Ask
          </button>
        </form>
        <div className="flex gap-2 mt-2 flex-wrap">
          {["Plan my week", "Help me with my goals", "I need motivation"].map(s => (
            <button key={s} onClick={() => navigate(`/zion?q=${encodeURIComponent(s)}`)}
              className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition-colors">
              {s}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
