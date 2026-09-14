/**
 * Shared rate-limiting helper using Upstash Redis.
 *
 * IMPORTANT — MANUAL SETUP REQUIRED IN PRODUCTION:
 * This module is inert until two environment variables are set in Vercel:
 *   UPSTASH_REDIS_REST_URL   — from Upstash dashboard → your database → REST API
 *   UPSTASH_REDIS_REST_TOKEN — same location
 *
 * Without these vars the helper returns { allowed: true } on every call
 * (fail-open), so the app works normally in dev / CI without Upstash configured.
 * Rate limiting becomes active the moment the vars are set in production.
 *
 * Algorithm: sliding window — the most accurate for burst protection.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the caller is allowed to retry. Only present when allowed=false. */
  retryAfter?: number;
}

type Duration = `${number} ${"ms" | "s" | "m" | "h" | "d"}`;

/**
 * Check whether `identifier` (an IP address or user UUID) has exceeded the
 * rate limit for the given window.
 *
 * @param identifier  IP (for public endpoints) or `user:<uuid>` (for authed endpoints)
 * @param requests    Maximum requests allowed in the window
 * @param window      Duration string, e.g. "1 m", "10 m", "1 h"
 */
export async function checkRateLimit(
  identifier: string,
  requests: number,
  window: Duration
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Fail-open: no credentials → rate limiting is inactive.
  if (!url || !token) return { allowed: true };

  const ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
    prefix: "jnsa", // namespace — avoids collisions if the Redis DB is shared
  });

  const { success, reset } = await ratelimit.limit(identifier);

  return {
    allowed: success,
    retryAfter: success ? undefined : Math.ceil((reset - Date.now()) / 1000),
  };
}

/**
 * Extract the caller's IP from the request for use as a rate-limit identifier
 * on unauthenticated endpoints. On Vercel, `x-forwarded-for` is always set by
 * the edge; the first entry is the original client IP.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"
  );
}
