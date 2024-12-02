// app/lib/rate-limit.ts
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { stripe } from './stripe-admin';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export async function checkUserLimit(email: string | null) {
  if (!email) return false;

  const customers = await stripe.customers.list({ email, limit: 1 });
  if (!customers.data.length) return false;

  const subscriptions = await stripe.subscriptions.list({
    customer: customers.data[0].id,
    status: 'active'
  });

  if (!subscriptions.data.length) {
    // Free tier
    return rateLimit.limit(email);
  }

  // Check usage for paid tier
  const usage = await stripe.subscriptionItems.createUsageRecord(subscriptions.data[0].items.data[0].id, {
    quantity: 1
  });

  return usage.quantity <= 25; // 25 scans per month limit
}

export const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '24h')
});
