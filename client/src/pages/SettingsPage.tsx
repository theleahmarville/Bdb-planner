import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Eye, EyeOff, User, Lock, LogOut, Camera, Globe, Clock, Loader2, X, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Toronto", "America/Vancouver",
  "America/Barbados", "America/Trinidad", "America/Jamaica",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Rome",
  "Africa/Lagos", "Africa/Johannesburg", "Africa/Nairobi", "Africa/Accra",
  "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Singapore",
  "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland",
];

function PushNotificationToggle() {
  const { status, subscribe, unsubscribe } = usePushNotifications();

  if (status === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground bg-[#faf8f5] rounded-xl px-4 py-3">
        Push notifications are not supported in this browser.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
        <p className="text-sm font-semibold text-orange-700">Notifications blocked</p>
        <p className="text-xs text-orange-600 mt-0.5">
          Enable notifications for this site in your browser settings, then reload the page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-[#faf8f5] rounded-xl px-4 py-3">
      <div>
        <p className="text-sm font-semibold">
          {status === "subscribed" ? "✅ Notifications enabled" : "Notifications off"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {status === "subscribed"
            ? "You'll receive reminders & check-in alerts on this device"
            : "Enable to get reminders & check-in alerts on this device"}
        </p>
      </div>
      <button
        onClick={status === "subscribed" ? unsubscribe : subscribe}
        disabled={status === "loading"}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50",
          status === "subscribed" ? "bg-emerald-500" : "bg-gray-200"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200",
            status === "subscribed" ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user, refresh, logout } = useAuth();
  const anyUser = user as any;

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const [avatarPreview, setAvatarPreview] = useState<string | null>(anyUser?.avatarUrl || null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(anyUser?.avatarUrl || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }

    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setAvatarUrl(data.url);

      // Save immediately to profile
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatarUrl: data.url }),
      });
      await refresh();
      toast.success("Profile photo updated!");
    } catch {
      toast.error("Upload failed — please try again");
      setAvatarPreview(anyUser?.avatarUrl || null);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    setAvatarPreview(null);
    setAvatarUrl(null);
    try {
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatarUrl: null }),
      });
      await refresh();
      toast.success("Profile photo removed");
    } catch {
      toast.error("Could not remove photo — please try again");
    }
  };

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

  // ── Bio & Timezone ─────────────────────────────────────────────────────────
  const [bio, setBio] = useState(anyUser?.bio || "");
  const [timezone, setTimezone] = useState(
    anyUser?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [savingBio, setSavingBio] = useState(false);

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bio: bio.trim(), timezone }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to save"); return; }
      await refresh();
      toast.success("Profile updated!");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSavingBio(false);
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

  const initials = (user?.name || "?").charAt(0).toUpperCase();

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

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full border-4 border-emerald-200 overflow-hidden cursor-pointer hover:border-emerald-400 transition-all bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-emerald-600">{initials}</span>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md hover:bg-emerald-700 transition-colors"
              type="button"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            {avatarPreview && (
              <button
                onClick={removeAvatar}
                className="absolute top-0 right-0 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                type="button"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {avatarPreview ? "Looking great! 👍" : "Click to add a profile photo"}
          </p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="space-y-4">
          {/* Display Name */}
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

          {/* Email (read-only) */}
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

      {/* ── Bio & Timezone card ───────────────────────────────────────────────── */}
      <div className="planner-card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shrink-0">
            <Globe size={16} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base">About You</h2>
            <p className="text-xs text-muted-foreground">Bio and timezone preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Bio */}
          <div className="space-y-2">
            <Label className="font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" /> Short Bio
            </Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 280))}
              placeholder="What do you do? What drives you? What are you building? (optional)"
              className="resize-none border-[#e8e0d5] focus:border-emerald-400 bg-white"
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/280</p>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label className="font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" /> Your Timezone
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#e8e0d5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 appearance-none"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">Used for reminders and daily greetings at the right time.</p>
          </div>

          <Button
            onClick={handleSaveBio}
            disabled={savingBio}
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {savingBio ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* ── Push Notifications ────────────────────────────────────────────────── */}
      <div className="planner-card mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Bell size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base">Push Notifications</h3>
            <p className="text-xs text-muted-foreground">Get reminded on your phone even when the app is closed</p>
          </div>
        </div>

        <PushNotificationToggle />
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
