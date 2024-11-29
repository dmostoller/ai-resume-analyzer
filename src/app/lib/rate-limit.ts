// app/lib/rate-limit.ts
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '24h') // 1 request per 24h
});
