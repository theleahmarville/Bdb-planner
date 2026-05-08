import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo } from "react";
import { Sun, Sunset, Moon, Sparkles } from "lucide-react";

function getTimeOfDay(): { greeting: string; icon: React.ReactNode; color: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      greeting: "Good morning",
      icon: <Sun className="w-4 h-4" />,
      color: "text-emerald-600",
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: "Good afternoon",
      icon: <Sparkles className="w-4 h-4" />,
      color: "text-emerald-600",
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      greeting: "Good evening",
      icon: <Sunset className="w-4 h-4" />,
      color: "text-rose-500",
    };
  } else {
    return {
      greeting: "Good night",
      icon: <Moon className="w-4 h-4" />,
      color: "text-indigo-400",
    };
  }
}

export default function DashboardGreeting() {
  const { user } = useAuth();
  const { greeting, icon, color } = useMemo(() => getTimeOfDay(), []);

  if (!user) return null;

  const firstName = user.name?.split(" ")[0] || user.name || "";

  return (
    <div className={`flex items-center gap-1.5 text-sm font-semibold ${color}`}>
      {icon}
      <span>
        {greeting}{firstName ? `, ${firstName}` : ""}
      </span>
    </div>
  );
}
