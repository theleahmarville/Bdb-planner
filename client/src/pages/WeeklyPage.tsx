import { useState, useCallback, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import EditableField from "@/components/EditableField";
import SaveIndicator from "@/components/SaveIndicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  generateTimeSlots,
  formatTimeSlot,
  getNextSlot,
  buildGoogleCalendarUrl,
  DAY_NAMES,
  DAY_NAMES_FULL,
  SOCIAL_PLATFORMS,
} from "@/lib/planner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Droplets,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { format, addDays, startOfISOWeek, getISOWeek, getISOWeekYear } from "date-fns";
import { toast } from "sonner";
import SocialAccountsPanel from "@/components/SocialAccountsPanel";
import SectionAttachments from "@/components/SectionAttachments";
import ReminderDialog from "@/components/ReminderDialog";

const TIME_SLOTS = generateTimeSlots();
const DEFAULT_HABITS = ["Vitamins", "Exercise", "Meditation", "Water (8 glasses)"];

function getWeekStartFromWeekNum(year: number, week: number): Date {
  // ISO week: week 1 is the week containing the first Thursday of the year
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = startOfISOWeek(jan4);
  return addDays(startOfWeek1, (week - 1) * 7);
}

export default function WeeklyPage() {
  const params = useParams<{ year: string; week: string }>();
  const year = parseInt(params.year || String(getISOWeekYear(new Date())));
  const weekNumber = parseInt(params.week || String(getISOWeek(new Date())));

  const weekStart = getWeekStartFromWeekNum(year, weekNumber);
  const weekStartDate = format(weekStart, "yyyy-MM-dd");
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const prevWeek = weekNumber === 1 ? { y: year - 1, w: 52 } : { y: year, w: weekNumber - 1 };
  const nextWeek = weekNumber >= 52 ? { y: year + 1, w: 1 } : { y: year, w: weekNumber + 1 };

  const { isAuthenticated } = useAuth();
  const { data: weekData } = trpc.weekly.get.useQuery({ year, weekNumber });
  const { data: dailyDataArr } = trpc.daily.get.useQuery({ date: weekStartDate });
  const saveMutation = trpc.weekly.save.useMutation();
  const saveDailyMutation = trpc.daily.save.useMutation();

  const [weekLocal, setWeekLocal] = useState<Record<string, any>>({});
  const [dailyLocal, setDailyLocal] = useState<Record<string, Record<string, any>>>({});
  const [initialized, setInitialized] = useState(false);
  const [activeDay, setActiveDay] = useState(0); // 0=Mon, 6=Sun

  // Reminder dialog state
  const [reminderDialog, setReminderDialog] = useState<{
    open: boolean;
    date: string;
    time: string;
    title: string;
    timeSlot: string;
  }>({ open: false, date: "", time: "", title: "", timeSlot: "" });

  // Google Calendar status
  const { data: gcalStatus } = trpc.googleCalendar.status.useQuery(undefined, { staleTime: 60_000 });
  const pushGcalMutation = trpc.googleCalendar.pushEvent.useMutation();

  // Initialize weekly data
  useEffect(() => {
    if (weekData && !initialized) {
      setWeekLocal({
        wordOfWeek: weekData.wordOfWeek || "",
        affirmation: weekData.affirmation || "",
        bibleVerse: weekData.bibleVerse || "",
        bibleReference: weekData.bibleReference || "",
        topBusinessGoals: weekData.topBusinessGoals || "",
        weekIntentions: weekData.weekIntentions || "",
        wellnessTasks: weekData.wellnessTasks || "",
        moneyEarned: weekData.moneyEarned || "",
        moneySpent: weekData.moneySpent || "",
        winsOfWeek: weekData.winsOfWeek || "",
        notes: weekData.notes || "",
        socialPosts: (weekData.socialPosts as any) || {},
        habitTracker: (weekData.habitTracker as any) || buildDefaultHabits(),
      });
      setInitialized(true);
    }
  }, [weekData, initialized]);

  // Reset on week change
  useEffect(() => {
    setInitialized(false);
    setWeekLocal({});
    setDailyLocal({});
  }, [year, weekNumber]);

  function buildDefaultHabits() {
    const tracker: Record<string, any> = {};
    DEFAULT_HABITS.forEach((name) => {
      tracker[name.toLowerCase().replace(/\s+/g, "_")] = {
        name,
        days: [false, false, false, false, false, false, false],
      };
    });
    return tracker;
  }

  const saveWeekly = useCallback(
    async (data: Record<string, any>) => {
      await saveMutation.mutateAsync({ year, weekNumber, weekStartDate, data });
    },
    [saveMutation, year, weekNumber, weekStartDate]
  );

  const { save: autoSave, status: saveStatus } = useAutoSave(saveWeekly, 1200);

  const updateWeek = (key: string, value: any) => {
    const updated = { ...weekLocal, [key]: value };
    setWeekLocal(updated);
    autoSave(updated);
  };

  // Daily data helpers
  const getDayDate = (dayIdx: number) => format(weekDates[dayIdx], "yyyy-MM-dd");

  const getDayData = (dayIdx: number) => {
    const date = getDayDate(dayIdx);
    return dailyLocal[date] || {
      topPriorities: ["", "", "", "", ""],
      timeSlots: {},
      gratitude: ["", "", "", "", ""],
      dailyWins: ["", "", "", "", ""],
      waterGlasses: 0,
    };
  };

  const updateDayData = (dayIdx: number, key: string, value: any) => {
    const date = getDayDate(dayIdx);
    const current = getDayData(dayIdx);
    const updated = { ...current, [key]: value };
    setDailyLocal((prev) => ({ ...prev, [date]: updated }));
    saveDailyMutation.mutate({ date, data: updated });
  };

  // Habit tracker
  const toggleHabit = (habitKey: string, dayIdx: number) => {
    const tracker = { ...(weekLocal.habitTracker || buildDefaultHabits()) };
    if (!tracker[habitKey]) return;
    const days = [...tracker[habitKey].days];
    days[dayIdx] = !days[dayIdx];
    tracker[habitKey] = { ...tracker[habitKey], days };
    updateWeek("habitTracker", tracker);
  };

  const addCustomHabit = () => {
    const tracker = { ...(weekLocal.habitTracker || buildDefaultHabits()) };
    const key = `custom_${Date.now()}`;
    tracker[key] = { name: "New Habit", days: [false, false, false, false, false, false, false] };
    updateWeek("habitTracker", tracker);
  };

  const removeHabit = (habitKey: string) => {
    const tracker = { ...(weekLocal.habitTracker || buildDefaultHabits()) };
    delete tracker[habitKey];
    updateWeek("habitTracker", tracker);
  };

  const updateHabitName = (habitKey: string, name: string) => {
    const tracker = { ...(weekLocal.habitTracker || buildDefaultHabits()) };
    if (!tracker[habitKey]) return;
    tracker[habitKey] = { ...tracker[habitKey], name };
    updateWeek("habitTracker", tracker);
  };

  // Google Calendar — direct push if connected, otherwise open new tab
  const addToGoogleCalendar = async (dayIdx: number, slot: string, text: string) => {
    if (!text.trim()) {
      toast.error("Please add a title to the time slot first.");
      return;
    }
    const date = getDayDate(dayIdx);
    const endSlot = getNextSlot(slot);

    if (gcalStatus?.connected) {
      try {
        await pushGcalMutation.mutateAsync({
          title: text,
          date,
          startTime: slot,
          endTime: endSlot,
        });
        toast.success("Event added to Google Calendar!");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to push to Google Calendar.";
        toast.error(message);
      }
    } else {
      const url = buildGoogleCalendarUrl({ title: text, date, startTime: slot, endTime: endSlot });
      window.open(url, "_blank");
      toast.success("Opening Google Calendar...");
    }
  };

  // Open reminder dialog for a time slot
  const openReminderDialog = (dayIdx: number, slot: string, text: string) => {
    const date = getDayDate(dayIdx);
    setReminderDialog({ open: true, date, time: slot, title: text, timeSlot: slot });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Sign in to access your planner</h2>
          <a href={getLoginUrl()}><Button size="lg">Sign In</Button></a>
        </div>
      </div>
    );
  }

  const habitEntries = Object.entries(weekLocal.habitTracker || buildDefaultHabits());

  return (
    <div className="p-4 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href={`/weekly/${prevWeek.y}/${prevWeek.w}`}>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className="text-base md:text-2xl font-black tracking-tight">
              <span className="hidden sm:inline">Week {weekNumber} — {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}</span>
              <span className="sm:hidden">Wk {weekNumber} · {format(weekStart, "MMM d")}–{format(addDays(weekStart, 6), "d")}</span>
            </h1>
            <p className="text-muted-foreground text-xs">Weekly Planner</p>
          </div>
          <Link href={`/weekly/${nextWeek.y}/${nextWeek.w}`}>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight size={18} />
            </button>
          </Link>
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      <Tabs defaultValue="schedule">
        <div className="tabs-scroll mb-4">
        <TabsList className="flex flex-nowrap md:flex-wrap gap-1 h-auto bg-muted p-1 rounded-xl w-max md:w-full">
          {[
            { value: "schedule", label: "Schedule" },
            { value: "intentions", label: "Intentions" },
            { value: "habits", label: "Habits" },
            { value: "finances", label: "Finances" },
            { value: "social", label: "Social Posts" },
            { value: "wins", label: "Wins & Notes" },
          ].map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-3 py-1.5">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        </div>

        {/* ── Schedule (7-day time slots) ── */}
        <TabsContent value="schedule">
          {/* Day tabs */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {weekDates.map((date, idx) => {
              const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              return (
                <button
                  key={idx}
                  onClick={() => setActiveDay(idx)}
                  className={cn(
                    "flex flex-col items-center px-4 py-2 rounded-xl border transition-colors flex-shrink-0 min-w-[72px]",
                    activeDay === idx
                      ? "bg-foreground text-background border-foreground"
                      : "border-border hover:bg-muted",
                    isToday && activeDay !== idx && "border-foreground/50"
                  )}
                >
                  <span className="text-xs font-medium">{DAY_NAMES[idx]}</span>
                  <span className={cn("text-lg font-black", isToday && activeDay !== idx && "text-foreground")}>{format(date, "d")}</span>
                  <span className="text-xs opacity-60">{format(date, "MMM")}</span>
                </button>
              );
            })}
          </div>

          {/* Day view */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Time slots */}
            <div className="lg:col-span-2 planner-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">{DAY_NAMES_FULL[activeDay]}, {format(weekDates[activeDay], "MMMM d")}</h3>
                <span className="text-xs text-muted-foreground">Click to edit • Hover for calendar & reminder</span>
              </div>

              <div className="space-y-0.5">
                {TIME_SLOTS.map((slot) => {
                  const dayData = getDayData(activeDay);
                  const slotValue = (dayData.timeSlots as any)?.[slot] || "";
                  return (
                    <div key={slot} className="flex items-start gap-2 py-1 border-b border-border/30 group">
                      <span className="text-xs text-muted-foreground w-16 flex-shrink-0 pt-1.5 font-mono">
                        {formatTimeSlot(slot)}
                      </span>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={slotValue}
                          onChange={(e) => {
                            const dayData = getDayData(activeDay);
                            const slots = { ...(dayData.timeSlots as any || {}), [slot]: e.target.value };
                            updateDayData(activeDay, "timeSlots", slots);
                          }}
                          placeholder="Add event..."
                          className={cn(
                            "w-full bg-transparent text-sm py-1 px-2 rounded",
                            "border border-transparent hover:border-border focus:border-primary focus:outline-none",
                            "placeholder:text-muted-foreground/40 transition-colors"
                          )}
                        />
                      </div>
                      <button
                        onClick={() => addToGoogleCalendar(activeDay, slot, slotValue)}
                        className={cn(
                          "p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all",
                          "opacity-0 group-hover:opacity-100 flex-shrink-0"
                        )}
                        title={gcalStatus?.connected ? "Push to Google Calendar" : "Open in Google Calendar"}
                      >
                        <CalendarPlus size={14} />
                      </button>
                      <button
                        onClick={() => openReminderDialog(activeDay, slot, slotValue)}
                        className={cn(
                          "p-1.5 rounded transition-all flex-shrink-0",
                          "opacity-0 group-hover:opacity-100",
                          "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        title="Set reminder"
                      >
                        <Bell size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right panel: Priorities + Gratitude + Water */}
            <div className="space-y-4">
              {/* Top Priorities */}
              <div className="planner-card">
                <div className="planner-pill mb-3">Top Priorities</div>
                {(getDayData(activeDay).topPriorities as string[] || ["", "", "", "", ""]).map((p: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-full border-2 border-foreground flex-shrink-0 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <input
                      type="text"
                      value={p}
                      onChange={(e) => {
                        const priorities = [...(getDayData(activeDay).topPriorities as string[] || ["", "", "", "", ""])];
                        priorities[idx] = e.target.value;
                        updateDayData(activeDay, "topPriorities", priorities);
                      }}
                      placeholder={`Priority ${idx + 1}...`}
                      className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-sm py-0.5"
                    />
                  </div>
                ))}
              </div>

              {/* Gratitude */}
              <div className="planner-card">
                <div className="planner-pill mb-3">Gratitude</div>
                <p className="text-xs text-muted-foreground mb-2">Today I am grateful for...</p>
                {(getDayData(activeDay).gratitude as string[] || ["", "", "", "", ""]).map((g: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 mb-1.5">
                    <span className="text-muted-foreground text-xs w-3">{idx + 1}.</span>
                    <input
                      type="text"
                      value={g}
                      onChange={(e) => {
                        const gratitude = [...(getDayData(activeDay).gratitude as string[] || ["", "", "", "", ""])];
                        gratitude[idx] = e.target.value;
                        updateDayData(activeDay, "gratitude", gratitude);
                      }}
                      placeholder="I'm grateful for..."
                      className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-sm py-0.5"
                    />
                  </div>
                ))}
              </div>

              {/* Daily Wins */}
              <div className="planner-card">
                <div className="planner-pill mb-3">Daily Wins 🏆</div>
                <p className="text-xs text-muted-foreground mb-2">Today I am proud of...</p>
                {(getDayData(activeDay).dailyWins as string[] || ["", "", "", "", ""]).map((w: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 mb-1.5">
                    <span className="text-emerald-600 text-sm">★</span>
                    <input
                      type="text"
                      value={w}
                      onChange={(e) => {
                        const wins = [...(getDayData(activeDay).dailyWins as string[] || ["", "", "", "", ""])];
                        wins[idx] = e.target.value;
                        updateDayData(activeDay, "dailyWins", wins);
                      }}
                      placeholder={`Win ${idx + 1}...`}
                      className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-sm py-0.5"
                    />
                  </div>
                ))}
              </div>

              {/* Water Intake */}
              <div className="planner-card">
                <div className="planner-pill mb-3">Water Intake</div>
                <p className="text-xs text-muted-foreground mb-3">Goal: 8 glasses</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 8 }, (_, i) => {
                    const filled = (getDayData(activeDay).waterGlasses as number || 0) > i;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          const current = getDayData(activeDay).waterGlasses as number || 0;
                          updateDayData(activeDay, "waterGlasses", filled ? i : i + 1);
                        }}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors",
                          filled
                            ? "bg-blue-500 border-blue-500 text-white"
                            : "border-blue-300 text-blue-300 hover:border-blue-400"
                        )}
                        title={`Glass ${i + 1}`}
                      >
                        <Droplets size={14} />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {getDayData(activeDay).waterGlasses as number || 0} / 8 glasses
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Intentions ── */}
        <TabsContent value="intentions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="planner-card">
              <div className="planner-pill mb-3">Word of the Week</div>
              <EditableField value={weekLocal.wordOfWeek || ""} onChange={(v) => updateWeek("wordOfWeek", v)} placeholder="Your word for this week..." className="text-2xl font-black" />
            </div>
            <div className="planner-card">
              <div className="planner-pill mb-3">Weekly Affirmation</div>
              <EditableField value={weekLocal.affirmation || ""} onChange={(v) => updateWeek("affirmation", v)} placeholder="I am..." multiline rows={3} />
            </div>
            <div className="planner-card">
              <div className="planner-pill mb-3">Bible Verse / Quote</div>
              <EditableField value={weekLocal.bibleVerse || ""} onChange={(v) => updateWeek("bibleVerse", v)} placeholder="Your verse or quote..." multiline rows={4} />
              <EditableField value={weekLocal.bibleReference || ""} onChange={(v) => updateWeek("bibleReference", v)} placeholder="Reference / Source" className="text-sm text-muted-foreground mt-2" />
            </div>
            <div className="planner-card">
              <div className="planner-pill mb-3">This Week's Intentions</div>
              <EditableField value={weekLocal.weekIntentions || ""} onChange={(v) => updateWeek("weekIntentions", v)} placeholder="What do you intend to accomplish..." multiline rows={6} />
            </div>
            <div className="planner-card">
              <div className="planner-pill mb-3">Top Business Goals</div>
              <EditableField value={weekLocal.topBusinessGoals || ""} onChange={(v) => updateWeek("topBusinessGoals", v)} placeholder="Key business priorities this week..." multiline rows={6} />
            </div>
            <div className="planner-card">
              <div className="planner-pill mb-3">Wellness / Personal</div>
              <EditableField value={weekLocal.wellnessTasks || ""} onChange={(v) => updateWeek("wellnessTasks", v)} placeholder="Self-care and wellness tasks..." multiline rows={6} />
            </div>
          </div>
        </TabsContent>

        {/* ── Habits ── */}
        <TabsContent value="habits">
          <div className="planner-card">
            <div className="flex items-center justify-between mb-4">
              <div className="planner-pill">Daily Habit Tracker</div>
              <Button variant="outline" size="sm" onClick={addCustomHabit}>
                <Plus size={14} className="mr-1" /> Add Habit
              </Button>
            </div>

            {/* Header row */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 text-sm font-semibold min-w-[160px]">Habit</th>
                    {weekDates.map((date, idx) => (
                      <th key={idx} className="text-center py-2 px-2 text-xs font-medium text-muted-foreground min-w-[48px]">
                        <div>{DAY_NAMES[idx]}</div>
                        <div className="font-bold text-foreground">{format(date, "d")}</div>
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {habitEntries.map(([habitKey, habit]: [string, any]) => (
                    <tr key={habitKey} className="border-t border-border/50">
                      <td className="py-2 pr-4">
                        <input
                          type="text"
                          value={habit.name}
                          onChange={(e) => updateHabitName(habitKey, e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-sm font-medium w-full"
                        />
                      </td>
                      {(habit.days as boolean[]).map((checked: boolean, dayIdx: number) => (
                        <td key={dayIdx} className="text-center py-2 px-2">
                          <button
                            onClick={() => toggleHabit(habitKey, dayIdx)}
                            className={cn(
                              "w-7 h-7 rounded border-2 mx-auto flex items-center justify-center transition-colors",
                              checked
                                ? "bg-foreground border-foreground text-background"
                                : "border-border hover:border-foreground"
                            )}
                          >
                            {checked && <Check size={12} />}
                          </button>
                        </td>
                      ))}
                      <td className="py-2">
                        <button
                          onClick={() => removeHabit(habitKey)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Progress summary */}
            <div className="mt-6 pt-4 border-t border-border">
              <h4 className="text-sm font-semibold mb-3">Weekly Progress</h4>
              <div className="space-y-2">
                {habitEntries.map(([habitKey, habit]: [string, any]) => {
                  const completed = (habit.days as boolean[]).filter(Boolean).length;
                  const pct = Math.round((completed / 7) * 100);
                  return (
                    <div key={habitKey} className="flex items-center gap-3">
                      <span className="text-xs w-32 truncate">{habit.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-foreground transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{completed}/7 days</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Finances ── */}
        <TabsContent value="finances">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="planner-card">
              <div className="planner-pill mb-3">Money Earned</div>
              <EditableField
                value={weekLocal.moneyEarned || ""}
                onChange={(v) => updateWeek("moneyEarned", v)}
                placeholder="Income this week..."
                multiline rows={10}
              />
            </div>
            <div className="planner-card">
              <div className="planner-pill mb-3">Money Spent</div>
              <EditableField
                value={weekLocal.moneySpent || ""}
                onChange={(v) => updateWeek("moneySpent", v)}
                placeholder="Expenses this week..."
                multiline rows={10}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Social Posts ── */}
        <TabsContent value="social">
          <div className="planner-card">
            <div className="planner-pill mb-4">Social Media Posts This Week</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground min-w-[100px]">Platform</th>
                    {weekDates.map((date, idx) => (
                      <th key={idx} className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground min-w-[80px]">
                        {DAY_NAMES[idx]}<br />{format(date, "M/d")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <tr key={platform.key} className="border-b border-border/50">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: platform.color }}
                          >
                            {platform.icon.toUpperCase().slice(0, 2)}
                          </div>
                          <span className="text-xs font-medium">{platform.label}</span>
                        </div>
                      </td>
                      {weekDates.map((_, dayIdx) => {
                        const key = `${platform.key}_${dayIdx}`;
                        const value = (weekLocal.socialPosts as any)?.[key] || "";
                        return (
                          <td key={dayIdx} className="py-1 px-1">
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => {
                                const posts = { ...(weekLocal.socialPosts as any || {}), [key]: e.target.value };
                                updateWeek("socialPosts", posts);
                              }}
                              placeholder="Post..."
                              className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-xs py-1"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <SocialAccountsPanel />
          </div>
        </TabsContent>

        {/* ── Wins & Notes ── */}
        <TabsContent value="wins">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="planner-card">
              <div className="planner-pill mb-3">Wins of the Week</div>
              <p className="text-xs text-muted-foreground mb-3">Celebrate your victories, big and small!</p>
              <EditableField
                value={weekLocal.winsOfWeek || ""}
                onChange={(v) => updateWeek("winsOfWeek", v)}
                placeholder="This week I accomplished..."
                multiline rows={12}
              />
            </div>
            <div className="planner-card">
              <div className="planner-pill mb-3">Notes</div>
              <EditableField
                value={weekLocal.notes || ""}
                onChange={(v) => updateWeek("notes", v)}
                placeholder="Additional notes, ideas, reminders..."
                multiline rows={12}
              />
            </div>
          </div>
          <div className="mt-4">
            <SectionAttachments sectionKey={`weekly-${year}-${weekNumber}-wins`} section="weekly" label="Attach files, receipts, or references" />
          </div>
        </TabsContent>
      </Tabs>

      {/* Reminder Dialog */}
      <ReminderDialog
        open={reminderDialog.open}
        onClose={() => setReminderDialog(prev => ({ ...prev, open: false }))}
        date={reminderDialog.date}
        time={reminderDialog.time}
        defaultTitle={reminderDialog.title}
        timeSlot={reminderDialog.timeSlot}
      />
    </div>
  );
}
