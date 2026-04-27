import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const WINDOW = '1 h' as const;
const MAX_REQUESTS = 20;

let ratelimit: Ratelimit | null = null;
let devMissingEnvLogged = false;

function getRatelimit(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    if (process.env.NODE_ENV === 'development') {
      if (!devMissingEnvLogged) {
        devMissingEnvLogged = true;
        console.warn(
          '[ai rate limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled in development.'
        );
      }
      return null;
    }
    return null;
  }
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS, WINDOW),
      prefix: 'trity:ai',
    });
  }
  return ratelimit;
}

export type AiRateLimitResult = { ok: true } | { ok: false; status: 429 | 503; message: string };

/**
 * Enforce 20 AI requests per Supabase user per hour (Upstash sliding window).
 * Production without Upstash env returns 503. Development skips limiting with a one-time warning.
 */
export async function enforceAiRateLimit(userId: string): Promise<AiRateLimitResult> {
  const limiter = getRatelimit();
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      return {
        ok: false,
        status: 503,
        message:
          'AI rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.',
      };
    }
    return { ok: true };
  }

  const { success } = await limiter.limit(userId);
  if (!success) {
    return {
      ok: false,
      status: 429,
      message: `Too many AI requests. Limit is ${MAX_REQUESTS} per hour per user. Try again later.`,
    };
  }
  return { ok: true };
}
