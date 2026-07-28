import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Check, Crown, Zap, Sparkles, CreditCard, Loader2 } from "lucide-react";
import { Link } from "wouter";

const PLAN_META = {
  free: { icon: <Sparkles className="w-5 h-5" />, color: "border-border", badge: "", cta: "Current plan" },
  pro: { icon: <Zap className="w-5 h-5 text-violet-600" />, color: "border-violet-500", badge: "Most popular", cta: "Upgrade to Pro" },
  elite: { icon: <Crown className="w-5 h-5 text-amber-500" />, color: "border-amber-400", badge: "Best value", cta: "Upgrade to Elite" },
};

export default function SubscriptionPage() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = trpc.subscription.status.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const checkoutMutation = trpc.subscription.createCheckout.useMutation();
  const portalMutation = trpc.subscription.createPortal.useMutation();

  const upgrade = async (planId: "pro" | "elite") => {
    setLoading(planId);
    try {
      const { url } = await checkoutMutation.mutateAsync({
        planId,
        successUrl: `${window.location.origin}/subscription?success=1`,
        cancelUrl: `${window.location.origin}/subscription`,
      });
      if (url) window.location.href = url;
      else toast.error("Could not start checkout.");
    } catch (e: any) {
      toast.error(e?.message ?? "Checkout failed.");
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async () => {
    setLoading("portal");
    try {
      const { url } = await portalMutation.mutateAsync({
        returnUrl: `${window.location.origin}/subscription`,
      });
      if (url) window.location.href = url;
      else toast.error("Could not open billing portal.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open portal.");
    } finally {
      setLoading(null);
    }
  };

  const currentPlan = (status as any)?.plan ?? "free";
  const isSubscribed = currentPlan !== "free";

  const plans = [
    {
      id: "free" as const,
      name: "Free",
      price: 0,
      features: [
        "Annual, monthly & weekly planning",
        "Daily journaling & habit tracking",
        "10 Zion AI messages per day",
        "Basic notes & vision board",
      ],
    },
    {
      id: "pro" as const,
      name: "Pro",
      price: 9.99,
      features: [
        "Everything in Free",
        "Unlimited Zion AI messages",
        "Chief of Staff daily briefings",
        "Gmail + Google Calendar integration",
        "Slack, Notion & Box integrations",
        "Daily briefing to your inbox",
        "Priority email support",
      ],
    },
    {
      id: "elite" as const,
      name: "Elite",
      price: 19.99,
      features: [
        "Everything in Pro",
        "Custom Zion AI personality",
        "Advanced analytics & insights",
        "Early access to new features",
        "1-on-1 onboarding call",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Choose your plan</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Upgrade to unlock AI-powered briefings, integrations, and unlimited Zion access.
          </p>
          {isSubscribed && (
            <button
              onClick={openPortal}
              disabled={loading === "portal"}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              {loading === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Manage billing
            </button>
          )}
        </div>

        {statusLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const meta = PLAN_META[plan.id];
              const isCurrent = currentPlan === plan.id;
              const isPro = plan.id === "pro";
              const isElite = plan.id === "elite";

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 p-6 flex flex-col ${meta.color} ${isPro ? "shadow-lg shadow-violet-100" : ""}`}
                >
                  {meta.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-semibold text-white ${isPro ? "bg-violet-600" : "bg-amber-500"}`}>
                      {meta.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isPro ? "bg-violet-100" : isElite ? "bg-amber-50" : "bg-muted"}`}>
                      {meta.icon}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{plan.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {plan.price === 0 ? "Free forever" : `$${plan.price.toFixed(2)}/month`}
                      </p>
                    </div>
                  </div>

                  <ul className="flex-1 space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-foreground/80">
                        <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isPro ? "text-violet-600" : isElite ? "text-amber-500" : "text-emerald-500"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="w-full py-2 rounded-xl text-center text-xs font-medium bg-muted text-muted-foreground">
                      Current plan
                    </div>
                  ) : plan.id === "free" ? (
                    <div className="w-full py-2 rounded-xl text-center text-xs font-medium bg-muted text-muted-foreground">
                      Included
                    </div>
                  ) : (
                    <button
                      onClick={() => upgrade(plan.id)}
                      disabled={!!loading}
                      className={`w-full py-2 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${isPro ? "bg-violet-600 hover:bg-violet-700" : "bg-amber-500 hover:bg-amber-600"}`}
                    >
                      {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {loading === plan.id ? "Loading…" : meta.cta}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground mt-8">
          Cancel anytime · Secure checkout powered by Stripe ·{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
