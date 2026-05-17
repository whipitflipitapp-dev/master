import { consumeRateLimit, type RateLimitResult } from "@/lib/rate-limit";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 40;

export const AI_RATE_LIMIT_WINDOW_MS = WINDOW_MS;
export const AI_RATE_LIMIT_MAX = MAX_PER_WINDOW;

/** Simple in-memory fixed window per user id. */
export function consumeAiRateLimit(userId: string): RateLimitResult {
  return consumeRateLimit({
    key: `ai:${userId}`,
    windowMs: WINDOW_MS,
    max: MAX_PER_WINDOW,
  });
}
