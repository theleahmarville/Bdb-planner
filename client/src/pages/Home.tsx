import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { CalendarDays, Star, Target, Zap, CheckSquare, TrendingUp } from "lucide-react";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-foreground" />
        <div className="relative px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-background/20 text-background/70 text-sm mb-8">
            <Star size={14} />
            <span>2026 Digital Wellness Planner</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-background tracking-tight mb-6">
            BDB Digital<br />Wellness Planner
          </h1>
          <p className="text-background/70 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            A visionary's toolkit for planning your best year. Click-to-edit, auto-save, Google Calendar sync, and Notion integration — all in one place.
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg" variant="secondary" className="text-base px-8 py-6 font-bold rounded-xl">
              Start Planning 2026 →
            </Button>
          </a>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12">Everything you need to thrive</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: <Star size={24} />,
              title: "Annual Planning",
              desc: "Vision board, big goals with steps, life categories, personal contract, and transformation timeline.",
            },
            {
              icon: <CalendarDays size={24} />,
              title: "Monthly View",
              desc: "Calendar grid, budget tracker, social media management, content map, and monthly goals.",
            },
            {
              icon: <Target size={24} />,
              title: "Weekly Schedule",
              desc: "30-minute time slots from 6am–7pm, top priorities, gratitude journal, and water intake tracker.",
            },
            {
              icon: <Zap size={24} />,
              title: "Google Calendar Sync",
              desc: "Add any time slot event to Google Calendar with one click — no API keys required.",
            },
            {
              icon: <CheckSquare size={24} />,
              title: "Habit Tracker",
              desc: "Track vitamins, exercise, meditation, and custom habits with visual weekly progress bars.",
            },
            {
              icon: <TrendingUp size={24} />,
              title: "Financial Tracking",
              desc: "Weekly money earned/spent, monthly budget categories, and annual financial planning.",
            },
          ].map((feature, idx) => (
            <div key={idx} className="planner-card hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-foreground text-background px-6 py-16 text-center">
        <h2 className="text-3xl font-black mb-4">Ready to plan your best year?</h2>
        <p className="text-background/70 mb-8 max-w-md mx-auto">Sign in to start planning. Your data is saved securely and synced across all your devices.</p>
        <a href={getLoginUrl()}>
          <Button size="lg" variant="secondary" className="text-base px-8 py-6 font-bold rounded-xl">
            Get Started Free →
          </Button>
        </a>
      </div>

      {/* Footer */}
      <div className="px-6 py-6 text-center bg-background border-t border-border">
        <p className="text-sm text-muted-foreground">
          BDB Digital Wellness Planner · <span className="font-semibold text-foreground">by Leah Marville</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">© {new Date().getFullYear()} Be Do Become Wellness · All rights reserved</p>
      </div>
    </div>
  );
}
