import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sparkles, Eye, EyeOff } from "lucide-react";

type Gender = "female" | "male" | "other";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("other");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const { refresh } = useAuth();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      try {
        const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
        const body: Record<string, string> = { email, password };
        if (mode === "register") {
          if (name) body.name = name;
          body.gender = gender;
        }
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong");
          return;
        }
        await refresh();
        navigate("/");
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [mode, email, password, name, gender, refresh, navigate]
  );

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setError("");
    setEmail("");
    setPassword("");
    setName("");
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a1a1a] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 80% 20%, #f97316 0%, transparent 50%)"
        }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-white text-[10px] font-black">BDB</span>
            </div>
            <div>
              <p className="text-white font-black text-lg leading-none">Be Do Become</p>
              <p className="text-white/40 text-xs">Wellness by Leah Marville</p>
            </div>
          </div>
          <div>
            <h2 className="text-5xl font-black text-white leading-[1.1] mb-6">
              Your vision.<br />Your plan.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Your year.</span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed max-w-sm">
              The digital planner built for visionaries who are ready to turn their dreams into daily actions.
            </p>
          </div>
        </div>
        <div className="relative z-10 space-y-4">
          {[
            { icon: "🎯", text: "Annual goal tracking with step-by-step breakdowns" },
            { icon: "🤖", text: "Zion AI — your personal wellness coach, powered by Claude" },
            { icon: "📅", text: "Weekly & daily planning with habit tracking" },
            { icon: "🔔", text: "Smart reminders that connect to your calendar" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <p className="text-white/60 text-sm">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-white text-[9px] font-black">BDB</span>
            </div>
            <span className="font-black text-xl">Be Do Become</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-[#1a1a1a] mb-2">
              {mode === "login" ? "Welcome back" : "Join the journey"}
            </h1>
            <p className="text-[#8a7a6a]">
              {mode === "login"
                ? "Sign in to continue your planning journey"
                : "Create your account and start building your best year"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#1a1a1a] font-semibold">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="h-12 border-[#e8e0d5] focus:border-amber-400 focus:ring-amber-200 bg-white"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1a1a1a] font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 border-[#e8e0d5] focus:border-amber-400 focus:ring-amber-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1a1a1a] font-semibold">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === "register" ? 8 : undefined}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-12 border-[#e8e0d5] focus:border-amber-400 focus:ring-amber-200 bg-white pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7a6a] hover:text-[#1a1a1a] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div className="space-y-2">
                <Label className="text-[#1a1a1a] font-semibold">I identify as</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["female", "male", "other"] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`h-11 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                        gender === g
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-[#e8e0d5] bg-white text-[#8a7a6a] hover:border-amber-200"
                      }`}
                    >
                      {g === "female" ? "👩 Woman" : g === "male" ? "👨 Man" : "🌟 Other"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-base rounded-xl border-0 shadow-md hover:shadow-lg transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === "register" ? "Creating account..." : "Signing in..."}
                </span>
              ) : mode === "login" ? "Sign In →" : "Create Account →"}
            </Button>
          </form>

          {/* Zion AI teaser */}
          {mode === "register" && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles size={14} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800">Meet Zion AI</p>
                <p className="text-xs text-amber-700 mt-0.5">Your personal wellness coach greets you every day with a message made just for you.</p>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-[#8a7a6a]">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button type="button" className="text-amber-600 font-semibold hover:text-amber-700" onClick={() => switchMode("register")}>
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" className="text-amber-600 font-semibold hover:text-amber-700" onClick={() => switchMode("login")}>
                  Sign in
                </button>
              </>
            )}
          </div>

          {import.meta.env.DEV && (
            <div className="mt-4 pt-4 border-t border-dashed border-[#e8e0d5]">
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed text-xs"
                onClick={async () => {
                  setLoading(true);
                  setError("");
                  try {
                    const res = await fetch("/api/auth/dev-login", { method: "POST", credentials: "include" });
                    if (res.ok) { await refresh(); navigate("/"); }
                    else setError("Dev login failed");
                  } catch { setError("Dev login failed"); }
                  finally { setLoading(false); }
                }}
                disabled={loading}
              >
                ⚡ Dev Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
