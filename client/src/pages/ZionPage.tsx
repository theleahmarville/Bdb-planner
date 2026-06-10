import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import {
  Sparkles, Mic, MicOff, Send, Trash2, CheckCircle2,
  Calendar, Target, BookOpen, Heart, BarChart2, Loader2,
  Volume2, ChevronDown, Bell, DollarSign, Share2, Smile,
  ExternalLink, SaveAll, Mail, Briefcase, RefreshCw, X, Clock,
  AlertCircle, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { getISOWeek, startOfISOWeek, format } from "date-fns";
import { Link, useLocation } from "wouter";

// ── Types ──────────────────────────────────────────────────────────────────────
interface PlannerAction {
  type: string;
  section: string;
  content: string;
  folder?: string;
  day?: string;
  time?: string;
  field?: string;
  reminderDate?: string;
  reminderTime?: string;
  platform?: string;
  budgetCategory?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  plannerActions?: PlannerAction[];
  isVoice?: boolean;
  createdAt: Date;
}

// ── Action type metadata ───────────────────────────────────────────────────────
const ACTION_META: Record<string, {
  icon: React.ReactNode;
  label: string;
  color: string;
  navHint: string;
  defaultNavPath?: string; // where clicking the label takes you before saved
}> = {
  goal:         { icon: <Target className="w-3.5 h-3.5" />,    label: "Big Goal",    color: "bg-purple-50 text-purple-700 border-purple-200",   navHint: "Annual Planning",        defaultNavPath: "/annual" },
  note:         { icon: <BookOpen className="w-3.5 h-3.5" />,  label: "Note",        color: "bg-blue-50 text-blue-700 border-blue-200",         navHint: "Notes",                  defaultNavPath: "/notes" },
  schedule:     { icon: <Calendar className="w-3.5 h-3.5" />,  label: "Schedule",    color: "bg-green-50 text-green-700 border-green-200",      navHint: "Weekly View",            defaultNavPath: "/weekly" },
  calendar:     { icon: <Calendar className="w-3.5 h-3.5" />,  label: "Calendar",    color: "bg-teal-50 text-teal-700 border-teal-200",         navHint: "Weekly View",            defaultNavPath: "/weekly" },
  habit:        { icon: <Heart className="w-3.5 h-3.5" />,     label: "Habit",       color: "bg-pink-50 text-pink-700 border-pink-200",         navHint: "Weekly View → Habits",   defaultNavPath: "/weekly" },
  monthly_goal: { icon: <BarChart2 className="w-3.5 h-3.5" />, label: "Monthly Goal",color: "bg-emerald-50 text-emerald-700 border-emerald-200",navHint: "Monthly View",           defaultNavPath: "/monthly" },
  priority:     { icon: <Target className="w-3.5 h-3.5" />,    label: "Priority",    color: "bg-emerald-50 text-emerald-700 border-emerald-200",navHint: "Weekly View",            defaultNavPath: "/weekly" },
  intention:    { icon: <Sparkles className="w-3.5 h-3.5" />,  label: "Intention",   color: "bg-violet-50 text-violet-700 border-violet-200",   navHint: "Weekly View",            defaultNavPath: "/weekly" },
  win:          { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Win",      color: "bg-emerald-50 text-emerald-700 border-emerald-200",navHint: "Weekly View → Wins",     defaultNavPath: "/weekly" },
  reminder:     { icon: <Bell className="w-3.5 h-3.5" />,      label: "Reminder",    color: "bg-red-50 text-red-700 border-red-200",            navHint: "Reminders",              defaultNavPath: "/weekly" },
  budget:       { icon: <DollarSign className="w-3.5 h-3.5" />, label: "Budget",     color: "bg-lime-50 text-lime-700 border-lime-200",         navHint: "Monthly View → Budget",  defaultNavPath: "/monthly" },
  social_post:  { icon: <Share2 className="w-3.5 h-3.5" />,    label: "Social Post", color: "bg-sky-50 text-sky-700 border-sky-200",            navHint: "Weekly View",            defaultNavPath: "/weekly" },
  gratitude:    { icon: <Smile className="w-3.5 h-3.5" />,     label: "Gratitude",   color: "bg-yellow-50 text-yellow-700 border-yellow-200",   navHint: "Weekly View → Gratitude",defaultNavPath: "/weekly" },
};

// ── Build save payload from action + date context ─────────────────────────────
function buildSavePayload(action: PlannerAction, now: Date) {
  const weekNumber = getISOWeek(now);
  const weekStartDate = format(startOfISOWeek(now), "yyyy-MM-dd");
  return {
    type: action.type as any,
    section: action.section,
    content: action.content,
    folder: action.folder,
    day: action.day,
    time: action.time,
    field: action.field,
    reminderDate: action.reminderDate,
    reminderTime: action.reminderTime,
    platform: action.platform,
    budgetCategory: action.budgetCategory,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    weekNumber,
    weekStartDate,
    date: format(now, "yyyy-MM-dd"),
  };
}

// ── Single Action Card ─────────────────────────────────────────────────────────
function ActionCard({
  action,
  savedState,
  onSave,
}: {
  action: PlannerAction;
  savedState: { saved: boolean; saving: boolean; navPath?: string; target?: string } | undefined;
  onSave: (action: PlannerAction) => void;
}) {
  const [, navigate] = useLocation();
  const meta = ACTION_META[action.type] ?? ACTION_META.note;
  const saved = savedState?.saved ?? false;
  const saving = savedState?.saving ?? false;
  // After save, use the returned navPath; before save, use the default for the type
  const navPath = savedState?.navPath ?? meta.defaultNavPath;

  const handleLabelClick = () => {
    if (navPath) navigate(navPath);
  };

  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${meta.color} mt-1`}>
      <div className="mt-0.5 shrink-0">{meta.icon}</div>
      <div className="flex-1 min-w-0">
        {/* Clickable label — navigates to the right planner section */}
        <button
          onClick={handleLabelClick}
          className="font-semibold mb-0.5 flex items-center gap-1 hover:underline underline-offset-2 cursor-pointer text-left"
          title={`View in ${meta.navHint}`}
        >
          {meta.label}
          <ExternalLink className="w-2.5 h-2.5 opacity-50" />
        </button>
        <div className="line-clamp-2 opacity-80">{action.content}</div>
        {(action.day || action.reminderDate) && (
          <div className="opacity-60 mt-0.5">
            {action.day}{action.time && ` at ${action.time}`}
            {action.reminderDate && !action.day && action.reminderDate}
            {action.reminderTime && !action.time && ` at ${action.reminderTime}`}
          </div>
        )}
        {action.platform && <div className="opacity-60 mt-0.5">Platform: {action.platform}</div>}
        {action.folder && <div className="opacity-60 mt-0.5">Folder: {action.folder}</div>}
        {action.budgetCategory && <div className="opacity-60 mt-0.5">Category: {action.budgetCategory}</div>}
        {saved && savedState?.target && (
          <div className="mt-1.5 flex items-center gap-1.5 text-green-700 font-medium flex-wrap">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>{savedState.target}</span>
            {navPath && (
              <button
                onClick={handleLabelClick}
                className="inline-flex items-center gap-0.5 underline underline-offset-2 cursor-pointer hover:opacity-70"
              >
                View in planner <ExternalLink className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}
      </div>
      {!saved ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2.5 text-xs shrink-0 font-semibold"
          onClick={() => onSave(action)}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
        </Button>
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600 mt-0.5" />
      )}
    </div>
  );
}

// ── Action Cards Group (with Save All) ────────────────────────────────────────
function ActionCardsGroup({
  actions,
  messageId,
}: {
  actions: PlannerAction[];
  messageId: string;
}) {
  const now = new Date();
  type CardState = { saved: boolean; saving: boolean; navPath?: string; target?: string };
  const [states, setStates] = useState<Record<number, CardState>>({});
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  // Invalidate all planner queries so views refresh instantly after save
  const invalidatePlannerQueries = () => {
    utils.weekly.invalidate();
    utils.monthly.invalidate();
    utils.daily.invalidate();
    utils.bigGoals.invalidate();
    utils.annual.invalidate();
    utils.notes.invalidate();
  };

  const saveMutation = trpc.zion.saveParsedItem.useMutation();

  const handleSaveOne = (action: PlannerAction, idx: number) => {
    if (states[idx]?.saved || states[idx]?.saving) return;
    setStates(prev => ({ ...prev, [idx]: { saved: false, saving: true } }));
    saveMutation.mutate(buildSavePayload(action, now), {
      onSuccess: (data) => {
        const navPath = (data as any).navPath;
        setStates(prev => ({
          ...prev,
          [idx]: { saved: true, saving: false, navPath, target: data.target },
        }));
        invalidatePlannerQueries();
        toast.success(`✅ Saved to ${data.target}!`, { duration: 3000 });
      },
      onError: (err) => {
        setStates(prev => ({ ...prev, [idx]: { saved: false, saving: false } }));
        console.error("[Zion Save]", err);
        toast.error(`Could not save: ${err.message}`, { duration: 6000 });
      },
    });
  };

  const handleSaveAll = () => {
    actions.forEach((action, idx) => {
      if (!states[idx]?.saved && !states[idx]?.saving) {
        handleSaveOne(action, idx);
      }
    });
  };

  const unsavedCount = actions.filter((_, i) => !states[i]?.saved).length;
  const allSaved = unsavedCount === 0;

  // After all items saved, find the best navPath to go to
  const firstNavPath = Object.values(states).find(s => s.saved && s.navPath)?.navPath;

  return (
    <div className="w-full mt-1 space-y-1">
      <div className="flex items-center justify-between px-1">
        <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {actions.length} item{actions.length > 1 ? "s" : ""} ready to save
        </div>
        {!allSaved && actions.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] font-semibold gap-1 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            onClick={handleSaveAll}
          >
            <SaveAll className="w-3 h-3" />
            Save All
          </Button>
        )}
        {allSaved && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> All saved!
            </span>
            {firstNavPath && (
              <button
                onClick={() => navigate(firstNavPath)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 font-semibold flex items-center gap-1 hover:bg-green-100 transition-colors"
              >
                View in Planner <ExternalLink className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}
      </div>
      {actions.map((action, i) => (
        <ActionCard
          key={`${messageId}-${i}`}
          action={action}
          savedState={states[i]}
          onSave={(a) => handleSaveOne(a, i)}
        />
      ))}
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className={`text-[10px] font-medium opacity-50 px-1 ${isUser ? "text-right" : "text-left"}`}>
          {isUser ? (msg.isVoice ? "You (voice)" : "You") : "Zion"}
        </div>

        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-[#1a1a1a] text-white rounded-tr-sm"
            : "bg-white border border-[#e8e0d5] text-[#3d3730] rounded-tl-sm"
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
              <Streamdown>{msg.content}</Streamdown>
            </div>
          )}
        </div>

        {!isUser && msg.plannerActions && msg.plannerActions.length > 0 && (
          <ActionCardsGroup actions={msg.plannerActions} messageId={msg.id} />
        )}

        <div className="text-[10px] opacity-30 px-1">
          {msg.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

// ── Gmail Email Summary Panel ──────────────────────────────────────────────────
function EmailSummaryPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const [result, setResult] = useState<{ summary: string; emailCount: number; emails: { from: string; subject: string; snippet: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: gmailStatus } = trpc.gmail.status.useQuery(undefined, { enabled: isAuthenticated });
  const summaryMutation = trpc.gmail.summarizeToday.useMutation();

  const fetchEmails = async () => {
    setLoading(true);
    setError("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = await summaryMutation.mutateAsync({ date: today });
      setResult(data as any);
    } catch (e: any) {
      setError(e?.message ?? "Could not fetch emails.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmails(); }, []);

  // Parse sender name from "Name <email>" format
  const parseName = (from: string) => from.replace(/<[^>]+>/, "").trim() || from;

  return (
    <div className="mx-4 mb-2 rounded-2xl border border-[#e8e0d5] bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0ebe4] bg-gradient-to-r from-red-50 to-orange-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
            <Mail className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1a1a1a]">Email Summary</p>
            <p className="text-[10px] text-[#8a7a6a]">
              {result ? `${result.emailCount} email${result.emailCount !== 1 ? "s" : ""} today` : "Today's inbox"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchEmails}
            disabled={loading}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#8a7a6a] hover:bg-red-100 hover:text-red-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#8a7a6a] hover:bg-[#f0ebe4] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {loading && !result && (
          <div className="flex items-center justify-center gap-2 py-8 text-[#8a7a6a]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Fetching your emails…</span>
          </div>
        )}

        {!gmailStatus?.gmailEnabled && !loading && (
          <div className="p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#3d3730]">Gmail not connected</p>
              <p className="text-xs text-[#8a7a6a] mt-0.5">Go to <Link to="/integrations" className="text-emerald-600 underline">Integrations</Link> and re-authorize Google to enable Gmail access.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 space-y-3">
            {result.emailCount === 0 ? (
              <p className="text-sm text-[#8a7a6a] text-center py-2">📭 Inbox is clear today!</p>
            ) : (
              <>
                {/* Individual email cards */}
                <div className="space-y-1.5">
                  {result.emails.slice(0, 6).map((email, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#faf8f5] border border-[#ede8e0]">
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-red-600">
                        {parseName(email.from).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#3d3730] truncate">{email.subject}</p>
                        <p className="text-[10px] text-[#8a7a6a] truncate">{parseName(email.from)}</p>
                        {email.snippet && (
                          <p className="text-[10px] text-[#a09080] mt-0.5 line-clamp-1">{email.snippet}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {result.emails.length > 6 && (
                    <p className="text-[10px] text-center text-[#8a7a6a]">+{result.emails.length - 6} more emails</p>
                  )}
                </div>

                {/* AI Summary */}
                <div className="border-t border-[#f0ebe4] pt-3">
                  <p className="text-[10px] font-semibold text-[#8a7a6a] uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-500" /> Zion's Summary
                  </p>
                  <div className="prose prose-sm max-w-none prose-p:my-1 text-[#3d3730] text-xs">
                    <Streamdown>{result.summary}</Streamdown>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chief of Staff Panel ───────────────────────────────────────────────────────
function ChiefOfStaffPanel({ onClose }: { onClose: () => void }) {
  const [briefing, setBriefing] = useState<{ briefing: string; dateLabel: string; hasEmails: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [includeEmails, setIncludeEmails] = useState(false);
  const { data: gmailStatus, isAuthenticated } = trpc.gmail.status.useQuery(undefined) as any;
  const chiefOfStaffMutation = trpc.zion.chiefOfStaff.useMutation();

  const generate = async (withEmails = includeEmails) => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = await chiefOfStaffMutation.mutateAsync({ date: today, includeEmails: withEmails });
      setBriefing(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate briefing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generate(false); }, []);

  return (
    <div className="mx-4 mb-2 rounded-2xl border border-[#e8e0d5] bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0ebe4] bg-gradient-to-r from-violet-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
            <Briefcase className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1a1a1a]">Chief of Staff</p>
            <p className="text-[10px] text-[#8a7a6a]">{briefing?.dateLabel ?? "Daily briefing"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Email toggle if Gmail connected */}
          {gmailStatus?.gmailEnabled && (
            <button
              onClick={() => {
                const next = !includeEmails;
                setIncludeEmails(next);
                generate(next);
              }}
              disabled={loading}
              title={includeEmails ? "Emails included — click to exclude" : "Click to include emails"}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-all ${
                includeEmails
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-[#faf8f5] border-[#e8e0d5] text-[#8a7a6a]"
              }`}
            >
              <Mail className="w-3 h-3" />
              {includeEmails ? "Emails on" : "+ Emails"}
            </button>
          )}
          <button
            onClick={() => generate(includeEmails)}
            disabled={loading}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#8a7a6a] hover:bg-violet-100 hover:text-violet-600 transition-colors"
            title="Regenerate"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#8a7a6a] hover:bg-[#f0ebe4] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-[#8a7a6a]">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
            </div>
            <p className="text-sm">Preparing your briefing…</p>
          </div>
        )}

        {!loading && briefing && (
          <div className="p-4">
            <div className="prose prose-sm max-w-none text-[#3d3730]
              prose-h2:text-sm prose-h2:font-bold prose-h2:text-[#1a1a1a] prose-h2:mt-3 prose-h2:mb-1 prose-h2:first:mt-0
              prose-ul:my-1 prose-li:my-0.5 prose-li:text-xs prose-p:text-xs prose-p:my-1">
              <Streamdown>{briefing.briefing}</Streamdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Zion Page ─────────────────────────────────────────────────────────────
export default function ZionPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isFetchingEmails, setIsFetchingEmails] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { data: gmailStatus } = trpc.gmail.status.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });
  const emailSummaryMutation = trpc.gmail.summarizeToday.useMutation();
  const [activePanel, setActivePanel] = useState<"emails" | "chiefofstaff" | null>(null);

  const { data: historyData, isLoading: historyLoading } = trpc.zion.history.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const chatMutation = trpc.zion.chat.useMutation();
  const clearMutation = trpc.zion.clearHistory.useMutation();
  const transcribeMutation = trpc.zion.transcribeVoice.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (historyData && historyData.length > 0) {
      setMessages(historyData.map(m => ({
        id: String(m.id),
        role: m.role as "user" | "assistant",
        content: m.content,
        plannerActions: m.metadata ? (() => { try { return JSON.parse(m.metadata!).plannerActions; } catch { return undefined; } })() : undefined,
        isVoice: m.metadata ? (() => { try { return JSON.parse(m.metadata!).isVoice; } catch { return false; } })() : false,
        createdAt: new Date(m.createdAt),
      })));
    } else if (historyData && historyData.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: `# Welcome! I'm Zion 🌟\n\nI'm your personal AI wellness assistant for the **Be Do Become** planner. I'm here to help you:\n\n- **Organize your thoughts** — brain dump anything and I'll sort it into your planner instantly\n- **Set reminders** — tell me what to remind you of and I'll add it to your calendar\n- **Plan your week** — share what's on your mind and I'll prioritize it\n- **Track habits & wins** — I'll add them directly to your weekly tracker\n- **Manage your budget** — mention expenses or savings goals and I'll log them\n- **Plan social content** — share post ideas and I'll add them to your content calendar\n\nJust type or **speak** anything on your mind. I'll extract every actionable item and show you **Save** buttons to add them to the right planner section instantly.\n\n> *Try: "I need to launch my course in April, remind me to follow up with my client on Friday at 3pm, I want to save $500 this month, and I've been skipping the gym..."*\n\n**What's on your mind today?** ✨`,
        createdAt: new Date(),
      }]);
    }
  }, [historyData]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  };

  const sendMessage = async (text: string, isVoice = false) => {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    setInput("");

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      isVoice,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const result = await chatMutation.mutateAsync({ message: text.trim(), isVoice });
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.content,
        plannerActions: result.plannerActions,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      utils.zion.history.invalidate();
    } catch {
      toast.error("Zion couldn't respond right now. Please try again.");
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Email summary (direct action, doesn't go through chat mutation) ──────────
  const handleEmailSummary = async () => {
    if (isFetchingEmails || isSending) return;

    const today = new Date().toISOString().slice(0, 10);

    // Add user-side message instantly
    const userMsg: Message = {
      id: `user-emails-${Date.now()}`,
      role: "user",
      content: "📧 Summarise my emails from today",
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsFetchingEmails(true);

    try {
      const result = await emailSummaryMutation.mutateAsync({ date: today });
      const assistantMsg: Message = {
        id: `assistant-emails-${Date.now()}`,
        role: "assistant",
        content: result.emailCount === 0
          ? result.summary
          : `📬 **${result.emailCount} email${result.emailCount > 1 ? "s" : ""} today**\n\n${result.summary}`,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const msg = err?.message ?? "Could not fetch emails. Please try again.";
      const needsAuth = msg.includes("Re-authorize") || msg.includes("not yet granted");
      const assistantMsg: Message = {
        id: `assistant-emails-err-${Date.now()}`,
        role: "assistant",
        content: needsAuth
          ? `🔐 **Gmail access needed**\n\nI don't have permission to read your emails yet. Head to **Integrations** and click **Re-authorize** under the Gmail section — it only takes a second.\n\n[Open Integrations →](/integrations)`
          : `⚠️ ${msg}`,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsFetchingEmails(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Clear all conversation history with Zion? This cannot be undone.")) return;
    try {
      await clearMutation.mutateAsync();
      setMessages([{
        id: "welcome-new",
        role: "assistant",
        content: "Fresh start! ✨ I'm here whenever you're ready. What's on your mind?",
        createdAt: new Date(),
      }]);
      utils.zion.history.invalidate();
    } catch {
      toast.error("Failed to clear history. Please try again.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) { toast.error("Recording too short. Please try again."); return; }
        const formData = new FormData();
        formData.append("file", blob, "voice.webm");
        try {
          const res = await fetch("/api/upload/voice", { method: "POST", body: formData });
          if (!res.ok) throw new Error("Upload failed");
          const { url } = await res.json();
          const { text } = await transcribeMutation.mutateAsync({ audioUrl: url });
          if (text) {
            setInput(text);
            toast.success("Voice transcribed! Review and send.");
          } else {
            toast.error("Could not transcribe audio. Please try again.");
          }
        } catch {
          toast.error("Voice transcription failed. Please type your message.");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#faf8f5] min-h-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e0d5] bg-white/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1a1a1a] tracking-tight">Zion</h1>
            <p className="text-xs text-[#8a7a6a]">Your AI Wellness Assistant · Be Do Become</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 hidden sm:flex">
            <Sparkles className="w-2.5 h-2.5 mr-1" /> Fully Actionable
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            className="text-[#8a7a6a] hover:text-red-500 h-8 w-8 p-0"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Capability chips */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { icon: <Target className="w-3 h-3" />,    label: "Goals",        prompt: "Help me set and review my big goals for this year" },
            { icon: <Bell className="w-3 h-3" />,       label: "Reminders",    prompt: "Add a reminder for me — " },
            { icon: <Calendar className="w-3 h-3" />,   label: "Calendar",     prompt: "Add this to my calendar: " },
            { icon: <Heart className="w-3 h-3" />,      label: "Habits",       prompt: "Help me build a new habit or review my current ones" },
            { icon: <DollarSign className="w-3 h-3" />, label: "Budget",       prompt: "Help me track my budget — " },
            { icon: <Share2 className="w-3 h-3" />,     label: "Social Posts", prompt: "Help me plan my social media content for this week" },
            { icon: <BookOpen className="w-3 h-3" />,   label: "Notes",        prompt: "Save a note for me: " },
            { icon: <Smile className="w-3 h-3" />,      label: "Gratitude",    prompt: "I'm grateful for " },
          ].map(c => (
            <button
              key={c.label}
              onClick={() => {
                setActivePanel(null);
                setInput(c.prompt);
                setTimeout(() => textareaRef.current?.focus(), 50);
              }}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#e8e0d5] text-[#8a7a6a] hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 active:bg-emerald-100 active:border-emerald-300 active:scale-95 transition-all cursor-pointer select-none"
            >
              {c.icon}{c.label}
            </button>
          ))}

          {/* Email summary panel toggle */}
          <button
            onClick={() => setActivePanel(p => p === "emails" ? null : "emails")}
            title="Today's email summary"
            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer select-none active:scale-95 ${
              activePanel === "emails"
                ? "bg-red-100 border-red-300 text-red-700"
                : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300"
            }`}
          >
            <Mail className="w-3 h-3" />
            Emails
            {activePanel === "emails" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          </button>

          {/* Chief of Staff panel toggle */}
          <button
            onClick={() => setActivePanel(p => p === "chiefofstaff" ? null : "chiefofstaff")}
            title="Daily briefing from your Chief of Staff"
            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer select-none active:scale-95 ${
              activePanel === "chiefofstaff"
                ? "bg-violet-100 border-violet-300 text-violet-700"
                : "bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100 hover:border-violet-300"
            }`}
          >
            <Briefcase className="w-3 h-3" />
            Briefing
            {activePanel === "chiefofstaff" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          </button>
        </div>
      </div>

      {/* Active panel */}
      {activePanel === "emails" && (
        <div className="shrink-0">
          <EmailSummaryPanel onClose={() => setActivePanel(null)} />
        </div>
      )}
      {activePanel === "chiefofstaff" && (
        <div className="shrink-0">
          <ChiefOfStaffPanel onClose={() => setActivePanel(null)} />
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ minHeight: 0 }}
      >
        {historyLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
        )}

        {isSending && (
          <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-[#e8e0d5] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 right-6 w-8 h-8 rounded-full bg-white border border-[#e8e0d5] shadow-md flex items-center justify-center text-[#8a7a6a] hover:text-[#1a1a1a] transition-colors z-10"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Input area */}
      <div className="shrink-0 px-4 pb-4 pt-2 bg-white/80 backdrop-blur-sm border-t border-[#e8e0d5]">
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            "Brain dump my week",
            "Remind me to...",
            "Add to my calendar",
            "Help me set goals",
            "Plan social content",
            "Log a win",
          ].map(prompt => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="shrink-0 text-[10px] px-2.5 py-1 rounded-full border border-[#e8e0d5] bg-white text-[#8a7a6a] hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors whitespace-nowrap"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-end">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isSending || transcribeMutation.isPending}
            className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200"
                : transcribeMutation.isPending
                ? "bg-emerald-100 text-emerald-500"
                : "bg-[#f0ebe4] text-[#8a7a6a] hover:bg-emerald-100 hover:text-emerald-600"
            }`}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            {transcribeMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your brain dump, ask for a reminder, add to calendar, log a win... (Enter to send)"
              className="resize-none min-h-[44px] max-h-32 text-sm bg-[#f8f5f0] border-[#e8e0d5] rounded-xl pr-12 focus:border-emerald-300 focus:ring-emerald-200 placeholder:text-[#c8c0b4]"
              rows={1}
              disabled={isSending}
            />
          </div>

          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isSending}
            className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              input.trim() && !isSending
                ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md hover:shadow-lg hover:scale-105"
                : "bg-[#f0ebe4] text-[#c8c0b4] cursor-not-allowed"
            }`}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        {isRecording && (
          <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
            <Volume2 className="w-3 h-3 animate-pulse" />
            Recording... tap the mic button to stop and transcribe
          </div>
        )}
      </div>
    </div>
  );
}
