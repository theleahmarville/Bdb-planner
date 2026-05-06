import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ExternalLink, Link2, X, CheckCircle2, ChevronDown, ChevronUp, Users } from "lucide-react";

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
}

export default function SocialAccountsPanel() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditingState>({
    handle: "",
    profileUrl: "",
    displayName: "",
    followerCount: "",
  });

  const { data: accounts = [], refetch } = trpc.socialAccounts.list.useQuery(undefined, { enabled: open });

  const upsertMutation = trpc.socialAccounts.upsert.useMutation({
    onSuccess: () => { refetch(); setEditing(null); toast.success("Account linked"); },
  });

  const disconnectMutation = trpc.socialAccounts.disconnect.useMutation({
    onSuccess: () => { refetch(); toast.success("Account disconnected"); },
  });

  const getAccount = (platformId: string) => accounts.find((a) => a.platform === platformId);

  const startEdit = (platformId: string) => {
    const acc = getAccount(platformId);
    setEditing(platformId);
    setEditValues({
      handle: acc?.handle ?? "",
      profileUrl: acc?.profileUrl ?? "",
      displayName: acc?.displayName ?? "",
      followerCount: acc?.followerCount?.toString() ?? "",
    });
  };

  const saveAccount = async (platformId: string) => {
    const platform = PLATFORMS.find((p) => p.id === platformId)!;
    let profileUrl = editValues.profileUrl.trim();
    // Auto-build URL from handle if no URL given
    if (!profileUrl && editValues.handle) {
      const handle = editValues.handle.replace(/^@/, "");
      profileUrl = `${platform.urlPrefix}${handle}`;
    }
    try {
      await upsertMutation.mutateAsync({
        platform: platformId,
        handle: editValues.handle || undefined,
        profileUrl: profileUrl || undefined,
        displayName: editValues.displayName || undefined,
        followerCount: editValues.followerCount ? parseInt(editValues.followerCount) : undefined,
        connected: true,
      });
    } catch {
      toast.error("Failed to save account. Please try again.");
    }
  };

  const connectedCount = accounts.filter((a) => a.connected).length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Social Media Accounts</span>
          {connectedCount > 0 && (
            <span className="bg-green-100 text-green-700 text-[10px] font-semibold rounded-full px-2 py-0.5">
              {connectedCount} connected
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border/50">
          {PLATFORMS.map((platform) => {
            const acc = getAccount(platform.id);
            const isEditing = editing === platform.id;

            return (
              <div key={platform.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: platform.color }}
                    />
                    <span className="text-sm font-medium">{platform.label}</span>
                    {acc?.connected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {acc?.profileUrl && (
                      <a
                        href={acc.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {acc?.connected && !isEditing && (
                      <button
                        onClick={() => disconnectMutation.mutate({ platform: platform.id })}
                        className="text-xs text-muted-foreground hover:text-red-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Disconnect"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => startEdit(platform.id)}
                      >
                        {acc?.connected ? "Edit" : <><Link2 className="w-3 h-3 mr-1" />Connect</>}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Connected summary */}
                {acc?.connected && !isEditing && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {acc.handle && <span>{acc.handle}</span>}
                    {acc.followerCount != null && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {acc.followerCount.toLocaleString()} followers
                      </span>
                    )}
                  </div>
                )}

                {/* Edit form */}
                {isEditing && (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={editValues.handle}
                        onChange={(e) => setEditValues({ ...editValues, handle: e.target.value })}
                        placeholder={platform.placeholder}
                        className="h-7 text-xs"
                      />
                      <Input
                        value={editValues.displayName}
                        onChange={(e) => setEditValues({ ...editValues, displayName: e.target.value })}
                        placeholder="Display name (optional)"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={editValues.profileUrl}
                        onChange={(e) => setEditValues({ ...editValues, profileUrl: e.target.value })}
                        placeholder="Profile URL (optional)"
                        className="h-7 text-xs"
                      />
                      <Input
                        type="number"
                        value={editValues.followerCount}
                        onChange={(e) => setEditValues({ ...editValues, followerCount: e.target.value })}
                        placeholder="Follower count"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-6 text-xs px-3" onClick={() => saveAccount(platform.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditing(null)}>
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
    </div>
  );
}
