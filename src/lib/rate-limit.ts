type Bucket = { count: number; windowStart: number };

export type RateLimitOptions = {
  key: string;
  windowMs: number;
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const store = new Map<string, Bucket>();

/**
 * Best-effort in-memory fixed-window limiter.
 * This reduces abuse per running server instance; distributed/serverless
 * deployments still need a shared store for strict global limits.
 */
export function consumeRateLimit({
  key,
  windowMs,
  max,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const prev = store.get(key);

  if (!prev || now - prev.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      limit: max,
      remaining: Math.max(0, max - 1),
      resetAt: now + windowMs,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  const resetAt = prev.windowStart + windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  if (prev.count >= max) {
    return {
      allowed: false,
      limit: max,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
    };
  }

  prev.count += 1;
  return {
    allowed: true,
    limit: max,
    remaining: Math.max(0, max - prev.count),
    resetAt,
    retryAfterSeconds,
  };
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
