// app/lib/subscription.ts
import Stripe from 'stripe';
import { stripe } from './stripe-admin';
import { Subscription } from '@/app/types/stripe';
import { setUserSubscription, setUserPlan } from './db';

const PRICE_ID_PRO = process.env.STRIPE_PRICE_ID_PRO!;
const PRICE_ID_PREMIUM = process.env.STRIPE_PRICE_ID_PREMIUM!;

const PRICE_TO_PLAN = {
  [PRICE_ID_PRO]: 'pro',
  [PRICE_ID_PREMIUM]: 'premium'
} as const;

async function setPlanFromPriceId(userId: string, priceId: string) {
  const plan = PRICE_TO_PLAN[priceId as keyof typeof PRICE_TO_PLAN] || 'free';
  await setUserPlan(userId, plan);
}

export async function updateUserSubscription(session: Stripe.Checkout.Session) {
  if (!session.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const userId = session.client_reference_id!;
  const priceId = subscription.items.data[0].price.id;

  await setUserSubscription(userId, {
    id: subscription.id,
    userId: userId,
    status: subscription.status,
    priceId: subscription.items.data[0].price.id,
    quantity: subscription.items.data[0].quantity ?? 0,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    created: new Date(subscription.created * 1000).toISOString(),
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : undefined,
    cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : undefined
  } as Subscription);

  await setPlanFromPriceId(userId, priceId);
}

export async function updateSubscriptionStatus(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    return;
  }

  const userId = customer.metadata?.userId || customerId;
  const priceId = subscription.items.data[0].price.id;

  await setUserSubscription(userId, {
    id: subscription.id,
    userId: userId,
    status: subscription.status,
    priceId: subscription.items.data[0].price.id,
    quantity: subscription.items.data[0].quantity ?? 0,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    created: new Date(subscription.created * 1000).toISOString(),
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : undefined,
    cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : undefined
  } as Subscription);
  await setPlanFromPriceId(userId, priceId);
}
