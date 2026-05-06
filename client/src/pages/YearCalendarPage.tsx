import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { MONTHS } from "@/lib/planner";

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay(); // 0=Sun
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

interface MiniMonthProps {
  year: number;
  month: number; // 1-12
  markedDates?: Set<string>; // "YYYY-MM-DD"
  onDayClick?: (date: string) => void;
}

function MiniMonth({ year, month, markedDates = new Set(), onDayClick }: MiniMonthProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const [, navigate] = useLocation();

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (onDayClick) {
      onDayClick(dateStr);
    } else {
      // Navigate to weekly view for that week
      const d = new Date(year, month - 1, day);
      const week = getISOWeek(d);
      navigate(`/weekly/${year}/${week}`);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">{MONTHS[month - 1]}</h3>
        <button
          onClick={() => navigate(`/monthly/${year}/${month}`)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          View →
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[9px] font-semibold text-muted-foreground py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === todayStr;
          const hasEntry = markedDates.has(dateStr);

          return (
            <button
              key={idx}
              onClick={() => handleDayClick(day)}
              className={cn(
                "relative flex items-center justify-center text-[11px] rounded-full w-6 h-6 mx-auto transition-colors",
                isToday
                  ? "bg-foreground text-background font-bold"
                  : "text-foreground hover:bg-accent",
                hasEntry && !isToday && "font-semibold"
              )}
            >
              {day}
              {hasEntry && !isToday && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground/40" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface YearCalendarPageProps {
  params?: { year?: string };
}

export default function YearCalendarPage({ params }: YearCalendarPageProps) {
  const { isAuthenticated } = useAuth();
  const [year, setYear] = useState(params?.year ? parseInt(params.year) : new Date().getFullYear());

  // Fetch all daily entries for this year to mark days with content
  const { data: dailyData } = trpc.daily.listYear.useQuery(
    { year },
    { enabled: isAuthenticated, staleTime: 60_000 }
  );

  const markedDates = useMemo(() => {
    const set = new Set<string>();
    (dailyData ?? []).forEach((e) => set.add(e.date));
    return set;
  }, [dailyData]);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{year} Year at a Glance</h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium italic">Be Do Become Wellness · Leah Marville</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear(y => y - 1)}
              className="p-2 rounded-xl hover:bg-accent transition-colors text-foreground border border-border"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-foreground w-12 text-center">{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              className="p-2 rounded-xl hover:bg-accent transition-colors text-foreground border border-border"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-6">
        {/* Quarter labels + month grid */}
        {[
          { label: "Q1 — January · February · March", months: [1, 2, 3] },
          { label: "Q2 — April · May · June", months: [4, 5, 6] },
          { label: "Q3 — July · August · September", months: [7, 8, 9] },
          { label: "Q4 — October · November · December", months: [10, 11, 12] },
        ].map(({ label, months }) => (
          <div key={label} className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {months.map((m) => (
                <MiniMonth
                  key={m}
                  year={year}
                  month={m}
                  markedDates={markedDates}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-6 mt-2 px-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
              <span className="text-[9px] text-background font-bold">{today.getDate()}</span>
            </div>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-5 h-5 flex items-center justify-center">
              <span className="text-[11px] text-foreground font-semibold">{today.getDate()}</span>
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground/40" />
            </div>
            <span className="text-xs text-muted-foreground">Has entry</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Click any day to open that week</span>
          </div>
        </div>
      </div>
    </div>
  );
}
