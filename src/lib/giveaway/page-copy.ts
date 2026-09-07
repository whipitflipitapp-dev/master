import {
  GIVEAWAY_CYCLE_DAYS,
  GIVEAWAY_MIN_RECIPES,
  GIVEAWAY_MIN_VIDEO_RECIPES,
} from "@/lib/giveaway/constants";

/** Public-facing copy for /giveaway — everyday family & meal-prep cooks. */
export const GIVEAWAY_PAGE_COPY = {
  kicker: "Family recipe giveaway",
  headline: `Share the Dinners You Actually Make. Win Cash. Every ${GIVEAWAY_CYCLE_DAYS} Days.`,
  intro:
    "Whip It Flip It is for everyday cooking — weeknight dinners, meal prep, and meals your family really eats. Every 60 days we reward people who share original recipes on the site (not copy-paste content from elsewhere).",
  helpMeCookTitle: "Built for busy home cooks",
  helpMeCookBody:
    "Our Help Me Cook feature finds recipes from ingredients you already have — perfect after work when you need to feed your family without a grocery run. Your simple, real recipes help other parents and home cooks too.",
  helpMeCookHref: "/help-me-cook",
  helpMeCookLinkLabel: "Try Help Me Cook",
  prizeNote:
    "Weeknight meals count. Meal prep counts. You do not need restaurant-style or complex recipes.",
  ctaLabel: "Share your family recipes",
  entrySteps: [
    {
      icon: "👤",
      title: "Create a free account",
      body: "Sign up at WhipItFlipIt.com with email or Google. No purchase or subscription required.",
    },
    {
      icon: "🥘",
      title: `Upload ${GIVEAWAY_MIN_RECIPES}+ recipes you really cook`,
      body: `Add at least ${GIVEAWAY_MIN_RECIPES} original recipes you made during the Entry Period — taco night, sheet-pan dinners, slow-cooker meals, and meal-prep bowls all qualify.`,
    },
    {
      icon: "🎬",
      title: "Include a short cooking video",
      body: `At least ${GIVEAWAY_MIN_VIDEO_RECIPES} recipe needs a video showing some or all of the cooking (phone clip, uploaded reel, or video link). It does not need to be fancy.`,
    },
    {
      icon: "🎉",
      title: "You're entered automatically",
      body: "When you meet the requirements, you're in the random drawing at the end of the cycle.",
    },
  ],
  entryFootnote:
    "No purchase necessary. Entry is free — share real recipes you've actually made for your household.",
  originalityBullets: [
    "Must be written by you, not AI-generated",
    "Must not be copied or paraphrased from another site, cookbook, or video",
    "Must not duplicate a recipe already on Whip It Flip It",
    "Video must match the recipe you submit",
    "Simple and quick recipes are welcome — we review winning entries by hand before confirming any winner",
  ],
  originalityClosing:
    "We're rewarding real home cooking, not copy-paste content or influencer-style productions.",
} as const;

export const GIVEAWAY_META_DESCRIPTION =
  "Free recipe giveaway for everyday family cooks: share 3 real weeknight or meal-prep recipes with a cooking video for a chance to win from a $100 prize pool every 60 days. Help Me Cook finds meals from ingredients you already have.";
