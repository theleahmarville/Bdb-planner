import Stripe from "stripe";

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    priceId: null as string | null,
    features: [
      "Annual, monthly & weekly planning",
      "Daily journaling & habit tracking",
      "10 Zion AI messages per day",
      "Basic notes & vision board",
    ],
    limits: { zionMessages: 10 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 9.99,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
    features: [
      "Everything in Free",
      "Unlimited Zion AI messages",
      "Chief of Staff daily briefings",
      "Gmail + Google Calendar integration",
      "Slack, Notion & Box integrations",
      "Daily briefing to your inbox",
      "Priority email support",
    ],
    limits: { zionMessages: Infinity },
  },
  elite: {
    id: "elite",
    name: "Elite",
    price: 19.99,
    priceId: process.env.STRIPE_ELITE_PRICE_ID ?? null,
    features: [
      "Everything in Pro",
      "Custom Zion AI personality",
      "Advanced analytics & insights",
      "Early access to new features",
      "1-on-1 onboarding call",
    ],
    limits: { zionMessages: Infinity },
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
}

export async function getOrCreateStripeCustomer(
  stripe: Stripe,
  userId: number,
  email: string,
  name?: string | null,
): Promise<string> {
  const { getUserById, upsertUser } = await import("../db");
  const user = await getUserById(userId);
  if ((user as any)?.stripeCustomerId) return (user as any).stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId: String(userId) },
  });

  await upsertUser({ openId: (user as any)!.openId, stripeCustomerId: customer.id } as any);
  return customer.id;
}
