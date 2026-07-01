import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Streamdown } from "streamdown";
import {
  Sparkles, Mic, MicOff, Send, Trash2, CheckCircle2,
  Calendar, Target, BookOpen, Heart, BarChart2, Loader2,
  Volume2, ChevronDown, Bell, DollarSign, Share2, Smile,
  ExternalLink, SaveAll, Brain, X as XIcon, Download, Upload, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { getISOWeek, startOfISOWeek, format } from "date-fns";
import { useLocation } from "wouter";
import {
  getLocalHistory,
  addLocalMessage,
  clearLocalHistory,
  getLocalMemories,
  upsertLocalMemory,
  deleteLocalMemory,
  formatMemoryContext,
  exportLocalData,
  importLocalData,
  type LocalZionMessage,
  type LocalZionMemory,
} from "@/lib/zionLocalStore";
import { encryptJson, decryptJson, type EncryptedBundle } from "@/lib/zionCrypto";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

// ── Backup export/import dialog ────────────────────────────────────────────────
function BackupDialog({
  open, onClose, userId,
}: { open: boolean; onClose: () => void; userId: number }) {
  const [mode, setMode] = useState<"idle" | "export" | "import">("idle");
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!passphrase.trim()) { toast.error("Enter a passphrase to protect your backup"); return; }
    setBusy(true);
    try {
      const data = await exportLocalData(userId);
      const bundle = await encryptJson(data, passphrase);
      const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zion-backup-${new Date().toISOString().slice(0, 10)}.bdbzion`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Encrypted backup downloaded — keep your passphrase safe!");
      onClose();
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !passphrase.trim()) { toast.error("Enter your passphrase first, then select the file"); return; }
    setBusy(true);
    try {
      const text = await file.text();
      const bundle = JSON.parse(text) as EncryptedBundle;
      const data = await decryptJson(bundle, passphrase);
      await importLocalData(userId, data as Parameters<typeof importLocalData>[1]);
      toast.success("Backup restored! Reload the page to see your history.");
      onClose();
    } catch {
      toast.error("Import failed — wrong passphrase or corrupted file.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lock className="w-4 h-4 text-violet-600" /> Encrypted Backup</DialogTitle>
          <DialogDescription className="text-xs text-[#8a7a6a]">
            Your Zion memory and history lives only on this device. Create an encrypted backup to restore it on another device. Your passphrase never leaves this browser.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <Input
            type="password"
            placeholder="Backup passphrase"
            value={passphrase}
            onChange={e => setPassphrase(e.target.value)}
            className="h-10"
            autoComplete="new-password"
          />
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => { setMode("export"); handleExport(); }}
              disabled={busy || mode === "import"}
            >
              {busy && mode === "export" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => { setMode("import"); fileRef.current?.click(); }}
              disabled={busy || mode === "export"}
            >
              {busy && mode === "import" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import
            </Button>
          </div>
          <input ref={fileRef} type="file" accept=".bdbzion,application/json" className="hidden" onChange={handleImport} />
          <p className="text-[10px] text-center text-[#b0a090]">AES-256-GCM · 200,000 PBKDF2 rounds · zero server access</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const WELCOME_MSG: Message = {
  id: "welcome",
  role: "assistant",
  content: `# Welcome! I'm Zion 🌟\n\nI'm your personal AI wellness assistant for the **Be Do Become** planner. I'm here to help you:\n\n- **Organize your thoughts** — brain dump anything and I'll sort it into your planner instantly\n- **Set reminders** — tell me what to remind you of and I'll add it to your calendar\n- **Plan your week** — share what's on your mind and I'll prioritize it\n- **Track habits & wins** — I'll add them directly to your weekly tracker\n- **Manage your budget** — mention expenses or savings goals and I'll log them\n- **Plan social content** — share post ideas and I'll add them to your content calendar\n\nJust type or **speak** anything on your mind. I'll extract every actionable item and show you **Save** buttons to add them to the right planner section instantly.\n\n> *Try: "I need to launch my course in April, remind me to follow up with my client on Friday at 3pm, I want to save $500 this month, and I've been skipping the gym..."*\n\n**What's on your mind today?** ✨`,
  createdAt: new Date(),
};

// ── Main Zion Page ─────────────────────────────────────────────────────────────
export default function ZionPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const userId = (user as any)?.id as number | undefined;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const transcribeMutation = trpc.zion.transcribeVoice.useMutation();
  const [showMemory, setShowMemory] = useState(false);
  const [memories, setMemories] = useState<LocalZionMemory[]>([]);
  const [showBackup, setShowBackup] = useState(false);

  // Load history from IndexedDB on mount
  useEffect(() => {
    if (!userId) return;
    getLocalHistory(userId).then(history => {
      if (history.length > 0) {
        setMessages(history.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          plannerActions: m.plannerActions as PlannerAction[] | undefined,
          isVoice: m.isVoice,
          createdAt: new Date(m.createdAt),
        })));
      } else {
        setMessages([WELCOME_MSG]);
      }
      setHistoryLoading(false);
    }).catch(() => {
      setMessages([WELCOME_MSG]);
      setHistoryLoading(false);
    });
  }, [userId]);

  // Load memories when panel opens
  useEffect(() => {
    if (!showMemory || !userId) return;
    getLocalMemories(userId).then(setMemories).catch(() => setMemories([]));
  }, [showMemory, userId]);

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
    if (!text.trim() || isSending || !userId) return;
    setIsSending(true);
    setInput("");

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      isVoice,
      createdAt: new Date(),
    };

    // Persist user message locally immediately
    const localUserMsg: LocalZionMessage = {
      id: userMsg.id,
      role: "user",
      content: userMsg.content,
      isVoice: userMsg.isVoice,
      createdAt: userMsg.createdAt.toISOString(),
    };
    await addLocalMessage(userId, localUserMsg).catch(() => {});

    setMessages(prev => [...prev, userMsg]);

    const assistantMsgId = `assistant-${Date.now()}`;
    // Optimistically add an empty assistant message that will fill as tokens arrive
    const streamingMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, streamingMsg]);

    try {
      const recentHistory = messages
        .filter(m => m.id !== "welcome")
        .slice(-16)
        .map(m => ({ role: m.role, content: m.content }));

      const localMems = await getLocalMemories(userId).catch(() => [] as LocalZionMemory[]);
      const memoryContext = formatMemoryContext(localMems);

      const response = await fetch("/api/zion/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text.trim(), isVoice, history: recentHistory, memoryContext }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let accumulated = "";
      let finalPlannerActions: PlannerAction[] | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(part.slice(6)) as Record<string, unknown>;

            if (typeof evt.token === "string") {
              accumulated += evt.token;
              // Trim the PLANNER_ACTIONS block from display in real time
              const displayIdx = accumulated.indexOf("<PLANNER_ACTIONS>");
              const displayContent = displayIdx >= 0 ? accumulated.slice(0, displayIdx).trim() : accumulated;
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, content: displayContent } : m
              ));
            } else if (evt.done) {
              const display = typeof evt.displayContent === "string" ? evt.displayContent : accumulated;
              const actions = Array.isArray(evt.plannerActions) ? (evt.plannerActions as PlannerAction[]) : [];
              finalPlannerActions = actions.length > 0 ? actions : undefined;

              // Final update with clean content + planner actions
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, content: display, plannerActions: finalPlannerActions } : m
              ));

              // Persist to IndexedDB
              await addLocalMessage(userId, {
                id: assistantMsgId,
                role: "assistant",
                content: display,
                plannerActions: finalPlannerActions,
                createdAt: new Date().toISOString(),
              }).catch(() => {});

              // Persist memory updates
              const memUpdates = Array.isArray(evt.memoryUpdates) ? evt.memoryUpdates as Array<{ category: LocalZionMemory["category"]; key: string; value: string }> : [];
              for (const item of memUpdates) {
                await upsertLocalMemory(userId, { category: item.category, keyName: item.key, value: item.value }).catch(() => {});
              }
            } else if (evt.error) {
              throw new Error(String(evt.error));
            }
          } catch (parseErr) {
            if ((parseErr as Error).message?.includes("Stream failed") || (parseErr as Error).message?.includes("unavailable")) {
              throw parseErr;
            }
            // ignore malformed SSE frames
          }
        }
      }
    } catch {
      toast.error("Zion couldn't respond right now. Please try again.");
      setMessages(prev => prev.filter(m => m.id !== userMsg.id && m.id !== assistantMsgId));
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

  const handleClearHistory = async () => {
    if (!userId) return;
    if (!confirm("Clear all local conversation history with Zion? This cannot be undone.")) return;
    try {
      await clearLocalHistory(userId);
      setMessages([{
        id: "welcome-new",
        role: "assistant",
        content: "Fresh start! ✨ I'm here whenever you're ready. What's on your mind?",
        createdAt: new Date(),
      }]);
    } catch {
      toast.error("Failed to clear history. Please try again.");
    }
  };

  const handleDeleteMemory = async (keyName: string) => {
    if (!userId) return;
    await deleteLocalMemory(userId, keyName).catch(() => {});
    setMemories(prev => prev.filter(m => m.keyName !== keyName));
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
      {userId && <BackupDialog open={showBackup} onClose={() => setShowBackup(false)} userId={userId} />}
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
          <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200 hidden sm:flex" title="Conversation stored only on your device">
            <Lock className="w-2.5 h-2.5 mr-1" /> On-Device Only
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBackup(true)}
            className="text-[#8a7a6a] hover:text-violet-600 h-8 w-8 p-0"
            title="Encrypted backup"
          >
            <Download className="w-4 h-4" />
          </Button>
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
                setInput(c.prompt);
                setTimeout(() => textareaRef.current?.focus(), 50);
              }}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#e8e0d5] text-[#8a7a6a] hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 active:bg-emerald-100 active:border-emerald-300 active:scale-95 transition-all cursor-pointer select-none"
            >
              {c.icon}{c.label}
            </button>
          ))}
          {/* Memory chip */}
          <button
            onClick={() => setShowMemory(v => !v)}
            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer select-none ${
              showMemory
                ? "bg-violet-100 border-violet-300 text-violet-700"
                : "bg-white border-[#e8e0d5] text-[#8a7a6a] hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600"
            }`}
          >
            <Brain className="w-3 h-3" />Memory
          </button>
        </div>
      </div>

      {/* Memory panel */}
      {showMemory && (
        <div className="mx-4 mb-2 rounded-2xl border border-violet-200 bg-violet-50/60 overflow-hidden shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-violet-200">
            <div className="flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-violet-600" />
              <p className="text-xs font-bold text-violet-800">What Zion Remembers About You</p>
            </div>
            <button onClick={() => setShowMemory(false)} className="text-violet-400 hover:text-violet-700">
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto p-2 space-y-1.5">
            {memories.length === 0 ? (
              <p className="text-[11px] text-center text-violet-400 py-3">
                No memories yet — Zion learns from your conversations over time.
              </p>
            ) : (
              memories.map(m => (
                <div key={m.keyName} className="flex items-start gap-2 group">
                  <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${
                    m.category === "preference" ? "bg-emerald-100 text-emerald-700" :
                    m.category === "pattern"    ? "bg-blue-100 text-blue-700" :
                    m.category === "insight"    ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{m.category}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-violet-900 leading-relaxed">{m.value}</p>
                    <p className="text-[9px] text-violet-400">{m.keyName}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMemory(m.keyName)}
                    className="opacity-0 group-hover:opacity-100 text-violet-300 hover:text-red-500 transition-all shrink-0 mt-0.5"
                    title="Forget this"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="px-3 py-1.5 border-t border-violet-200 bg-violet-100/50">
            <p className="text-[9px] text-violet-400 text-center flex items-center justify-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Stored on your device only · never sent to our servers
            </p>
          </div>
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

        {/* Streaming: show dots only while waiting for the very first token */}
        {isSending && messages[messages.length - 1]?.role !== "assistant" && (
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
