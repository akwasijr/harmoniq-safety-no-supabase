import { NextRequest, NextResponse } from "next/server";

/**
 * Shared in-memory sliding-window rate limiter.
 *
 * Usage:
 *   const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
 *   // inside handler:
 *   const rl = limiter.check(request);
 *   if (!rl.allowed) return rl.response;
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Optional prefix to namespace different limiters sharing an IP. */
  prefix?: string;
}

interface RateLimitResult {
  allowed: boolean;
  /** Pre-built 429 response (only present when blocked). */
  response: NextResponse;
  remaining: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Periodically purge expired entries to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const store of stores.values()) {
      for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
      }
    }
  }, 60_000);
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { limit, windowMs, prefix = "default" } = options;

  if (!stores.has(prefix)) {
    stores.set(prefix, new Map());
  }
  const store = stores.get(prefix)!;

  return {
    check(request: NextRequest): RateLimitResult {
      const ip = getClientIp(request);
      const now = Date.now();
      const entry = store.get(ip);

      if (!entry || now > entry.resetAt) {
        store.set(ip, { count: 1, resetAt: now + windowMs });
        return buildResult(true, limit - 1, now + windowMs);
      }

      if (entry.count >= limit) {
        return buildResult(false, 0, entry.resetAt);
      }

      entry.count++;
      return buildResult(true, limit - entry.count, entry.resetAt);
    },
  };
}

function buildResult(
  allowed: boolean,
  remaining: number,
  resetAt: number
): RateLimitResult {
  const headers = {
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      response: NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { ...headers, "Retry-After": String(retryAfter) },
        }
      ),
    };
  }

  return {
    allowed: true,
    remaining,
    resetAt,
    response: null as unknown as NextResponse, // not used when allowed
  };
}
