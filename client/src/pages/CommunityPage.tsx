import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Star, Send, Trophy, Flame, Users, MessageCircle, CheckCircle2,
  Loader2, Flag, Trash2, ChevronUp, Hash,
} from "lucide-react";
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

const REACTION_EMOJIS = ["👍", "❤️", "🔥", "💪"];

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
          <Star className={cn("w-7 h-7 transition-colors", n <= (hovered || value) ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-gray-200")} />
        </button>
      ))}
    </div>
  );
}

function StarRatingDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("w-3.5 h-3.5", n <= value ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200")} />
      ))}
    </div>
  );
}

// ── Check-in Section ──────────────────────────────────────────────────────────
function CheckInSection() {
  const utils = trpc.useUtils();
  const { data: existing } = trpc.community.myCheckIn.useQuery({ date: today });
  const submittedRef = useRef(false);

  const checkInMutation = trpc.community.checkIn.useMutation({
    onSuccess: () => {
      submittedRef.current = true;
      setNote("");
      setRating(0);
      utils.community.myCheckIn.invalidate();
      utils.community.leaderboard.invalidate();
      toast.success("Checked in! 🎉 You're on the board.");
    },
    onError: () => toast.error("Couldn't check in — please try again"),
  });

  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");

  // Pre-populate only on first load (not after submit)
  useEffect(() => {
    if (existing && !submittedRef.current) {
      setRating(existing.rating);
      setNote(existing.note ?? "");
    }
    submittedRef.current = false;
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
          {ratingInfo && <p className={cn("text-sm font-semibold", ratingInfo.color)}>{ratingInfo.emoji} {ratingInfo.label}</p>}
          {!rating && <p className="text-xs text-muted-foreground">Tap a star to rate your day</p>}
        </div>

        <div className="space-y-1">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 280))}
            placeholder="Share a win, a challenge, or what you're proud of today… (optional)"
            className="w-full text-sm resize-none rounded-xl border border-[#e8e0d5] bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 placeholder:text-muted-foreground/60"
            rows={2}
          />
          <p className="text-right text-[10px] text-muted-foreground/60">{note.length}/280</p>
        </div>

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
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="planner-card">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0">
          <Trophy size={16} className="text-white" />
        </div>
        <div>
          <h2 className="font-bold text-base">Leaderboard</h2>
          <p className="text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? "member" : "members"} checked in · last 24 hours
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-10 h-10 mx-auto mb-2 text-gray-200" />
          <p className="text-sm font-medium text-muted-foreground">No check-ins in the last 24 hours</p>
          <p className="text-xs text-muted-foreground mt-1">Be the first on the board! ⬆️</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const isMe = entry.userId === user?.id;
            const isExpanded = expandedId === entry.userId;
            const hasNote = !!entry.note?.trim();
            return (
              <div
                key={entry.userId}
                onClick={() => hasNote && setExpandedId(isExpanded ? null : entry.userId)}
                className={cn(
                  "px-3 py-3 rounded-xl transition-all",
                  isMe ? "bg-emerald-50 border border-emerald-200" : i < 3 ? "bg-[#faf8f5] border border-[#e8e0d5]" : "bg-[#faf8f5]",
                  hasNote && "cursor-pointer hover:border-emerald-300 hover:shadow-sm active:scale-[0.99]"
                )}
              >
                <div className="flex items-center gap-3">
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
                      {(entry as any).totalCheckIns > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                          <Hash size={8} />{(entry as any).totalCheckIns} total
                        </span>
                      )}
                    </div>
                    {hasNote && !isExpanded && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        "{entry.note}" <span className="text-emerald-500 font-medium">tap to read</span>
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    <StarRatingDisplay value={entry.rating} />
                    <span className="text-[10px] text-muted-foreground">{RATING_LABELS[entry.rating]?.emoji}</span>
                  </div>
                </div>

                {/* Expanded note */}
                {isExpanded && hasNote && (
                  <div className={cn(
                    "mt-3 pt-3 border-t text-sm leading-relaxed",
                    isMe ? "border-emerald-200 text-emerald-800" : "border-[#e8e0d5] text-foreground/80"
                  )}>
                    <p className="italic">"{entry.note}"</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">Tap to collapse</p>
                  </div>
                )}
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
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isFirstLoad = useRef(true);

  const { data: isAdmin } = trpc.community.isAdmin.useQuery();

  const { data: messages = [], refetch } = trpc.community.messages.useQuery(
    { beforeId: undefined },
    { refetchInterval: 5000 }
  );

  // Merge new messages into allMessages
  useEffect(() => {
    if (!messages.length) return;
    if (isFirstLoad.current) {
      setAllMessages(messages);
      if (messages.length < 50) setHasMore(false);
      isFirstLoad.current = false;
    } else {
      // Live polling: update existing + append new
      setAllMessages(prev => {
        const existingIds = new Set(prev.map((m: any) => m.id));
        const newOnes = messages.filter((m: any) => !existingIds.has(m.id));
        // Also update existing messages (for reactions, deletions)
        const updated = prev.map((m: any) => {
          const fresh = messages.find((fm: any) => fm.id === m.id);
          return fresh ?? m;
        });
        return [...updated, ...newOnes];
      });
    }
  }, [messages]);

  // Auto-scroll to bottom only on new messages
  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (allMessages.length > prevLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = allMessages.length;
  }, [allMessages.length]);

  const loadEarlier = useCallback(async () => {
    if (!allMessages.length || loadingMore) return;
    setLoadingMore(true);
    const oldestId = allMessages[0]?.id;
    try {
      const older = await utils.community.messages.fetch({ beforeId: oldestId });
      if (!older || older.length === 0) { setHasMore(false); return; }
      if (older.length < 50) setHasMore(false);
      const container = chatContainerRef.current;
      const scrollHeightBefore = container?.scrollHeight ?? 0;
      setAllMessages(prev => {
        const existingIds = new Set(prev.map((m: any) => m.id));
        const newOnes = older.filter((m: any) => !existingIds.has(m.id));
        return [...newOnes, ...prev];
      });
      // Preserve scroll position after prepending
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - scrollHeightBefore;
        }
      });
    } catch {
      toast.error("Couldn't load earlier messages");
    } finally {
      setLoadingMore(false);
    }
  }, [allMessages, loadingMore, utils]);

  const sendMutation = trpc.community.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      refetch();
    },
    onError: () => toast.error("Couldn't send message"),
  });

  const deleteMutation = trpc.community.deleteMessage.useMutation({
    onSuccess: () => refetch(),
  });

  const adminDeleteMutation = trpc.community.adminDeleteMessage.useMutation({
    onSuccess: () => { refetch(); toast.success("Message removed"); },
    onError: () => toast.error("Could not remove message"),
  });

  const reactMutation = trpc.community.reactToMessage.useMutation({
    onSuccess: () => refetch(),
  });

  const flagMutation = trpc.community.flagMessage.useMutation({
    onSuccess: () => toast.success("Message flagged for review"),
    onError: () => toast.error("Couldn't flag message"),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    sendMutation.mutate({ content: trimmed });
  };

  return (
    <div className="planner-card flex flex-col" style={{ minHeight: 480 }}>
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <MessageCircle size={16} className="text-white" />
        </div>
        <div>
          <h2 className="font-bold text-base">Community Chat</h2>
          <p className="text-xs text-muted-foreground">Full history · encourage each other</p>
        </div>
        {isAdmin && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">Admin</span>
        )}
      </div>

      {/* Load earlier button */}
      {hasMore && allMessages.length >= 50 && (
        <button
          onClick={loadEarlier}
          disabled={loadingMore}
          className="flex items-center justify-center gap-1.5 w-full py-2 mb-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-[#faf8f5] rounded-xl border border-[#e8e0d5] hover:border-emerald-300 transition-colors"
        >
          {loadingMore ? <Loader2 size={12} className="animate-spin" /> : <ChevronUp size={12} />}
          {loadingMore ? "Loading…" : "Load earlier messages"}
        </button>
      )}

      {/* Message feed */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 max-h-96 scroll-smooth">
        {allMessages.length === 0 ? (
          <div className="text-center py-10">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-muted-foreground">No messages yet — say hello! 👋</p>
          </div>
        ) : (
          allMessages.map((msg) => {
            const isMe = msg.userId === user?.id;

            // Soft-deleted message placeholder
            if (msg.isDeleted) {
              return (
                <div key={msg.id} className={cn("flex items-center gap-2.5", isMe && "flex-row-reverse")}>
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0" />
                  <p className="text-xs italic text-muted-foreground/50 px-3 py-2 rounded-2xl bg-gray-50 border border-gray-100">
                    {msg.deletedByAdmin ? "⚠️ Message removed by admin" : "🗑 Message deleted"}
                  </p>
                </div>
              );
            }

            const reactionEntries = Object.entries(msg.reactions ?? {}) as [string, number[]][];

            return (
              <div key={msg.id} className={cn("flex items-start gap-2.5 group", isMe && "flex-row-reverse")}>
                <Avatar name={msg.firstName} avatarUrl={msg.avatarUrl} size="sm" />
                <div className={cn("max-w-[75%]", isMe && "items-end flex flex-col")}>
                  <div className={cn("flex items-center gap-1.5 mb-0.5", isMe && "flex-row-reverse")}>
                    <span className="text-[11px] font-semibold text-muted-foreground">{isMe ? "You" : msg.firstName}</span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  <div className={cn(
                    "px-3 py-2 rounded-2xl text-sm leading-relaxed break-words",
                    isMe ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-tr-sm" : "bg-[#f0ece6] text-[#2d2520] rounded-tl-sm"
                  )}>
                    {msg.content}
                  </div>

                  {/* Reactions display */}
                  {reactionEntries.length > 0 && (
                    <div className={cn("flex gap-1 mt-1 flex-wrap", isMe && "justify-end")}>
                      {reactionEntries.map(([emoji, userIds]) => (
                        <button
                          key={emoji}
                          onClick={() => reactMutation.mutate({ messageId: msg.id, emoji })}
                          className={cn(
                            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
                            (userIds as number[]).includes(user?.id ?? -1)
                              ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                              : "bg-white border-[#e8e0d5] text-muted-foreground hover:bg-[#faf8f5]"
                          )}
                        >
                          {emoji} {(userIds as number[]).length}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action bar (hover) */}
                  <div className={cn(
                    "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
                    isMe && "flex-row-reverse"
                  )}>
                    {/* React buttons */}
                    {REACTION_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => reactMutation.mutate({ messageId: msg.id, emoji })}
                        className="text-xs hover:scale-110 transition-transform px-1 py-0.5 rounded-lg hover:bg-[#f0ece6]"
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                    {/* Own message delete */}
                    {isMe && (
                      <button
                        onClick={() => deleteMutation.mutate({ messageId: msg.id })}
                        className="ml-1 p-1 rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-50 transition-colors"
                        title="Delete message"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    {/* Admin delete (any message) */}
                    {isAdmin && !isMe && (
                      <button
                        onClick={() => {
                          if (confirm("Remove this message as admin?")) {
                            adminDeleteMutation.mutate({ messageId: msg.id });
                          }
                        }}
                        className="ml-1 p-1 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Admin: remove message"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    {/* Flag */}
                    {!isMe && (
                      <button
                        onClick={() => flagMutation.mutate({ messageId: msg.id })}
                        className="p-1 rounded-lg text-muted-foreground/40 hover:text-orange-400 hover:bg-orange-50 transition-colors"
                        title="Flag message"
                      >
                        <Flag size={11} />
                      </button>
                    )}
                  </div>
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
          {sendMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
          <Users size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Community</h1>
          <p className="text-muted-foreground text-sm">Check in, stay accountable, cheer each other on</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CheckInSection />
        <LeaderboardSection />
      </div>

      <ChatSection />
    </div>
  );
}
