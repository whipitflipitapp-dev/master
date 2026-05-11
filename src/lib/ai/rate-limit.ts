type Bucket = { count: number; windowStart: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 40;

const store = new Map<string, Bucket>();

/** Simple in-memory sliding window per user id. Returns false when over limit. */
export function consumeAiRateLimit(userId: string): boolean {
  const now = Date.now();
  const prev = store.get(userId);
  if (!prev || now - prev.windowStart > WINDOW_MS) {
    store.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (prev.count >= MAX_PER_WINDOW) {
    return false;
  }
  prev.count += 1;
  return true;
}
