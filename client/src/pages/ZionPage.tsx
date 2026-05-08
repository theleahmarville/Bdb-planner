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
  ExternalLink, SaveAll,
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
}> = {
  goal:         { icon: <Target className="w-3.5 h-3.5" />,    label: "Big Goal",       color: "bg-purple-50 text-purple-700 border-purple-200",  navHint: "Annual Planning → Big Goals" },
  note:         { icon: <BookOpen className="w-3.5 h-3.5" />,  label: "Note",           color: "bg-blue-50 text-blue-700 border-blue-200",        navHint: "Notes" },
  schedule:     { icon: <Calendar className="w-3.5 h-3.5" />,  label: "Schedule",       color: "bg-green-50 text-green-700 border-green-200",     navHint: "Weekly View → Schedule" },
  calendar:     { icon: <Calendar className="w-3.5 h-3.5" />,  label: "Calendar",       color: "bg-teal-50 text-teal-700 border-teal-200",        navHint: "Weekly View → Schedule" },
  habit:        { icon: <Heart className="w-3.5 h-3.5" />,     label: "Habit",          color: "bg-pink-50 text-pink-700 border-pink-200",        navHint: "Weekly View → Habits" },
  monthly_goal: { icon: <BarChart2 className="w-3.5 h-3.5" />, label: "Monthly Goal",   color: "bg-emerald-50 text-emerald-700 border-emerald-200",     navHint: "Monthly View → Goals" },
  priority:     { icon: <Target className="w-3.5 h-3.5" />,    label: "Priority",       color: "bg-emerald-50 text-emerald-700 border-emerald-200",  navHint: "Weekly View → Priorities" },
  intention:    { icon: <Sparkles className="w-3.5 h-3.5" />,  label: "Intention",      color: "bg-violet-50 text-violet-700 border-violet-200",  navHint: "Weekly View → Intentions" },
  win:          { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Win",         color: "bg-emerald-50 text-emerald-700 border-emerald-200", navHint: "Weekly View → Wins" },
  reminder:     { icon: <Bell className="w-3.5 h-3.5" />,      label: "Reminder",       color: "bg-red-50 text-red-700 border-red-200",           navHint: "Weekly View → Schedule" },
  budget:       { icon: <DollarSign className="w-3.5 h-3.5" />, label: "Budget",        color: "bg-lime-50 text-lime-700 border-lime-200",        navHint: "Monthly View → Budget" },
  social_post:  { icon: <Share2 className="w-3.5 h-3.5" />,    label: "Social Post",    color: "bg-sky-50 text-sky-700 border-sky-200",           navHint: "Weekly View → Social Posts" },
  gratitude:    { icon: <Smile className="w-3.5 h-3.5" />,     label: "Gratitude",      color: "bg-yellow-50 text-yellow-700 border-yellow-200",  navHint: "Weekly View → Gratitude" },
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
  const meta = ACTION_META[action.type] ?? ACTION_META.note;
  const saved = savedState?.saved ?? false;
  const saving = savedState?.saving ?? false;

  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${meta.color} mt-1`}>
      <div className="mt-0.5 shrink-0">{meta.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold mb-0.5">{meta.label}</div>
        <div className="line-clamp-2 opacity-80">{action.content}</div>
        {action.day && (
          <div className="opacity-60 mt-0.5">
            {action.day}{action.time && ` at ${action.time}`}
            {action.reminderDate && ` · ${action.reminderDate}`}
          </div>
        )}
        {action.platform && <div className="opacity-60 mt-0.5">Platform: {action.platform}</div>}
        {action.folder && <div className="opacity-60 mt-0.5">Folder: {action.folder}</div>}
        {action.budgetCategory && <div className="opacity-60 mt-0.5">Category: {action.budgetCategory}</div>}
        {saved && savedState?.target && (
          <div className="mt-1 flex items-center gap-1.5 text-green-700 font-medium flex-wrap">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Saved to {savedState.target}</span>
            {savedState.navPath && (
              <Link href={savedState.navPath}>
                <span className="inline-flex items-center gap-0.5 underline underline-offset-2 cursor-pointer hover:opacity-70">
                  View <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </Link>
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

  const saveMutation = trpc.zion.saveParsedItem.useMutation({
    onSuccess: (data, _vars, context: any) => {
      const idx = context?.idx as number;
      const navPath = (data as any).navPath;
      setStates(prev => ({
        ...prev,
        [idx]: { saved: true, saving: false, navPath, target: data.target },
      }));
      invalidatePlannerQueries();
      toast.success(`✅ Saved to ${data.target}!`, {
        description: navPath ? "Tap 'View' on the card to go there." : undefined,
        duration: 4000,
      });
    },
    onError: (err, _vars, context: any) => {
      const idx = context?.idx as number;
      setStates(prev => ({ ...prev, [idx]: { saved: false, saving: false } }));
      console.error("[Zion Save]", err);
      toast.error(`Could not save: ${err.message}`, { duration: 6000 });
    },
  });

  const handleSaveOne = (action: PlannerAction, idx: number) => {
    if (states[idx]?.saved || states[idx]?.saving) return;
    setStates(prev => ({ ...prev, [idx]: { saved: false, saving: true } }));
    saveMutation.mutate(buildSavePayload(action, now), { meta: { idx } } as any);
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

// ── Main Zion Page ─────────────────────────────────────────────────────────────
export default function ZionPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
    <div className="flex flex-col bg-[#faf8f5]" style={{ height: "calc(100vh - 0px)" }}>
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
            { icon: <Target className="w-3 h-3" />, label: "Goals" },
            { icon: <Bell className="w-3 h-3" />, label: "Reminders" },
            { icon: <Calendar className="w-3 h-3" />, label: "Calendar" },
            { icon: <Heart className="w-3 h-3" />, label: "Habits" },
            { icon: <DollarSign className="w-3 h-3" />, label: "Budget" },
            { icon: <Share2 className="w-3 h-3" />, label: "Social Posts" },
            { icon: <BookOpen className="w-3 h-3" />, label: "Notes" },
            { icon: <Smile className="w-3 h-3" />, label: "Gratitude" },
          ].map(c => (
            <span key={c.label} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#e8e0d5] text-[#8a7a6a]">
              {c.icon}{c.label}
            </span>
          ))}
        </div>
      </div>

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
