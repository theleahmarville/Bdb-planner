/**
 * OnboardingPage — shown once after registration.
 * 3-step wizard: profile photo & name → about you → ready!
 */
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sparkles, Camera, User, CheckCircle2,
  ChevronRight, Globe, Clock, Loader2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Profile", "About You", "Ready!"] as const;

// Common timezones list
const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Toronto", "America/Vancouver",
  "America/Barbados", "America/Trinidad", "America/Jamaica",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Rome",
  "Africa/Lagos", "Africa/Johannesburg", "Africa/Nairobi", "Africa/Accra",
  "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Singapore",
  "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland",
];

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all",
            i < current ? "bg-emerald-600 text-white" :
            i === current ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400" :
            "bg-gray-100 text-gray-400"
          )}>
            {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("h-0.5 w-8 rounded-full transition-all", i < current ? "bg-emerald-400" : "bg-gray-200")} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { user, refresh } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0 — Profile
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>((user as any)?.avatarUrl || null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>((user as any)?.avatarUrl || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1 — About You
  const [bio, setBio] = useState((user as any)?.bio || "");
  const [timezone, setTimezone] = useState(
    (user as any)?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );

  const firstName = name.split(" ")[0] || user?.name?.split(" ")[0] || "there";

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }

    // Show preview immediately
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
      toast.success("Photo uploaded!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(`Upload failed: ${msg}`);
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const saveProfile = useCallback(async (isComplete = false) => {
    setSaving(true);
    try {
      const body: Record<string, any> = {};
      if (name.trim()) body.name = name.trim();
      if (avatarUrl) body.avatarUrl = avatarUrl;
      if (bio.trim()) body.bio = bio.trim();
      if (timezone) body.timezone = timezone;
      if (isComplete) body.onboardingCompleted = true;

      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      await refresh();
    } catch {
      toast.error("Could not save — you can update this in Settings later");
    } finally {
      setSaving(false);
    }
  }, [name, avatarUrl, bio, timezone, refresh]);

  const nextStep = async () => {
    await saveProfile(false);
    setStep(s => s + 1);
  };

  const finish = async () => {
    await saveProfile(true);
    navigate("/annual"); // Start at Annual Planning — the heart of the app
  };

  const skip = () => navigate("/annual");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] to-emerald-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-lg leading-none">Be Do Become</p>
            <p className="text-xs text-[#8a7a6a]">Wellness by Leah Marville</p>
          </div>
          <button onClick={skip} className="ml-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
            Skip setup
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-8">
            <StepDots current={step} />

            {/* ── Step 0: Profile photo & name ──────────────────────────────── */}
            {step === 0 && (
              <div>
                <h1 className="text-2xl font-black text-[#1a1a1a] mb-1">
                  Welcome, {firstName}! 🌟
                </h1>
                <p className="text-[#8a7a6a] text-sm mb-7">
                  Let's set up your profile so the planner feels like yours.
                </p>

                {/* Avatar upload */}
                <div className="flex flex-col items-center mb-7">
                  <div className="relative group">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-full border-4 border-emerald-200 overflow-hidden cursor-pointer hover:border-emerald-400 transition-all bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center"
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-emerald-400" />
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
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    {avatarPreview && (
                      <button
                        onClick={() => { setAvatarPreview(null); setAvatarUrl(null); }}
                        className="absolute top-0 right-0 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {avatarPreview ? "Looking great! 👍" : "Tap to add a profile photo"}
                  </p>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label className="font-semibold text-[#1a1a1a]">Your Name</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    className="h-12 border-[#e8e0d5] focus:border-emerald-400 bg-white"
                    onKeyDown={e => e.key === "Enter" && nextStep()}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* ── Step 1: About You ──────────────────────────────────────────── */}
            {step === 1 && (
              <div>
                <h1 className="text-2xl font-black text-[#1a1a1a] mb-1">About you</h1>
                <p className="text-[#8a7a6a] text-sm mb-7">
                  Help Zion get to know you so every message feels personal.
                </p>

                {/* Bio */}
                <div className="space-y-2 mb-5">
                  <Label className="font-semibold text-[#1a1a1a] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" /> Short Bio
                  </Label>
                  <Textarea
                    value={bio}
                    onChange={e => setBio(e.target.value.slice(0, 280))}
                    placeholder="What do you do? What drives you? What are you building? (optional)"
                    className="resize-none border-[#e8e0d5] focus:border-emerald-400 bg-white"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground text-right">{bio.length}/280</p>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <Label className="font-semibold text-[#1a1a1a] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" /> Your Timezone
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <select
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      className="w-full h-12 pl-9 pr-4 rounded-xl border border-[#e8e0d5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 appearance-none"
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">Used for reminders and daily greetings at the right time.</p>
                </div>
              </div>
            )}

            {/* ── Step 2: Ready! ────────────────────────────────────────────── */}
            {step === 2 && (
              <div className="text-center">
                {/* Avatar display */}
                <div className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-emerald-200 overflow-hidden bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-emerald-600">
                      {name.charAt(0).toUpperCase() || "?"}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-black text-[#1a1a1a] mb-2">You're all set, {firstName}!</h1>
                <p className="text-[#8a7a6a] text-sm mb-8">Your planner is ready. Here's what's waiting for you:</p>

                <div className="space-y-3 text-left mb-8">
                  {[
                    { icon: "✨", title: "Annual Planning", desc: "Set your vision, big goals & personal contract for the year" },
                    { icon: "📅", title: "Weekly & Daily Views", desc: "Plan every week with habits, priorities & daily wins" },
                    { icon: "🤖", title: "Zion AI", desc: "Your personal coach — ask anything, save to your planner instantly" },
                    { icon: "🔔", title: "Smart Reminders", desc: "Never miss a moment that matters" },
                  ].map(item => (
                    <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <span className="text-xl leading-none mt-0.5">{item.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-[#1a1a1a]">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-8 pb-8 flex items-center gap-3">
            {step > 0 && step < 2 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            )}
            <div className="flex-1" />
            {step < 2 ? (
              <Button
                onClick={nextStep}
                disabled={saving}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold px-6 h-11 rounded-xl border-0 shadow-md flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={finish}
                disabled={saving}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold px-8 h-12 rounded-xl border-0 shadow-lg text-base flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Start Planning →
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          You can update all of this anytime in <span className="underline">Settings</span>.
        </p>
      </div>
    </div>
  );
}
