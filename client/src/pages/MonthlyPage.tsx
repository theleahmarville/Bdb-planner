import { useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import EditableField from "@/components/EditableField";
import SaveIndicator from "@/components/SaveIndicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  MONTHS,
  BUDGET_CATEGORIES,
  SOCIAL_PLATFORMS,
  getDaysInMonth,
  getFirstDayOfMonth,
  getMonthName,
} from "@/lib/planner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import SocialAccountsPanel from "@/components/SocialAccountsPanel";
import SectionAttachments from "@/components/SectionAttachments";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MonthlyPage() {
  const params = useParams<{ year: string; month: string }>();
  const year = parseInt(params.year || "2026");
  const month = parseInt(params.month || String(new Date().getMonth() + 1));
  const [, navigate] = useLocation();

  const { isAuthenticated } = useAuth();
  const { data: monthData } = trpc.monthly.get.useQuery({ year, month });
  const saveMutation = trpc.monthly.save.useMutation();

  const [localData, setLocalData] = useState<Record<string, any>>({});
  const [initialized, setInitialized] = useState<string>(""); // tracks "year-month" key

  const dataKey = `${year}-${month}`;
  if (monthData && initialized !== dataKey) {
    const init: Record<string, any> = {
      themeWord: monthData.themeWord || "",
      wellnessHabit: monthData.wellnessHabit || "",
      wellnessMinutes: monthData.wellnessMinutes || "",
      todos: monthData.todos || "",
      financialTargets: monthData.financialTargets || "",
      shoppingList: monthData.shoppingList || "",
      businessCareerGoals: monthData.businessCareerGoals || "",
      wellnessGoals: monthData.wellnessGoals || "",
      bookOfMonth: monthData.bookOfMonth || "",
      birthdays: monthData.birthdays || "",
      actsOfKindness: monthData.actsOfKindness || "",
      socialCampaigns: monthData.socialCampaigns || "",
      socialCollaborations: monthData.socialCollaborations || "",
      contentMapMonth: monthData.contentMapMonth || "",
      contentMapNotes: monthData.contentMapNotes || "",
      socialFollowers: (monthData.socialFollowers as any) || {},
      contentMapObjectives: (monthData.contentMapObjectives as any[]) || [{ goal: "", targetDate: "" }],
      contentMapCampaigns: (monthData.contentMapCampaigns as any[]) || [],
      contentMapPillars: (monthData.contentMapPillars as any[]) || [
        { pillar: "Educational", contentTypes: "" },
        { pillar: "Promotional", contentTypes: "" },
        { pillar: "Inspirational", contentTypes: "" },
        { pillar: "Entertaining", contentTypes: "" },
      ],
    };
    BUDGET_CATEGORIES.forEach(({ key }) => {
      init[key] = (monthData as any)[key] || "";
    });
    setLocalData(init);
    setInitialized(dataKey);
  }

  const saveMonthly = useCallback(
    async (data: Record<string, any>) => {
      await saveMutation.mutateAsync({ year, month, data });
    },
    [saveMutation, year, month]
  );

  const { save: autoSave, status: saveStatus } = useAutoSave(saveMonthly, 1200);

  const update = (key: string, value: any) => {
    const updated = { ...localData, [key]: value };
    setLocalData(updated);
    autoSave(updated);
  };

  const prevMonth = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  // Calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayRaw = getFirstDayOfMonth(year, month); // 0=Sun
  // Convert to Mon-first: Sun=6, Mon=0, Tue=1...
  const firstDay = firstDayRaw === 0 ? 6 : firstDayRaw - 1;
  const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;

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

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href={`/monthly/${prevMonth.y}/${prevMonth.m}`}>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-xl md:text-3xl font-black tracking-tight">{getMonthName(month)} {year}</h1>
            <p className="text-muted-foreground text-sm">Monthly Planner</p>
          </div>
          <Link href={`/monthly/${nextMonth.y}/${nextMonth.m}`}>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight size={20} />
            </button>
          </Link>
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      <Tabs defaultValue="overview">
        <div className="tabs-scroll mb-4 md:mb-6">
        <TabsList className="flex flex-nowrap md:flex-wrap gap-1 h-auto bg-muted p-1 rounded-xl w-max md:w-full">
          {[
            { value: "overview", label: "Overview" },
            { value: "calendar", label: "Calendar" },
            { value: "budget", label: "Budget" },
            { value: "goals", label: "Goals" },
            { value: "social", label: "Social Media" },
            { value: "content", label: "Content Map" },
          ].map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-3 py-1.5">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        </div>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Theme & Wellness */}
            <div className="planner-card">
              <div className="planner-pill mb-3">Month Intro</div>
              <EditableField label="Theme Word" value={localData.themeWord || ""} onChange={(v) => update("themeWord", v)} placeholder="Your word for this month..." className="font-semibold text-lg mb-3" />
              <EditableField label="Wellness Habit" value={localData.wellnessHabit || ""} onChange={(v) => update("wellnessHabit", v)} placeholder="Habit to build..." />
              <EditableField label="Minutes/Day" value={String(localData.wellnessMinutes || "")} onChange={(v) => update("wellnessMinutes", v)} placeholder="e.g. 30" className="mt-2" />
            </div>

            {/* To Do's */}
            <div className="planner-card">
              <div className="planner-pill mb-3">To Do's</div>
              <EditableField value={localData.todos || ""} onChange={(v) => update("todos", v)} placeholder="Monthly to-do list..." multiline rows={8} />
            </div>

            {/* Financial Targets & Shopping */}
            <div className="space-y-4">
              <div className="planner-card">
                <div className="planner-pill mb-3">Financial Targets</div>
                <EditableField value={localData.financialTargets || ""} onChange={(v) => update("financialTargets", v)} placeholder="Income goals, savings targets..." multiline rows={4} />
              </div>
              <div className="planner-card">
                <div className="planner-pill mb-3">Shopping List</div>
                <EditableField value={localData.shoppingList || ""} onChange={(v) => update("shoppingList", v)} placeholder="Things to buy this month..." multiline rows={4} />
              </div>
            </div>

            {/* Birthdays */}
            <div className="planner-card">
              <div className="planner-pill mb-3">Birthdays & Celebrations</div>
              <EditableField value={localData.birthdays || ""} onChange={(v) => update("birthdays", v)} placeholder="Birthdays and special dates..." multiline rows={6} />
            </div>

            {/* Acts of Kindness */}
            <div className="planner-card">
              <div className="planner-pill mb-3">Acts of Kindness</div>
              <EditableField value={localData.actsOfKindness || ""} onChange={(v) => update("actsOfKindness", v)} placeholder="Ways to give back this month..." multiline rows={6} />
            </div>

            {/* Book of the Month */}
            <div className="planner-card">
              <div className="planner-pill mb-3">Book of the Month</div>
              <EditableField value={localData.bookOfMonth || ""} onChange={(v) => update("bookOfMonth", v)} placeholder="Book title and notes..." multiline rows={6} />
            </div>
          </div>
        </TabsContent>

        {/* ── Calendar ── */}
        <TabsContent value="calendar">
          <div className="planner-card">
            <div className="grid grid-cols-7 mb-2">
              {DAY_HEADERS.map((d) => (
                <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: totalCells }, (_, i) => {
                const dayNum = i - firstDay + 1;
                const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                const isToday =
                  isValid &&
                  new Date().getFullYear() === year &&
                  new Date().getMonth() + 1 === month &&
                  new Date().getDate() === dayNum;
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-[80px] rounded-lg p-1.5 border transition-colors",
                      isValid ? "border-border hover:bg-accent/30 cursor-pointer" : "border-transparent",
                      isToday && "border-foreground bg-foreground/5"
                    )}
                  >
                    {isValid && (
                      <>
                        <span className={cn("text-xs font-bold block mb-1", isToday && "text-foreground")}>
                          {dayNum}
                        </span>
                        <Link href={`/weekly/${year}/${getWeekOfDay(year, month, dayNum)}`}>
                          <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                            View week →
                          </span>
                        </Link>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── Budget ── */}
        <TabsContent value="budget">
          <div className="mb-4">
            <h2 className="text-2xl font-black mb-1">Monthly Budget</h2>
            <p className="text-sm text-muted-foreground">Track your income and expenses for {getMonthName(month)}.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BUDGET_CATEGORIES.map(({ key, label }) => (
              <div key={key} className="planner-card">
                <div className="planner-pill mb-3">{label}</div>
                <EditableField
                  value={localData[key] || ""}
                  onChange={(v) => update(key, v)}
                  placeholder="Amount / line items..."
                  multiline rows={6}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Goals ── */}
        <TabsContent value="goals">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="planner-card">
              <div className="planner-pill mb-3">Business / Career Goals</div>
              <EditableField value={localData.businessCareerGoals || ""} onChange={(v) => update("businessCareerGoals", v)} placeholder="Your professional goals this month..." multiline rows={10} />
            </div>
            <div className="planner-card">
              <div className="planner-pill mb-3">Wellness Goals</div>
              <EditableField value={localData.wellnessGoals || ""} onChange={(v) => update("wellnessGoals", v)} placeholder="Your health and wellness goals..." multiline rows={10} />
            </div>
          </div>
        </TabsContent>

        {/* ── Social Media ── */}
        <TabsContent value="social">
          <div className="mb-4">
            <h2 className="text-2xl font-black mb-1">Social Media Management</h2>
            <p className="text-sm text-muted-foreground">Track your follower counts and social media activity.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {SOCIAL_PLATFORMS.map((platform) => (
              <div key={platform.key} className="planner-card">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: platform.color }}
                  >
                    {platform.icon.toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm">{platform.label}</span>
                </div>
                <EditableField
                  label="Followers"
                  value={String((localData.socialFollowers as any)?.[platform.key] || "")}
                  onChange={(v) => update("socialFollowers", { ...(localData.socialFollowers || {}), [platform.key]: v })}
                  placeholder="0"
                  className="text-lg font-bold"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="planner-card">
              <div className="planner-pill mb-3">Campaigns</div>
              <EditableField value={localData.socialCampaigns || ""} onChange={(v) => update("socialCampaigns", v)} placeholder="Active campaigns this month..." multiline rows={8} />
            </div>
             <div className="planner-card">
              <div className="planner-pill mb-3">Collaborations</div>
              <EditableField value={localData.socialCollaborations || ""} onChange={(v) => update("socialCollaborations", v)} placeholder="Brand deals, collabs, partnerships..." multiline rows={8} />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <SocialAccountsPanel />
            <SectionAttachments sectionKey={`monthly-${year}-${month}-social`} section="monthly" label="Attach media kits or brand guidelines" />
          </div>
        </TabsContent>
        {/* ── Content Map ── */}
        <TabsContent value="content">
          <div className="mb-4">
            <h2 className="text-2xl font-black mb-1">Content Map</h2>
            <p className="text-sm text-muted-foreground">Plan your content strategy for {getMonthName(month)}.</p>
          </div>

          <div className="space-y-6">
            {/* Objectives */}
            <div className="planner-card">
              <div className="planner-pill mb-3">Monthly Objectives</div>
              <div className="space-y-2">
                {(localData.contentMapObjectives as any[] || [{ goal: "", targetDate: "" }]).map((obj: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-4">{idx + 1}.</span>
                    <EditableField
                      value={obj.goal || ""}
                      onChange={(v) => {
                        const updated = [...(localData.contentMapObjectives as any[])];
                        updated[idx] = { ...updated[idx], goal: v };
                        update("contentMapObjectives", updated);
                      }}
                      placeholder="Objective..."
                      className="flex-1"
                    />
                    <EditableField
                      value={obj.targetDate || ""}
                      onChange={(v) => {
                        const updated = [...(localData.contentMapObjectives as any[])];
                        updated[idx] = { ...updated[idx], targetDate: v };
                        update("contentMapObjectives", updated);
                      }}
                      placeholder="Target date"
                      className="w-32"
                    />
                    <button
                      onClick={() => {
                        const updated = (localData.contentMapObjectives as any[]).filter((_: any, i: number) => i !== idx);
                        update("contentMapObjectives", updated);
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => update("contentMapObjectives", [...(localData.contentMapObjectives as any[] || []), { goal: "", targetDate: "" }])}
                  className="mt-2"
                >
                  <Plus size={14} className="mr-1" /> Add Objective
                </Button>
              </div>
            </div>

            {/* Content Pillars */}
            <div className="planner-card">
              <div className="planner-pill mb-3">Content Pillars</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(localData.contentMapPillars as any[] || []).map((pillar: any, idx: number) => (
                  <div key={idx} className="border border-border rounded-lg p-3">
                    <EditableField
                      value={pillar.pillar || ""}
                      onChange={(v) => {
                        const updated = [...(localData.contentMapPillars as any[])];
                        updated[idx] = { ...updated[idx], pillar: v };
                        update("contentMapPillars", updated);
                      }}
                      placeholder="Pillar name"
                      className="font-semibold mb-2"
                    />
                    <EditableField
                      value={pillar.contentTypes || ""}
                      onChange={(v) => {
                        const updated = [...(localData.contentMapPillars as any[])];
                        updated[idx] = { ...updated[idx], contentTypes: v };
                        update("contentMapPillars", updated);
                      }}
                      placeholder="Content types..."
                      multiline rows={3}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Campaigns */}
            <div className="planner-card">
              <div className="planner-pill mb-3">Campaign Planner</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Campaign Name", "Product/Service", "Date", "Platforms", "Goal"].map((h) => (
                        <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {(localData.contentMapCampaigns as any[] || []).map((campaign: any, idx: number) => (
                      <tr key={idx} className="border-b border-border/50">
                        {["name", "product", "date", "platforms", "goal"].map((field) => (
                          <td key={field} className="py-1 px-1">
                            <input
                              type="text"
                              value={campaign[field] || ""}
                              onChange={(e) => {
                                const updated = [...(localData.contentMapCampaigns as any[])];
                                updated[idx] = { ...updated[idx], [field]: e.target.value };
                                update("contentMapCampaigns", updated);
                              }}
                              placeholder="..."
                              className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-sm py-1"
                            />
                          </td>
                        ))}
                        <td>
                          <button
                            onClick={() => {
                              const updated = (localData.contentMapCampaigns as any[]).filter((_: any, i: number) => i !== idx);
                              update("contentMapCampaigns", updated);
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => update("contentMapCampaigns", [...(localData.contentMapCampaigns as any[] || []), { name: "", product: "", date: "", platforms: "", goal: "" }])}
                  className="mt-3"
                >
                  <Plus size={14} className="mr-1" /> Add Campaign
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="planner-card">
              <div className="planner-pill mb-3">Content Notes</div>
              <EditableField value={localData.contentMapNotes || ""} onChange={(v) => update("contentMapNotes", v)} placeholder="Additional notes, ideas, and reminders..." multiline rows={6} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper: get ISO week number for a specific day
function getWeekOfDay(year: number, month: number, day: number): number {
  const date = new Date(year, month - 1, day);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
