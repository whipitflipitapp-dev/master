/** Total prize pool per 60-day cycle (USD). */
export const GIVEAWAY_PRIZE_POOL_USD = 100;

/** Prize breakdown per cycle — five winners. */
export const GIVEAWAY_PRIZES = [
  { rank: 1, label: "Grand prize", amountUsd: 50 },
  { rank: 2, label: "Second prize", amountUsd: 20 },
  { rank: 3, label: "Third prize", amountUsd: 10 },
  { rank: 4, label: "Fourth prize", amountUsd: 10 },
  { rank: 5, label: "Fifth prize", amountUsd: 10 },
] as const;

export const GIVEAWAY_CYCLE_DAYS = 60;

export const GIVEAWAY_MIN_RECIPES = 3;

export const GIVEAWAY_MIN_VIDEO_RECIPES = 1;

/** Business days after winner confirmation before check is mailed. */
export const GIVEAWAY_PAYOUT_DAYS = 14;

export const GIVEAWAY_CONTACT_EMAIL = "whipitflipitapp@gmail.com";

export const GIVEAWAY_RULES_LAST_UPDATED = "September 7, 2026";

export const GIVEAWAY_SIGNUP_CTA_HREF = "/signup?next=%2Fadd";
