// app/types/stripe.ts

export interface Subscription {
  id: string;
  userId: string;
  status: string;
  priceId: string;
  tier: PlanTier;
  quantity: number;
  cancelAtPeriodEnd: boolean;
  created: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  endedAt?: string;
  cancelAt?: string;
  usage: number;
  limit: number;
  [key: string]: unknown;
}

export type PlanTier = 'free' | 'pro' | 'premium';

export interface UserPlan extends Record<string, unknown> {
  tier: PlanTier;
  lastUpdated: string;
}
