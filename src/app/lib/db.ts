// app/lib/db.ts
import { Redis } from '@upstash/redis';
import { SUBSCRIPTION_LIMITS } from '@/app/types/subscription';
import { Subscription, UserPlan, PlanTier } from '@/app/types/stripe';

interface ScanResult {
  id: string;
  overallScore: number;
  createdAt: string;
}

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

function shouldResetUsage(lastReset: string): boolean {
  const lastResetDate = new Date(lastReset);
  const now = new Date();

  // Reset if different month or year
  return lastResetDate.getMonth() !== now.getMonth() || lastResetDate.getFullYear() !== now.getFullYear();
}

export async function initializeUserSubscription(email: string) {
  const key = `subscription:${email}`;
  const exists = await redis.exists(key);
  const now = new Date();

  // Calculate period end (end of current month from signup)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  if (!exists) {
    // Create a full subscription record for free tier
    const freeSubscription: Subscription = {
      id: `free_${email}`,
      userId: email,
      status: 'active',
      tier: 'free',
      priceId: 'price_free',
      quantity: 1,
      cancelAtPeriodEnd: false,
      created: now.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      usage: 0,
      limit: SUBSCRIPTION_LIMITS.free
    };

    await Promise.all([
      // Store subscription data
      redis.hset(key, freeSubscription),
      // Store free plan data
      redis.hset(`user:${email}:plan`, {
        tier: 'free',
        limit: SUBSCRIPTION_LIMITS.free,
        lastUpdated: now.toISOString()
      }),
      // Initialize usage counter
      redis.set(`usage:${email}`, 0)
    ]);
  } else {
    // Check if we need to reset existing free tier user
    const sub = await redis.hgetall<Subscription>(key);
    if (sub && new Date(sub.currentPeriodEnd) < now) {
      // Period has ended, reset for new month
      const newPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      await Promise.all([
        redis.hset(key, {
          ...sub,
          usage: 0,
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: newPeriodEnd.toISOString()
        }),
        redis.set(`usage:${email}`, 0)
      ]);
    }
  }
}

export async function checkAndResetUsage(email: string) {
  const key = `subscription:${email}`;
  const sub = await redis.hgetall(key);

  if (sub && typeof sub.lastReset === 'string' && shouldResetUsage(sub.lastReset)) {
    const now = new Date().toISOString();
    await redis.hset(key, {
      usage: 0,
      lastReset: now
    });
    return true;
  }
  return false;
}

// Update get subscription to include plan and limit
export async function getUserSubscription(
  userIdentifier: string
): Promise<{ subscription?: Subscription; plan?: UserPlan; usage: number; limit?: number }> {
  try {
    const [subscription, plan, usage] = await Promise.all([
      redis.hgetall<Subscription>(`subscription:${userIdentifier}`),
      redis.hgetall<UserPlan>(`user:${userIdentifier}:plan`),
      redis.get<number>(`usage:${userIdentifier}`)
    ]);

    // Check if free tier period needs reset
    if (subscription?.tier === 'free' && new Date(subscription.currentPeriodEnd) < new Date()) {
      await initializeUserSubscription(userIdentifier);
      return getUserSubscription(userIdentifier);
    }

    let limit = subscription?.limit || SUBSCRIPTION_LIMITS.free;

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

export async function saveUserScan(userId: string, scanData: { overallScore: number }) {
  try {
    const scan: ScanResult = {
      id: crypto.randomUUID(),
      overallScore: scanData.overallScore,
      createdAt: new Date().toISOString()
    };

    const key = `user:${userId}:scans`;
    await redis.lpush(key, JSON.stringify(scan));
    await redis.ltrim(key, 0, 9); // Keep last 10 scans
    await redis.expire(key, 60 * 60 * 24 * 30); // 30 days expiration

    return scan;
  } catch (error) {
    console.error('Redis save scan error:', error);
    throw error;
  }
}

export async function getLatestUserScan(userId: string): Promise<ScanResult | null> {
  try {
    const key = `user:${userId}:scans`;
    const latestScan = await redis.lindex(key, 0);

    if (!latestScan) return null;

    return JSON.parse(latestScan);
  } catch (error) {
    console.error('Redis get latest scan error:', error);
    throw error;
  }
}

export async function getUserScans(email: string) {
  try {
    const key = `scans:${email}`;
    const scans = await redis.lrange(key, 0, 9);

    return scans
      .map((scan) => {
        try {
          // Check if scan is already an object
          if (typeof scan === 'object') {
            return scan;
          }
          return JSON.parse(scan);
        } catch (err) {
          console.error('Failed to parse scan:', err);
          return null;
        }
      })
      .filter(Boolean); // Remove null entries
  } catch (error) {
    console.error('Redis get scans error:', error);
    throw error;
  }
}
