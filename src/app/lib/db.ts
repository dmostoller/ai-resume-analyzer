// app/lib/db.ts
import { Redis } from '@upstash/redis';
import { SUBSCRIPTION_LIMITS } from '@/app/types/subscription';
import { Subscription, UserPlan, PlanTier } from '@/app/types/stripe';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export async function setUserPlan(userId: string, tier: PlanTier) {
  try {
    const limit = SUBSCRIPTION_LIMITS[tier];
    const plan: UserPlan = {
      tier,
      limit,
      lastUpdated: new Date().toISOString()
    };
    await redis.hset(`user:${userId}:plan`, plan);
  } catch (error) {
    console.error('Redis set plan error:', error);
    throw error;
  }
}

export async function setUserSubscription(userId: string, subscription: Subscription) {
  try {
    await redis.hset(`user:${userId}:subscription`, subscription);
    // Set plan based on price ID
    const planMapping: Record<string, PlanTier> = {
      price_pro: 'pro',
      price_premium: 'premium'
    };
    const tier = planMapping[subscription.priceId] || 'free';
    await setUserPlan(userId, tier);
  } catch (error) {
    console.error('Redis set subscription error:', error);
    throw error;
  }
}

// Update get subscription to include plan and limit
export async function getUserSubscription(
  userIdentifier: string
): Promise<{ subscription?: Subscription; plan?: UserPlan; usage: number; limit?: number }> {
  try {
    const [subscription, plan, usage] = await Promise.all([
      redis.hgetall<Subscription>(`user:${userIdentifier}:subscription`),
      redis.hgetall<UserPlan>(`user:${userIdentifier}:plan`),
      redis.get<number>(`usage:${userIdentifier}`)
    ]);

    let limit: number | undefined = undefined;
    if (plan?.tier) {
      limit = SUBSCRIPTION_LIMITS[plan.tier];
    }

    return {
      subscription: subscription || undefined,
      plan: plan || undefined,
      usage: usage || 0,
      limit
    };
  } catch (error) {
    console.error('Redis get error:', error);
    return { usage: 0 };
  }
}

export async function incrementUserUsage(
  userIdentifier: string
): Promise<{ success: boolean; usage?: number; error?: string }> {
  try {
    const { subscription } = await getUserSubscription(userIdentifier);

    if (subscription) {
      const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
      const now = new Date();

      if (now > currentPeriodEnd) {
        await resetMonthlyUsage(userIdentifier);
      }
    }

    const usageKey = `usage:${userIdentifier}`;
    const newUsage = await redis.incr(usageKey);

    if (subscription) {
      await redis.hset(`user:${userIdentifier}:subscription`, {
        ...subscription,
        usage: newUsage
      });
    }

    return { success: true, usage: newUsage };
  } catch (error) {
    console.error('Redis increment error:', error);
    return { success: false, error: 'Failed to increment usage' };
  }
}

export async function resetMonthlyUsage(
  userIdentifier: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await redis.set(`usage:${userIdentifier}`, 0);

    const { subscription } = await getUserSubscription(userIdentifier);
    if (subscription) {
      await redis.hset(`user:${userIdentifier}:subscription`, {
        ...subscription,
        usage: 0
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Redis reset error:', error);
    return { success: false, error: 'Failed to reset usage' };
  }
}
