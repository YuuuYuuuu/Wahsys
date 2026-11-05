import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

type LimitResult = { success: boolean; remaining?: number };

const memoryBuckets = new Map<string, { count: number; reset: number }>();

function memoryLimit(key: string, max: number, windowMs: number): LimitResult {
  const now = Date.now();
  const b = memoryBuckets.get(key);
  if (!b || now > b.reset) {
    memoryBuckets.set(key, { count: 1, reset: now + windowMs });
    return { success: true, remaining: max - 1 };
  }
  if (b.count >= max) return { success: false, remaining: 0 };
  b.count += 1;
  return { success: true, remaining: max - b.count };
}

function upstashRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch (e) {
    logger.warn({ err: e }, "Upstash Redis init failed");
    return null;
  }
}

const redis = upstashRedis();

export function createRatelimiter(prefix: string, max: number, windowSeconds: number) {
  const rl = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
        prefix: `wahsys:${prefix}`,
      })
    : null;

  return async (identifier: string): Promise<LimitResult> => {
    if (rl) {
      const r = await rl.limit(identifier);
      return { success: r.success, remaining: r.remaining };
    }
    return memoryLimit(`${prefix}:${identifier}`, max, windowSeconds * 1000);
  };
}

export const loginRatelimit = createRatelimiter("login", 10, 900);
export const registerRatelimit = createRatelimiter("register", 5, 3600);
export const apiRatelimit = createRatelimiter("api", 200, 60);
export const publicLoanRatelimit = createRatelimiter("public-loan", 8, 3600);
