import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, User, Lock, LogOut } from "lucide-react";

export default function SettingsPage() {
  const { user, refresh, logout } = useAuth();

  // ── Name form ──────────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    setSavingName(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to update name"); return; }
      await refresh();
      toast.success("Name updated!");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  // ── Password form ──────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("New passwords don't match"); return; }
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to change password"); return; }
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and security</p>
      </div>

      {/* ── Profile card ─────────────────────────────────────────────────────── */}
      <div className="planner-card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0">
            <User size={16} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base">Your Profile</h2>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold">Display Name</Label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="flex-1 h-10"
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              />
              <Button
                onClick={handleSaveName}
                disabled={savingName || name.trim() === (user?.name || "")}
                size="sm"
                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingName ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Email Address</Label>
            <Input
              value={user?.email || ""}
              disabled
              className="h-10 bg-muted/50 text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed at this time.</p>
          </div>
        </div>
      </div>

      {/* ── Password card ─────────────────────────────────────────────────────── */}
      <div className="planner-card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Lock size={16} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base">Change Password</h2>
            <p className="text-xs text-muted-foreground">Update your password anytime</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Your current password"
                className="h-10 pr-10"
                required
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-10 pr-10"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="h-10"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {savingPassword ? "Updating password…" : "Update Password"}
          </Button>
        </form>
      </div>

      {/* ── Danger zone ───────────────────────────────────────────────────────── */}
      <div className="planner-card border-red-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <LogOut size={16} className="text-red-600" />
          </div>
          <h2 className="font-bold text-base">Sign Out</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Sign out of your account on this device.</p>
        <Button
          variant="outline"
          onClick={logout}
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
