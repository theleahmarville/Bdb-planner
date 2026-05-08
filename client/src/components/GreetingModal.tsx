import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sparkles, X } from "lucide-react";

const TIME_GRADIENTS: Record<string, string> = {
  morning: "from-amber-400 to-orange-400",
  afternoon: "from-orange-400 to-rose-400",
  evening: "from-rose-400 to-violet-500",
  night: "from-violet-500 to-indigo-600",
};

const TIME_EMOJIS: Record<string, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌆",
  night: "🌙",
};

export default function GreetingModal() {
  const { isAuthenticated, user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only show once per session (not once per day, so every login gets a greeting)
  const sessionKey = `greeting-shown-${user?.id}-${new Date().toISOString().slice(0, 10)}`;

  const { data, isLoading } = trpc.zion.dailyGreeting.useQuery(undefined, {
    enabled: isAuthenticated && !dismissed,
    staleTime: Infinity, // don't refetch during session
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    if (sessionStorage.getItem(sessionKey)) return; // already shown today
    if (data && !dismissed) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [data, isAuthenticated, dismissed, sessionKey]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    sessionStorage.setItem(sessionKey, "1");
  };

  if (!visible || !data || isLoading) return null;

  const gradient = TIME_GRADIENTS[data.timeOfDay] ?? TIME_GRADIENTS.morning;
  const emoji = TIME_EMOJIS[data.timeOfDay] ?? "✨";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md animate-in slide-in-from-bottom-4 fade-in duration-500"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Card */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
            {/* Gradient header */}
            <div className={`bg-gradient-to-br ${gradient} p-8 text-white text-center relative`}>
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X size={16} />
              </button>
              <div className="text-5xl mb-3">{emoji}</div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles size={12} />
                </div>
                <span className="text-white/80 text-xs font-semibold uppercase tracking-widest">Zion · Be Do Become</span>
              </div>
            </div>

            {/* Message */}
            <div className="px-8 py-7 text-center">
              <p className="text-[#1a1a1a] text-lg leading-relaxed font-medium">
                {data.message}
              </p>
            </div>

            {/* CTA */}
            <div className="px-8 pb-7">
              <button
                onClick={handleDismiss}
                className={`w-full h-13 py-3.5 rounded-2xl bg-gradient-to-r ${gradient} text-white font-bold text-base shadow-md hover:shadow-lg transition-all active:scale-[0.98]`}
              >
                Let's go, {data.firstName}! →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
