import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Star, Send, Trophy, Flame, Users, MessageCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const today = new Date().toISOString().slice(0, 10);

const RATING_LABELS: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: "😴", label: "Low energy day",   color: "text-slate-500" },
  2: { emoji: "😐", label: "Getting there",    color: "text-blue-500" },
  3: { emoji: "💪", label: "Good day",         color: "text-emerald-500" },
  4: { emoji: "🔥", label: "Great day",        color: "text-orange-500" },
  5: { emoji: "⚡", label: "Unstoppable!",      color: "text-yellow-500" },
};

// ── Avatar helper ─────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size = "md" }: { name: string; avatarUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-7 h-7 text-[10px]" : size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-xs";
  return (
    <div className={cn("rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center font-bold text-white", sizeClass)}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        : name.charAt(0).toUpperCase()
      }
    </div>
  );
}

// ── Star Rating Input ─────────────────────────────────────────────────────────
function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "w-7 h-7 transition-colors",
              n <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-200 fill-gray-200"
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ── Star Rating Display ───────────────────────────────────────────────────────
function StarRatingDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "w-3.5 h-3.5",
            n <= value ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
          )}
        />
      ))}
    </div>
  );
}

// ── Check-in Section ──────────────────────────────────────────────────────────
function CheckInSection() {
  const utils = trpc.useUtils();
  const { data: existing } = trpc.community.myCheckIn.useQuery({ date: today });
  const checkInMutation = trpc.community.checkIn.useMutation({
    onSuccess: () => {
      utils.community.myCheckIn.invalidate();
      utils.community.leaderboard.invalidate();
      toast.success("Checked in! 🎉 You're on the board.");
    },
    onError: () => toast.error("Couldn't check in — please try again"),
  });

  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setNote(existing.note ?? "");
    }
  }, [existing]);

  const ratingInfo = RATING_LABELS[rating];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { toast.error("Please give your day a rating first"); return; }
    checkInMutation.mutate({ date: today, rating, note: note.trim() || undefined });
  };

  return (
    <div className="planner-card">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0">
          <CheckCircle2 size={16} className="text-white" />
        </div>
        <div>
          <h2 className="font-bold text-base">Daily Productivity Check-in</h2>
          <p className="text-xs text-muted-foreground">
            {existing ? "You've checked in today — update anytime" : "How productive was your day?"}
          </p>
        </div>
        {existing && (
          <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <CheckCircle2 size={11} /> Checked in
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center gap-2 py-2">
          <StarRatingInput value={rating} onChange={setRating} />
          {ratingInfo && (
            <p className={cn("text-sm font-semibold", ratingInfo.color)}>
              {ratingInfo.emoji} {ratingInfo.label}
            </p>
          )}
          {!rating && <p className="text-xs text-muted-foreground">Tap a star to rate your day</p>}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 280))}
          placeholder="Share a win, a challenge, or what you're proud of today… (optional)"
          className="w-full text-sm resize-none rounded-xl border border-[#e8e0d5] bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 placeholder:text-muted-foreground/60"
          rows={2}
        />

        <button
          type="submit"
          disabled={!rating || checkInMutation.isPending}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm"
        >
          {checkInMutation.isPending
            ? <><Loader2 size={14} className="animate-spin" /> Checking in…</>
            : existing ? "Update Check-in" : "Check In for Today 🎯"
          }
        </button>
      </form>
    </div>
  );
}

// ── Leaderboard Section ───────────────────────────────────────────────────────
function LeaderboardSection() {
  const { user } = useAuth();
  const { data: entries = [], isLoading } = trpc.community.leaderboard.useQuery(
    { date: today },
    { refetchInterval: 30_000 }
  );

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="planner-card">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0">
          <Trophy size={16} className="text-white" />
        </div>
        <div>
          <h2 className="font-bold text-base">Today's Leaderboard</h2>
          <p className="text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? "member" : "members"} checked in today
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-10 h-10 mx-auto mb-2 text-gray-200" />
          <p className="text-sm font-medium text-muted-foreground">No check-ins yet today</p>
          <p className="text-xs text-muted-foreground mt-1">Be the first on the board! ⬆️</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const isMe = entry.userId === user?.id;
            return (
              <div
                key={entry.userId}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors",
                  isMe
                    ? "bg-emerald-50 border border-emerald-200"
                    : i < 3
                    ? "bg-[#faf8f5] border border-[#e8e0d5]"
                    : "bg-[#faf8f5]"
                )}
              >
                {/* Rank */}
                <span className="w-6 text-center text-sm font-black text-muted-foreground shrink-0">
                  {i < 3 ? medals[i] : `${i + 1}`}
                </span>

                <Avatar name={entry.firstName} avatarUrl={entry.avatarUrl} size="sm" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold truncate">
                      {entry.firstName}{isMe && <span className="text-emerald-600 ml-1">(you)</span>}
                    </span>
                    {entry.streak >= 2 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">
                        <Flame size={9} /> {entry.streak}d streak
                      </span>
                    )}
                  </div>
                  {entry.note && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">"{entry.note}"</p>
                  )}
                </div>

                <div className="shrink-0 flex flex-col items-end gap-0.5">
                  <StarRatingDisplay value={entry.rating} />
                  <span className="text-[10px] text-muted-foreground">
                    {RATING_LABELS[entry.rating]?.emoji}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Chat Section ──────────────────────────────────────────────────────────────
function ChatSection() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");

  const { data: messages = [] } = trpc.community.messages.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const sendMutation = trpc.community.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      utils.community.messages.invalidate();
    },
    onError: () => toast.error("Couldn't send message"),
  });

  const deleteMutation = trpc.community.deleteMessage.useMutation({
    onSuccess: () => utils.community.messages.invalidate(),
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    sendMutation.mutate({ content: trimmed });
  };

  return (
    <div className="planner-card flex flex-col" style={{ minHeight: 420 }}>
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <MessageCircle size={16} className="text-white" />
        </div>
        <div>
          <h2 className="font-bold text-base">Community Chat</h2>
          <p className="text-xs text-muted-foreground">Encourage each other · updates every 5s</p>
        </div>
      </div>

      {/* Message feed */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 max-h-80 scroll-smooth">
        {messages.length === 0 ? (
          <div className="text-center py-10">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-muted-foreground">No messages yet — say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === user?.id;
            return (
              <div
                key={msg.id}
                className={cn("flex items-start gap-2.5 group", isMe && "flex-row-reverse")}
              >
                <Avatar name={msg.firstName} avatarUrl={msg.avatarUrl} size="sm" />
                <div className={cn("max-w-[75%]", isMe && "items-end flex flex-col")}>
                  <div className={cn(
                    "flex items-center gap-1.5 mb-0.5",
                    isMe && "flex-row-reverse"
                  )}>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {isMe ? "You" : msg.firstName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className={cn(
                    "px-3 py-2 rounded-2xl text-sm leading-relaxed break-words",
                    isMe
                      ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-tr-sm"
                      : "bg-[#f0ece6] text-[#2d2520] rounded-tl-sm"
                  )}>
                    {msg.content}
                  </div>
                  {isMe && (
                    <button
                      onClick={() => deleteMutation.mutate({ messageId: msg.id })}
                      className="text-[10px] text-muted-foreground/50 hover:text-red-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 shrink-0 border-t border-[#e8e0d5] pt-3">
        <Avatar name={user?.name || "?"} avatarUrl={(user as any)?.avatarUrl} size="sm" />
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Say something encouraging…"
          maxLength={1000}
          className="flex-1 h-10 px-3 rounded-xl border border-[#e8e0d5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
        />
        <button
          type="submit"
          disabled={!message.trim() || sendMutation.isPending}
          className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
        >
          {sendMutation.isPending
            ? <Loader2 size={14} className="animate-spin" />
            : <Send size={14} />
          }
        </button>
      </form>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
          <Users size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Community</h1>
          <p className="text-muted-foreground text-sm">Check in, stay accountable, cheer each other on</p>
        </div>
      </div>

      {/* Check-in + Leaderboard side by side on wide screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CheckInSection />
        <LeaderboardSection />
      </div>

      {/* Chat full width */}
      <ChatSection />
    </div>
  );
}
