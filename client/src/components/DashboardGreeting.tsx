import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { Sun, Sunset, Moon, Sparkles } from "lucide-react";

function getTimeOfDay(): { greeting: string; icon: React.ReactNode; color: string } {
  // Use the browser's local time — this is always correct on the client
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
  const [timeData, setTimeData] = useState(() => getTimeOfDay());

  // Recalculate every minute so the greeting stays accurate if the page is left open
  useEffect(() => {
    const interval = setInterval(() => setTimeData(getTimeOfDay()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const { greeting, icon, color } = timeData;

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
