import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CalendarRange,
  Star,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  BookOpen,
  Menu,
  X,
  Plug,
  StickyNote,
  LayoutGrid,
  Sparkles,
  Moon,
  Bell,
  Settings,
  Users,
} from "lucide-react";
import { MONTHS } from "@/lib/planner";
import { cn } from "@/lib/utils";
import IntegrationBar from "./IntegrationBar";
import GreetingModal from "./GreetingModal";
import AIDigestPanel from "./AIDigestPanel";
import NightReflectionModal from "./NightReflectionModal";
import DailyDevotionModal from "./DailyDevotionModal";
import RemindersPanel from "./RemindersPanel";
import GlobalSearch from "./GlobalSearch";
import { trpc } from "@/lib/trpc";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";

interface PlannerLayoutProps {
  children: React.ReactNode;
  currentYear?: number;
  currentMonth?: number;
  currentWeek?: number;
  onYearChange?: (year: number) => void;
  onMonthChange?: (month: number) => void;
  onWeekChange?: (week: number) => void;
}

export default function PlannerLayout({
  children,
  currentYear = new Date().getFullYear(),
  currentMonth = new Date().getMonth() + 1,
  currentWeek = 1,
  onYearChange,
  onMonthChange,
  onWeekChange,
}: PlannerLayoutProps) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [digestOpen, setDigestOpen] = useState(false);
  const [nightReflectionOpen, setNightReflectionOpen] = useState(false);
  const [devotionOpen, setDevotionOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);

  // Reminder notifications hook
  useReminderNotifications(isAuthenticated);

  // Reminder count badge
  const { data: remindersList } = trpc.reminders.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const now = new Date();
  const upcomingReminderCount = (remindersList ?? []).filter(
    r => !r.sent && r.date >= now.toISOString().slice(0, 10)
  ).length;

  // devotionPending tracks whether today's devotion is waiting to be shown
  // It opens after the greeting modal is dismissed (or immediately if greeting already shown)
  const devotionKey = `devotion-shown-${new Date().toISOString().slice(0, 10)}`;
  const greetingAlreadyShown = (userId: number | undefined) =>
    !!sessionStorage.getItem(`greeting-shown-${userId}-${new Date().toISOString().slice(0, 10)}`);

  const openDevotionIfDue = () => {
    if (!localStorage.getItem(devotionKey)) {
      setDevotionOpen(true);
      localStorage.setItem(devotionKey, '1');
    }
  };

  // If greeting was already shown this session, open devotion after a short delay
  useEffect(() => {
    if (!isAuthenticated) return;
    if (localStorage.getItem(devotionKey)) return; // devotion already shown today
    if (greetingAlreadyShown(user?.id)) {
      // Greeting already dismissed earlier — open devotion directly
      const t = setTimeout(() => openDevotionIfDue(), 800);
      return () => clearTimeout(t);
    }
    // Otherwise, devotion will open via onDismissed callback from GreetingModal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // Check if tonight's reflection is due
  const { data: nightlyStatus } = trpc.zion.checkNightlyPrompt.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5 * 60 * 1000, // re-check every 5 minutes
    staleTime: 60 * 1000,
  });
  const nightlyDue = nightlyStatus?.due && !nightlyStatus?.completed;
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { setDrawerOpen(false); }, [location]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isAnnual = location === "/" || location.startsWith("/annual");
  const isYearCal = location.startsWith("/year-calendar");
  const isMonthly = location.startsWith("/monthly");
  const isWeekly = location.startsWith("/weekly");
  const isNotes = location === "/notes";
  const isIntegrations = location === "/integrations";
  const isZion = location === "/zion";
  const isCommunity = location === "/community";

  const getPageTitle = () => {
    if (isYearCal) return `${currentYear} Year Calendar`;
    if (isAnnual) return "Annual Planning";
    if (isMonthly) return `Monthly — ${MONTHS[currentMonth - 1]} ${currentYear}`;
    if (isWeekly) return `Week ${currentWeek}, ${currentYear}`;
    if (isNotes) return "Notes";
    if (isIntegrations) return "Integrations";
    if (isZion) return "Zion AI Assistant";
    if (isCommunity) return "Community";
    return "BDB Planner";
  };

  const monthlyHref = `/monthly/${currentYear}/${currentMonth}`;
  const weeklyHref = `/weekly/${currentYear}/${currentWeek}`;
  const yearCalHref = `/year-calendar/${currentYear}`;

  const SidebarContent = () => (
    <>
      {/* Logo / Brand */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-sidebar-foreground flex items-center justify-center flex-shrink-0">
            <span className="text-sidebar text-[9px] font-black">BDB</span>
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-sm font-black text-sidebar-foreground leading-tight truncate">Be Do Become</p>
              <p className="text-[10px] text-sidebar-foreground/60 leading-tight truncate">Wellness · Leah Marville</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:flex p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground flex-shrink-0"
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <Menu size={16} />}
        </button>
        <button
          onClick={() => setDrawerOpen(false)}
          className="md:hidden p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      {sidebarOpen && <GlobalSearch inline />}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">

        {/* Annual Planning */}
        <Link href="/annual">
          <div className={cn("sidebar-nav-item", isAnnual && "active")} title={!sidebarOpen ? "Annual Planning" : undefined}>
            <Star size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>Annual Planning</span>}
          </div>
        </Link>

        {/* Year Calendar — sub-item under Annual */}
        <Link href={yearCalHref}>
          <div
            className={cn(
              "sidebar-nav-item",
              isYearCal && "active",
              sidebarOpen && "ml-2 text-sm"
            )}
            title={!sidebarOpen ? "Year Calendar" : undefined}
          >
            <LayoutGrid size={16} className="flex-shrink-0" />
            {sidebarOpen && <span className="text-[13px]">Year Calendar</span>}
          </div>
        </Link>

        {/* Monthly */}
        <div>
          <Link href={monthlyHref}>
            <div className={cn("sidebar-nav-item", isMonthly && "active")} title={!sidebarOpen ? "Monthly View" : undefined}>
              <CalendarRange size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>Monthly View</span>}
            </div>
          </Link>
          {sidebarOpen && isMonthly && (
            <div className="mt-2 ml-2 space-y-0.5">
              {MONTHS.map((month, idx) => (
                <Link key={idx} href={`/monthly/${currentYear}/${idx + 1}`}>
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded text-xs cursor-pointer transition-colors",
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    currentMonth === idx + 1 && "text-sidebar-foreground font-semibold bg-sidebar-accent/50"
                  )}>
                    <span className="w-4 text-right text-sidebar-foreground/40">{idx + 1}</span>
                    <span>{month}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Weekly */}
        <Link href={weeklyHref}>
          <div className={cn("sidebar-nav-item", isWeekly && "active")} title={!sidebarOpen ? "Weekly View" : undefined}>
            <CalendarDays size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>Weekly View</span>}
          </div>
        </Link>

        <div className="border-t border-sidebar-border my-2" />

        {/* This Week */}
        <Link href={`/weekly/${new Date().getFullYear()}/${getISOWeekNumber(new Date())}`} style={{ display: "block", textDecoration: "none" }}>
          <div className={cn("sidebar-nav-item cursor-pointer", isWeekly && location === `/weekly/${new Date().getFullYear()}/${getISOWeekNumber(new Date())}` && "active")} title={!sidebarOpen ? "This Week" : undefined}>
            <BookOpen size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>This Week</span>}
          </div>
        </Link>

        {/* Notes */}
        <Link href="/notes">
          <div className={cn("sidebar-nav-item", isNotes && "active")} title={!sidebarOpen ? "Notes" : undefined}>
            <StickyNote size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>Notes</span>}
          </div>
        </Link>

        {/* Community */}
        <Link href="/community">
          <div className={cn("sidebar-nav-item", isCommunity && "active")} title={!sidebarOpen ? "Community" : undefined}>
            <Users size={18} className="flex-shrink-0 text-violet-500" />
            {sidebarOpen && <span className="text-violet-600 font-medium">Community</span>}
          </div>
        </Link>

        {/* Integrations */}
        <Link href="/integrations">
          <div className={cn("sidebar-nav-item", isIntegrations && "active")} title={!sidebarOpen ? "Integrations" : undefined}>
            <Plug size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>Integrations</span>}
          </div>
        </Link>

        <div className="border-t border-sidebar-border my-2" />

        {/* Zion AI Chat */}
        <Link href="/zion">
          <div className={cn("sidebar-nav-item relative", isZion && "active", "hover:bg-emerald-500/20")} title={!sidebarOpen ? "Zion AI Assistant" : undefined}>
            <Sparkles size={18} className="flex-shrink-0 text-emerald-600" />
            {sidebarOpen && <span className="text-emerald-600 font-medium">Zion AI</span>}
            {nightlyDue && (
              <span className={cn(
                "flex items-center gap-0.5 rounded-full text-[9px] font-bold px-1.5 py-0.5 bg-violet-600 text-white animate-pulse",
                !sidebarOpen && "absolute -top-1 -right-1 px-1 py-0.5"
              )}>
                <Moon size={8} />
                {sidebarOpen && "Tonight"}
              </span>
            )}
          </div>
        </Link>

        {/* Nightly Reflection shortcut */}
        {nightlyDue && (
          <button
            onClick={() => setNightReflectionOpen(true)}
            className={cn("sidebar-nav-item w-full text-left hover:bg-violet-500/10", sidebarOpen && "ml-2 text-sm")}
            title={!sidebarOpen ? "Tonight's Reflection" : undefined}
          >
            <Moon size={sidebarOpen ? 15 : 18} className="flex-shrink-0 text-violet-500" />
            {sidebarOpen && <span className="text-violet-600 text-[13px]">Tonight's Reflection</span>}
          </button>
        )}

        {/* AI Digest */}
        <button
          onClick={() => setDigestOpen(true)}
          className={cn("sidebar-nav-item w-full text-left", "hover:bg-emerald-500/20")}
          title={!sidebarOpen ? "AI Digest" : undefined}
        >
          <Sparkles size={18} className="flex-shrink-0 text-emerald-600" />
          {sidebarOpen && <span className="text-emerald-600 font-medium">AI Digest</span>}
        </button>

        {/* Reminders */}
        <button
          onClick={() => setRemindersOpen(true)}
          className={cn("sidebar-nav-item w-full text-left relative")}
          title={!sidebarOpen ? "Reminders" : undefined}
        >
          <Bell size={18} className="flex-shrink-0" />
          {sidebarOpen && <span>Reminders</span>}
          {upcomingReminderCount > 0 && (
            <span className={cn(
              "flex items-center justify-center rounded-full text-[9px] font-bold bg-foreground text-background",
              sidebarOpen ? "ml-auto w-5 h-5" : "absolute -top-1 -right-1 w-4 h-4"
            )}>
              {upcomingReminderCount}
            </span>
          )}
        </button>
      </nav>

      {/* Year selector */}
      {sidebarOpen && (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <button onClick={() => onYearChange?.(currentYear - 1)} className="p-2 min-w-[44px] min-h-[44px] rounded hover:bg-sidebar-accent transition-colors text-sidebar-foreground flex items-center justify-center">
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-bold text-sidebar-foreground">{currentYear}</span>
            <button onClick={() => onYearChange?.(currentYear + 1)} className="p-2 min-w-[44px] min-h-[44px] rounded hover:bg-sidebar-accent transition-colors text-sidebar-foreground flex items-center justify-center">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* User / Auth */}
      <div className="px-2 py-3 border-t border-sidebar-border">
        {isAuthenticated ? (
          <div className={cn("flex items-center gap-2", !sidebarOpen && "justify-center")}>
            {/* Avatar / initials */}
            <Link href="/settings">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ring-2 ring-transparent hover:ring-emerald-400 transition-all bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center" title="Account settings">
                {(user as any)?.avatarUrl ? (
                  <img src={(user as any).avatarUrl} alt={user?.name || "Avatar"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-bold">
                    {(user?.name || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </Link>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name || "Planner"}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email || ""}</p>
              </div>
            )}
            <Link href="/settings">
              <button className="p-2 min-w-[44px] min-h-[44px] rounded hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground flex-shrink-0 flex items-center justify-center" title="Account settings">
                <Settings size={15} />
              </button>
            </Link>
            <button onClick={() => logout()} className="p-2 min-w-[44px] min-h-[44px] rounded hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground flex-shrink-0 flex items-center justify-center" title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <a href={getLoginUrl()}>
            <div className={cn("sidebar-nav-item", !sidebarOpen && "justify-center")}>
              <LogIn size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>Sign In</span>}
            </div>
          </a>
        )}
      </div>

      {/* Proprietary branding footer */}
      {sidebarOpen && (
        <div className="px-4 py-2 border-t border-sidebar-border">
          <p className="text-[9px] text-sidebar-foreground/40 leading-tight text-center">
            © {new Date().getFullYear()} Be Do Become Wellness<br />by Leah Marville · All rights reserved
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col h-full transition-all duration-300 flex-shrink-0",
        "bg-sidebar text-sidebar-foreground",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
      )}
      <aside className={cn(
        "md:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-72",
        "bg-sidebar text-sidebar-foreground shadow-2xl",
        "transition-transform duration-300 ease-in-out",
        drawerOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background flex-shrink-0">
          <button onClick={() => setDrawerOpen(true)} className="p-2 rounded-lg hover:bg-accent transition-colors text-foreground">
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{getPageTitle()}</p>
            <p className="text-[10px] text-muted-foreground truncate">Be Do Become Wellness · Leah Marville</p>
          </div>
          <button
            onClick={() => setDigestOpen(true)}
            className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center flex-shrink-0 hover:bg-emerald-800 transition-colors"
            title="AI Digest"
          >
            <Sparkles size={14} className="text-white" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-safe md:pb-0">
          <div className="pb-16 md:pb-0">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border flex items-stretch safe-area-inset-bottom">
          <MobileTabItem href="/annual" icon={Star} label="Annual" active={isAnnual || isYearCal} />
          <MobileTabItem href={monthlyHref} icon={CalendarRange} label="Monthly" active={isMonthly} />
          <MobileTabItem href={weeklyHref} icon={CalendarDays} label="Weekly" active={isWeekly} />
          <MobileTabItem href="/notes" icon={StickyNote} label="Notes" active={isNotes} />
          <button
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-h-[56px]",
              "text-muted-foreground transition-colors",
              isIntegrations && "text-foreground"
            )}
          >
            <Menu size={20} />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </nav>
      </div>

      {/* Persistent Integration Bar — visible on all pages */}
      <IntegrationBar />
      {/* Daily personalised greeting modal — opens first; devotion opens after */}
      <GreetingModal onDismissed={openDevotionIfDue} />
      {/* AI Digest Panel */}
      <AIDigestPanel isOpen={digestOpen} onClose={() => setDigestOpen(false)} />
      {/* Nightly Reflection Modal */}
      <NightReflectionModal
        open={nightReflectionOpen}
        onClose={() => setNightReflectionOpen(false)}
        date={today}
      />
      {/* Daily Devotion Modal */}
      <DailyDevotionModal
        open={devotionOpen}
        onClose={() => setDevotionOpen(false)}
      />
      {/* Reminders Panel */}
      <RemindersPanel
        open={remindersOpen}
        onClose={() => setRemindersOpen(false)}
      />
    </div>
  );
}

function MobileTabItem({ href, icon: Icon, label, active }: { href: string; icon: React.ElementType; label: string; active: boolean }) {
  return (
    <Link href={href} className="flex-1">
      <div className={cn(
        "flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-h-[56px] w-full transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}>
        <Icon size={20} />
        <span className="text-[10px] font-medium leading-none">{label}</span>
        {active && <span className="absolute bottom-0 w-8 h-0.5 bg-foreground rounded-full" />}
      </div>
    </Link>
  );
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
