import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ExternalLink, Link2, X, CheckCircle2, Users, ChevronDown, ChevronUp,
  BarChart2, Sparkles, Loader2, Edit2, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", color: "#E1306C", placeholder: "@yourhandle", urlPrefix: "https://instagram.com/" },
  { id: "facebook", label: "Facebook", color: "#1877F2", placeholder: "Page or profile URL", urlPrefix: "https://facebook.com/" },
  { id: "twitter", label: "Twitter / X", color: "#000000", placeholder: "@yourhandle", urlPrefix: "https://x.com/" },
  { id: "tiktok", label: "TikTok", color: "#010101", placeholder: "@yourhandle", urlPrefix: "https://tiktok.com/@" },
  { id: "threads", label: "Threads", color: "#101010", placeholder: "@yourhandle", urlPrefix: "https://threads.net/@" },
  { id: "pinterest", label: "Pinterest", color: "#E60023", placeholder: "Profile or board URL", urlPrefix: "https://pinterest.com/" },
  { id: "youtube", label: "YouTube", color: "#FF0000", placeholder: "Channel URL or @handle", urlPrefix: "https://youtube.com/@" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2", placeholder: "Profile or company URL", urlPrefix: "https://linkedin.com/in/" },
];

interface EditingState {
  handle: string;
  profileUrl: string;
  displayName: string;
  followerCount: string;
  lastPostLikes: string;
  lastPostComments: string;
  lastPostReach: string;
  lastPostDate: string;
  avgLikes: string;
  engagementRate: string;
  contentNiche: string;
  contentGoal: string;
}

const EMPTY_EDIT: EditingState = {
  handle: "", profileUrl: "", displayName: "", followerCount: "",
  lastPostLikes: "", lastPostComments: "", lastPostReach: "", lastPostDate: "",
  avgLikes: "", engagementRate: "", contentNiche: "", contentGoal: "",
};

interface Props {
  weeklyPosts?: Record<string, string>;
}

export default function SocialAccountsPanel({ weeklyPosts }: Props = {}) {
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditingState>(EMPTY_EDIT);
  const [strategy, setStrategy] = useState<string | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);

  const { data: accounts = [], refetch } = trpc.socialAccounts.list.useQuery();

  const upsertMutation = trpc.socialAccounts.upsert.useMutation({
    onSuccess: () => { refetch(); setEditing(null); toast.success("Account updated!"); },
    onError: () => toast.error("Failed to save. Please try again."),
  });

  const disconnectMutation = trpc.socialAccounts.disconnect.useMutation({
    onSuccess: () => { refetch(); toast.success("Account disconnected"); },
  });

  const strategyMutation = trpc.socialAccounts.getContentStrategy.useMutation();

  const getAccount = (platformId: string) => accounts.find((a: any) => a.platform === platformId);

  const startEdit = (platformId: string) => {
    const acc = getAccount(platformId) as any;
    setEditing(platformId);
    setEditValues({
      handle: acc?.handle ?? "",
      profileUrl: acc?.profileUrl ?? "",
      displayName: acc?.displayName ?? "",
      followerCount: acc?.followerCount?.toString() ?? "",
      lastPostLikes: acc?.lastPostLikes?.toString() ?? "",
      lastPostComments: acc?.lastPostComments?.toString() ?? "",
      lastPostReach: acc?.lastPostReach?.toString() ?? "",
      lastPostDate: acc?.lastPostDate ?? "",
      avgLikes: acc?.avgLikes?.toString() ?? "",
      engagementRate: acc?.engagementRate?.toString() ?? "",
      contentNiche: acc?.contentNiche ?? "",
      contentGoal: acc?.contentGoal ?? "",
    });
  };

  const saveAccount = async (platformId: string) => {
    const platform = PLATFORMS.find((p) => p.id === platformId)!;
    let profileUrl = editValues.profileUrl.trim();
    if (!profileUrl && editValues.handle) {
      const handle = editValues.handle.replace(/^@/, "");
      profileUrl = `${platform.urlPrefix}${handle}`;
    }
    await upsertMutation.mutateAsync({
      platform: platformId,
      handle: editValues.handle || undefined,
      profileUrl: profileUrl || undefined,
      displayName: editValues.displayName || undefined,
      followerCount: editValues.followerCount ? parseInt(editValues.followerCount) : undefined,
      connected: true,
      lastPostLikes: editValues.lastPostLikes ? parseInt(editValues.lastPostLikes) : undefined,
      lastPostComments: editValues.lastPostComments ? parseInt(editValues.lastPostComments) : undefined,
      lastPostReach: editValues.lastPostReach ? parseInt(editValues.lastPostReach) : undefined,
      lastPostDate: editValues.lastPostDate || undefined,
      avgLikes: editValues.avgLikes ? parseInt(editValues.avgLikes) : undefined,
      engagementRate: editValues.engagementRate ? parseFloat(editValues.engagementRate) : undefined,
      contentNiche: editValues.contentNiche || undefined,
      contentGoal: editValues.contentGoal || undefined,
    });
  };

  const handleGetStrategy = async () => {
    setStrategyLoading(true);
    setShowStrategy(true);
    try {
      const result = await strategyMutation.mutateAsync({ weeklyPosts: weeklyPosts ?? {} });
      setStrategy(result.strategy);
    } catch {
      toast.error("Couldn't generate strategy. Please try again.");
      setStrategy(null);
    } finally {
      setStrategyLoading(false);
    }
  };

  const connectedAccounts = accounts.filter((a: any) => a.connected);
  const unconnectedPlatforms = PLATFORMS.filter((p) => !getAccount(p.id)?.connected);

  const numVal = (v: string) => (v ? parseInt(v).toLocaleString() : null);

  return (
    <div className="space-y-4">
      {/* ── Connected accounts cards ────────────────────────────────────────── */}
      {connectedAccounts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Connected Accounts</p>
          {connectedAccounts.map((acc: any) => {
            const platform = PLATFORMS.find((p) => p.id === acc.platform);
            if (!platform) return null;
            const isEditing = editing === acc.platform;
            const hasStats = acc.lastPostLikes != null || acc.lastPostComments != null || acc.lastPostReach != null;

            return (
              <div key={acc.platform} className="planner-card !p-4">
                {/* Platform header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">{platform.label}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      {acc.handle && <p className="text-xs text-muted-foreground">{acc.handle}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Open profile link — build URL from handle if profileUrl not stored */}
                    {(() => {
                      const url = acc.profileUrl ||
                        (acc.handle ? `${platform.urlPrefix}${(acc.handle as string).replace(/^@/, "")}` : null);
                      return url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-2.5 rounded-lg border border-border flex items-center gap-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open {platform.label}
                        </a>
                      ) : null;
                    })()}
                    <button
                      onClick={() => startEdit(acc.platform)}
                      className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Edit account"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => disconnectMutation.mutate({ platform: acc.platform })}
                      className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                      title="Disconnect"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                {!isEditing && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div className="bg-[#faf8f5] rounded-xl px-3 py-2 text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Followers</p>
                      <p className="text-lg font-black text-foreground">
                        {acc.followerCount ? acc.followerCount.toLocaleString() : <span className="text-muted-foreground text-xs font-medium">—</span>}
                      </p>
                    </div>
                    <div className="bg-[#faf8f5] rounded-xl px-3 py-2 text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Last Post ❤️</p>
                      <p className="text-lg font-black text-foreground">
                        {acc.lastPostLikes != null ? numVal(acc.lastPostLikes.toString()) : <span className="text-muted-foreground text-xs font-medium">—</span>}
                      </p>
                    </div>
                    <div className="bg-[#faf8f5] rounded-xl px-3 py-2 text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Comments 💬</p>
                      <p className="text-lg font-black text-foreground">
                        {acc.lastPostComments != null ? numVal(acc.lastPostComments.toString()) : <span className="text-muted-foreground text-xs font-medium">—</span>}
                      </p>
                    </div>
                    <div className="bg-[#faf8f5] rounded-xl px-3 py-2 text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Engagement</p>
                      <p className="text-lg font-black text-foreground">
                        {acc.engagementRate != null ? `${acc.engagementRate}%` : <span className="text-muted-foreground text-xs font-medium">—</span>}
                      </p>
                    </div>
                  </div>
                )}

                {/* Niche/Goal chips (view mode) */}
                {!isEditing && (acc.contentNiche || acc.contentGoal) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {acc.contentNiche && (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-1 rounded-full border border-emerald-100">
                        🎯 {acc.contentNiche}
                      </span>
                    )}
                    {acc.contentGoal && (
                      <span className="bg-sky-50 text-sky-700 text-[10px] font-semibold px-2 py-1 rounded-full border border-sky-100">
                        📈 {acc.contentGoal}
                      </span>
                    )}
                  </div>
                )}

                {/* Optional stats prompt — doesn't block strategy */}
                {!isEditing && !hasStats && !acc.followerCount && (
                  <button
                    onClick={() => startEdit(acc.platform)}
                    className="w-full text-xs text-muted-foreground border border-dashed border-border rounded-xl px-3 py-2 hover:bg-muted/30 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <BarChart2 className="w-3 h-3" /> Add follower count &amp; post stats to sharpen Zion's strategy
                  </button>
                )}

                {/* Edit form */}
                {isEditing && (
                  <div className="space-y-3 mt-2 pt-3 border-t border-border">
                    {/* Basic */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Handle</p>
                        <Input value={editValues.handle} onChange={(e) => setEditValues({ ...editValues, handle: e.target.value })} placeholder={platform.placeholder} className="h-8 text-xs" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Followers</p>
                        <Input type="number" value={editValues.followerCount} onChange={(e) => setEditValues({ ...editValues, followerCount: e.target.value })} placeholder="e.g. 5200" className="h-8 text-xs" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Profile URL (auto-built from handle if blank)</p>
                      <Input value={editValues.profileUrl} onChange={(e) => setEditValues({ ...editValues, profileUrl: e.target.value })} placeholder="https://..." className="h-8 text-xs" />
                    </div>

                    {/* Last post stats */}
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Last Post Performance</p>
                      <div className="grid grid-cols-3 gap-2">
                        <Input type="number" value={editValues.lastPostLikes} onChange={(e) => setEditValues({ ...editValues, lastPostLikes: e.target.value })} placeholder="Likes" className="h-8 text-xs" />
                        <Input type="number" value={editValues.lastPostComments} onChange={(e) => setEditValues({ ...editValues, lastPostComments: e.target.value })} placeholder="Comments" className="h-8 text-xs" />
                        <Input type="number" value={editValues.lastPostReach} onChange={(e) => setEditValues({ ...editValues, lastPostReach: e.target.value })} placeholder="Reach" className="h-8 text-xs" />
                      </div>
                    </div>

                    {/* Averages + engagement */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Avg Likes</p>
                        <Input type="number" value={editValues.avgLikes} onChange={(e) => setEditValues({ ...editValues, avgLikes: e.target.value })} placeholder="e.g. 120" className="h-8 text-xs" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Eng. Rate %</p>
                        <Input type="number" step="0.1" value={editValues.engagementRate} onChange={(e) => setEditValues({ ...editValues, engagementRate: e.target.value })} placeholder="e.g. 3.5" className="h-8 text-xs" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Last Post Date</p>
                        <Input type="date" value={editValues.lastPostDate} onChange={(e) => setEditValues({ ...editValues, lastPostDate: e.target.value })} className="h-8 text-xs" />
                      </div>
                    </div>

                    {/* Niche & goal */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Content Niche</p>
                        <Input value={editValues.contentNiche} onChange={(e) => setEditValues({ ...editValues, contentNiche: e.target.value })} placeholder="e.g. Wellness, Business" className="h-8 text-xs" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Content Goal</p>
                        <Input value={editValues.contentGoal} onChange={(e) => setEditValues({ ...editValues, contentGoal: e.target.value })} placeholder="e.g. Grow to 10k, Sell course" className="h-8 text-xs" />
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-8 text-xs px-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => saveAccount(acc.platform)} disabled={upsertMutation.isPending}>
                        {upsertMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs px-3" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Zion Strategy ──────────────────────────────────────────────────────── */}
      {connectedAccounts.length > 0 && (
        <div className="planner-card !p-4 border-violet-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">Zion's Content Strategy</p>
                <p className="text-xs text-muted-foreground">AI analysis based on your social data</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleGetStrategy}
              disabled={strategyLoading}
              className="h-8 text-xs bg-gradient-to-r from-violet-500 to-indigo-600 hover:opacity-90 text-white border-0"
            >
              {strategyLoading ? <><Loader2 className="w-3 h-3 animate-spin mr-1.5" />Analysing…</> : <><TrendingUp className="w-3 h-3 mr-1.5" />Get Strategy</>}
            </Button>
          </div>

          {showStrategy && (
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-xl px-4 py-4">
              {strategyLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Zion is reviewing your social data…
                </div>
              ) : strategy ? (
                <p className="text-sm text-[#2d2520] leading-relaxed whitespace-pre-wrap">{strategy}</p>
              ) : null}
            </div>
          )}

          {!showStrategy && (
            <p className="text-xs text-muted-foreground bg-[#faf8f5] rounded-xl px-3 py-2.5">
              Hit <strong>"Get Strategy"</strong> and Zion will give you a personalised content plan — what to post, when to post, and how to grow. Add your stats above to make the advice even sharper.
            </p>
          )}
        </div>
      )}

      {/* ── Connect new accounts ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">
              {connectedAccounts.length === 0 ? "Connect a Social Account" : `Connect Another Account`}
            </span>
            {unconnectedPlatforms.length > 0 && (
              <span className="bg-muted text-muted-foreground text-[10px] font-semibold rounded-full px-2 py-0.5">
                {unconnectedPlatforms.length} available
              </span>
            )}
          </div>
          {showAll ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showAll && (
          <div className="border-t border-border divide-y divide-border/50">
            {unconnectedPlatforms.map((platform) => {
              const isEditing = editing === platform.id;
              return (
                <div key={platform.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: platform.color }} />
                      <span className="text-sm font-medium">{platform.label}</span>
                    </div>
                    {!isEditing && (
                      <Button variant="outline" size="sm" className="h-7 text-xs px-3" onClick={() => startEdit(platform.id)}>
                        <Link2 className="w-3 h-3 mr-1" /> Connect
                      </Button>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={editValues.handle} onChange={(e) => setEditValues({ ...editValues, handle: e.target.value })} placeholder={platform.placeholder} className="h-8 text-xs" />
                        <Input type="number" value={editValues.followerCount} onChange={(e) => setEditValues({ ...editValues, followerCount: e.target.value })} placeholder="Follower count" className="h-8 text-xs" />
                      </div>
                      <Input value={editValues.profileUrl} onChange={(e) => setEditValues({ ...editValues, profileUrl: e.target.value })} placeholder="Profile URL (auto-built from handle if blank)" className="h-8 text-xs" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={editValues.contentNiche} onChange={(e) => setEditValues({ ...editValues, contentNiche: e.target.value })} placeholder="Niche (e.g. Wellness)" className="h-8 text-xs" />
                        <Input value={editValues.contentGoal} onChange={(e) => setEditValues({ ...editValues, contentGoal: e.target.value })} placeholder="Goal (e.g. 10k followers)" className="h-8 text-xs" />
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-8 text-xs px-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => saveAccount(platform.id)} disabled={upsertMutation.isPending}>
                          {upsertMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Connect"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs px-3" onClick={() => setEditing(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
