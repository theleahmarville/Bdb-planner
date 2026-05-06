import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  X,
  Calendar,
  CheckCircle2,
  Droplets,
  Target,
  TrendingUp,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Star,
  Heart,
} from "lucide-react";
import { format, getISOWeek, startOfWeek, addDays } from "date-fns";

interface AIDigestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type DigestMode = "daily" | "weekly";

interface DailyDigest {
  greeting: string;
  topPriorities: string[];
  upcomingAppointments: { time: string; title: string }[];
  habitReminders: string[];
  motivationalInsight: string;
  quickWin: string;
}

interface WeeklyDigest {
  weekSummary: string;
  keyAppointments: { day: string; time: string; title: string }[];
  weeklyFocus: string[];
  habitInsights: string[];
  financialSnapshot: string;
  goalAlignment: string;
  motivationalMessage: string;
}

export default function AIDigestPanel({ isOpen, onClose }: AIDigestPanelProps) {
  const [mode, setMode] = useState<DigestMode>("daily");
  const [dailyDigest, setDailyDigest] = useState<DailyDigest | null>(null);
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklyDigest | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    priorities: true,
    appointments: true,
    habits: false,
    insight: true,
  });

  const today = useMemo(() => new Date(), []);
  const todayStr = format(today, "yyyy-MM-dd");
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const weekNumber = getISOWeek(today);

  // Generate week dates (Mon–Sun)
  const weekDates = useMemo(() => {
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), "yyyy-MM-dd"));
  }, [today]);

  const dailyMutation = trpc.ai.dailyDigest.useMutation({
    onSuccess: (data) => setDailyDigest(data as DailyDigest),
  });

  const weeklyMutation = trpc.ai.weeklyDigest.useMutation({
    onSuccess: (data) => setWeeklyDigest(data as WeeklyDigest),
  });

  const isLoading = dailyMutation.isPending || weeklyMutation.isPending;

  const generateDigest = () => {
    if (mode === "daily") {
      dailyMutation.mutate({ date: todayStr, year, month, weekNumber });
    } else {
      weeklyMutation.mutate({ year, month, weekNumber, weekDates });
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  const currentDigest = mode === "daily" ? dailyDigest : weeklyDigest;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-sm bg-white shadow-2xl flex flex-col h-full border-l border-amber-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">AI Digest</h2>
              <p className="text-amber-100 text-xs">Be Do Become Wellness</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Mode Toggle */}
        <div className="px-4 py-3 border-b border-amber-50 bg-amber-50/50">
          <div className="flex gap-1 p-1 bg-white rounded-lg border border-amber-100">
            <button
              onClick={() => setMode("daily")}
              className={`flex-1 text-xs py-1.5 px-3 rounded-md font-medium transition-all ${
                mode === "daily"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setMode("weekly")}
              className={`flex-1 text-xs py-1.5 px-3 rounded-md font-medium transition-all ${
                mode === "weekly"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Weekly
            </button>
          </div>

          {/* Date context */}
          <p className="text-xs text-stone-400 mt-2 text-center">
            {mode === "daily"
              ? format(today, "EEEE, MMMM d, yyyy")
              : `Week ${weekNumber} · ${format(today, "MMMM yyyy")}`}
          </p>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-4">
            {/* Empty state / Generate button */}
            {!currentDigest && !isLoading && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-stone-700 font-medium text-sm mb-1">
                  {mode === "daily" ? "Your Daily Digest" : "Your Weekly Digest"}
                </h3>
                <p className="text-stone-400 text-xs mb-4 leading-relaxed">
                  {mode === "daily"
                    ? "Get a personalized overview of today's priorities, appointments, and motivational insights based on your planner."
                    : "Get a comprehensive summary of this week's schedule, focus areas, habit progress, and goal alignment."}
                </p>
                <Button
                  onClick={generateDigest}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Generate {mode === "daily" ? "Daily" : "Weekly"} Digest
                </Button>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Sparkles className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-stone-500 text-sm font-medium">Generating your digest...</p>
                <p className="text-stone-400 text-xs mt-1">Reading your planner data</p>
              </div>
            )}

            {/* Daily Digest Content */}
            {mode === "daily" && dailyDigest && !isLoading && (
              <div className="space-y-3">
                {/* Greeting */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
                  <div className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-stone-700 text-sm leading-relaxed">{dailyDigest.greeting}</p>
                  </div>
                </div>

                {/* Top Priorities */}
                {dailyDigest.topPriorities.length > 0 && (
                  <div className="border border-stone-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleSection("priorities")}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-stone-50 hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-semibold text-stone-700">Top Priorities</span>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                          {dailyDigest.topPriorities.length}
                        </Badge>
                      </div>
                      {expandedSections.priorities ? (
                        <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                      )}
                    </button>
                    {expandedSections.priorities && (
                      <div className="px-3 py-2 space-y-1.5">
                        {dailyDigest.topPriorities.map((p, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-amber-700 text-xs font-bold">{i + 1}</span>
                            </div>
                            <p className="text-stone-600 text-xs leading-relaxed">{p}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Upcoming Appointments */}
                <div className="border border-stone-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleSection("appointments")}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-stone-50 hover:bg-stone-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-stone-700">Today's Schedule</span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                        {dailyDigest.upcomingAppointments.length}
                      </Badge>
                    </div>
                    {expandedSections.appointments ? (
                      <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                    )}
                  </button>
                  {expandedSections.appointments && (
                    <div className="px-3 py-2">
                      {dailyDigest.upcomingAppointments.length === 0 ? (
                        <p className="text-stone-400 text-xs italic">No appointments scheduled for today</p>
                      ) : (
                        <div className="space-y-1.5">
                          {dailyDigest.upcomingAppointments.map((apt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-blue-600 min-w-[52px]">
                                <Clock className="w-3 h-3" />
                                <span className="text-xs font-medium">{apt.time}</span>
                              </div>
                              <p className="text-stone-600 text-xs">{apt.title}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Habit Reminders */}
                {dailyDigest.habitReminders.length > 0 && (
                  <div className="border border-stone-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleSection("habits")}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-stone-50 hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-xs font-semibold text-stone-700">Habit Reminders</span>
                      </div>
                      {expandedSections.habits ? (
                        <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                      )}
                    </button>
                    {expandedSections.habits && (
                      <div className="px-3 py-2 space-y-1.5">
                        {dailyDigest.habitReminders.map((h, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Droplets className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                            <p className="text-stone-600 text-xs leading-relaxed">{h}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Motivational Insight */}
                <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-stone-100 text-xs leading-relaxed italic">
                      "{dailyDigest.motivationalInsight}"
                    </p>
                  </div>
                </div>

                {/* Quick Win */}
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-green-800 text-xs font-semibold mb-0.5">Quick Win (15 min)</p>
                      <p className="text-green-700 text-xs leading-relaxed">{dailyDigest.quickWin}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Weekly Digest Content */}
            {mode === "weekly" && weeklyDigest && !isLoading && (
              <div className="space-y-3">
                {/* Week Summary */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
                  <div className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-stone-700 text-sm leading-relaxed">{weeklyDigest.weekSummary}</p>
                  </div>
                </div>

                {/* Weekly Focus */}
                {weeklyDigest.weeklyFocus.length > 0 && (
                  <div className="border border-stone-100 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-stone-50">
                      <Target className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs font-semibold text-stone-700">Weekly Focus</span>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      {weeklyDigest.weeklyFocus.map((f, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-amber-700 text-xs font-bold">{i + 1}</span>
                          </div>
                          <p className="text-stone-600 text-xs leading-relaxed">{f}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Appointments */}
                {weeklyDigest.keyAppointments.length > 0 && (
                  <div className="border border-stone-100 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-stone-50">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-stone-700">Key Appointments</span>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      {weeklyDigest.keyAppointments.map((apt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 min-w-[32px] justify-center">
                            {apt.day}
                          </Badge>
                          <span className="text-blue-600 text-xs font-medium min-w-[40px]">{apt.time}</span>
                          <p className="text-stone-600 text-xs">{apt.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Habit Insights */}
                {weeklyDigest.habitInsights.length > 0 && (
                  <div className="border border-stone-100 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-stone-50">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-xs font-semibold text-stone-700">Habit Insights</span>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      {weeklyDigest.habitInsights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="text-stone-600 text-xs leading-relaxed">{h}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial Snapshot */}
                {weeklyDigest.financialSnapshot && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-green-800 text-xs font-semibold mb-0.5">Financial Snapshot</p>
                        <p className="text-green-700 text-xs leading-relaxed">{weeklyDigest.financialSnapshot}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Goal Alignment */}
                {weeklyDigest.goalAlignment && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-blue-800 text-xs font-semibold mb-0.5">Goal Alignment</p>
                        <p className="text-blue-700 text-xs leading-relaxed">{weeklyDigest.goalAlignment}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Motivational Message */}
                <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-stone-100 text-xs leading-relaxed italic">
                      "{weeklyDigest.motivationalMessage}"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer — Regenerate */}
        {currentDigest && !isLoading && (
          <div className="px-4 py-3 border-t border-stone-100 bg-stone-50">
            <Button
              variant="outline"
              size="sm"
              onClick={generateDigest}
              className="w-full text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
              disabled={isLoading}
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Regenerate {mode === "daily" ? "Daily" : "Weekly"} Digest
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
