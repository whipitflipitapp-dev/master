/**
 * Instagram / Meta ad copy — everyday family cooks & meal prep (not chef/complex).
 * Use with landing page: https://www.whipitflipit.com/giveaway
 * Append UTMs when launching: ?utm_source=instagram&utm_medium=paid&utm_campaign=family_giveaway
 *
 * Creatives (deployed with site):
 * - Feed 1:1  → /marketing/giveaway-ig-feed-family.png
 * - Story 9:16 → /marketing/giveaway-ig-story-family.png
 * - Thanksgiving feed → /marketing/giveaway-ig-feed-thanksgiving.png
 * - Thanksgiving story → /marketing/giveaway-ig-story-thanksgiving.png
 * - Thanksgiving leftovers feed → /marketing/giveaway-ig-feed-thanksgiving-leftovers.png
 */

export const GIVEAWAY_IG_CREATIVES = {
  feedFamily: "/marketing/giveaway-ig-feed-family.png",
  storyFamily: "/marketing/giveaway-ig-story-family.png",
  feedThanksgiving: "/marketing/giveaway-ig-feed-thanksgiving.png",
  storyThanksgiving: "/marketing/giveaway-ig-story-thanksgiving.png",
  feedThanksgivingLeftovers: "/marketing/giveaway-ig-feed-thanksgiving-leftovers.png",
  siteBase: "https://www.whipitflipit.com",
} as const;

export const GIVEAWAY_IG_AUDIENCE = {
  positioning:
    "Busy parents and everyday home cooks who feed their families — weeknight dinners and meal prep, not restaurant or influencer cooking.",
  interests: [
    "Meal preparation",
    "Cooking",
    "Easy recipes",
    "Quick meals",
    "Family meals",
    "Budget cooking",
  ],
  avoidCopy: ["chef", "culinary", "gourmet", "elevated", "restaurant-style"],
  preferCopy: [
    "after work",
    "family dinner",
    "meal prep",
    "what's in the fridge",
    "Help Me Cook",
    "weeknight",
  ],
} as const;

export const GIVEAWAY_IG_ADS = [
  {
    id: "after-work-mom",
    name: "After-work family cook",
    headline: "Real family recipes. Real prizes.",
    primaryText: `Long day? You still have to figure out dinner.

If you've got go-to meals your family actually eats, share them on Whip It Flip It — free account, no subscription.

Upload 3 recipes you really cook (weeknight dinners count!) + one short cooking video → entered to win from $100 every 60 days ($50 · $20 · 3× $10).

Plus: Help Me Cook finds recipes from what you already have in the fridge and pantry.

Free to enter. Rules: WhipItFlipIt.com/giveaway

No purchase necessary. US 18+. Not affiliated with Instagram/Meta.`,
    cta: "Learn More",
    placement: ["Reels", "Stories", "Feed"],
  },
  {
    id: "meal-prep",
    name: "Meal prep / batch cooking",
    headline: "Share your meal prep. Win cash.",
    primaryText: `Sunday prep people — this one's for you.

Post the meals you batch for the week: sheet-pan chicken, rice bowls, freezer-friendly dinners, whatever your family runs on.

3 recipes + 1 quick cooking clip on Whip It Flip It = entered in our $100 giveaway (every 60 days).

Stuck mid-week? Help Me Cook matches recipes to ingredients you already have.

whipitflipit.com/giveaway · No purchase necessary.`,
    cta: "Learn More",
    placement: ["Reels", "Feed"],
  },
  {
    id: "not-fancy",
    name: "Not fancy reassurance",
    headline: "Weeknight cooks welcome.",
    primaryText: `You do NOT need a fancy kitchen or a viral recipe.

Taco night. Pasta with what you've got. Slow-cooker dump meals. If you made it for your family, it counts.

Free account → 3 recipes → 1 video → entered for $100 in cash prizes.

Help Me Cook helps other busy parents cook with what's on hand.

Full rules: WhipItFlipIt.com/giveaway`,
    cta: "Sign Up",
    placement: ["Stories", "Reels"],
  },
] as const;

export const GIVEAWAY_IG_ORGANIC_POST = `If you cook for your family most nights, you're already the expert.

Whip It Flip It is for real home cooking — the kind you make when you're tired but everyone still needs to eat.

🥘 Help Me Cook → recipes from ingredients you already have
🎁 Giveaway → share 3 recipes + 1 cooking video, enter to win $100 (every 60 days)

Taco Tuesday counts. Freezer meals count. "Everyone ate it" counts.

Rules + enter: link in bio
#dinnerideas #mealprep #busymomlife #familydinners #whipitflipit`;

/** Thanksgiving seasonal campaign — pair with GIVEAWAY_IG_CREATIVES thanksgiving assets. */
export const GIVEAWAY_IG_THANKSGIVING_ADS = [
  {
    id: "thanksgiving-family-table",
    name: "Holiday meals count",
    creative: "feedThanksgiving" as const,
    headline: "Thanksgiving recipes count.",
    primaryText: `Cooking for the holidays? Your real family recipes belong on Whip It Flip It.

Share 3 meals you actually make — sides, mains, or the stuff everyone asks for every year — plus one short cooking video. You're entered to win from $100 every 60 days.

Help Me Cook also finds recipes from what's already in your fridge (hello, pre-holiday week).

Free account. Rules: WhipItFlipIt.com/giveaway?utm_source=instagram&utm_medium=paid&utm_campaign=thanksgiving_giveaway

No purchase necessary. US 18+. Not affiliated with Instagram/Meta.`,
    cta: "Learn More",
  },
  {
    id: "thanksgiving-story-prep",
    name: "Holiday prep / sides",
    creative: "storyThanksgiving" as const,
    headline: "Holiday cooking counts.",
    primaryText: `Stuffing. Green beans. The pan you bring every year.

If you cook for your family during the holidays, share those recipes on Whip It Flip It — 3 recipes + 1 video = entered for $100.

Stuck before the big day? Help Me Cook uses what's on hand.

whipitflipit.com/giveaway`,
    cta: "Learn More",
  },
  {
    id: "thanksgiving-leftovers",
    name: "Leftover week meal prep",
    creative: "feedThanksgivingLeftovers" as const,
    headline: "Leftover turkey counts too.",
    primaryText: `The best part of Thanksgiving might be the week after.

Turn leftovers into real recipes — turkey bowls, soup, casserole — and share them on Whip It Flip It. 3 recipes + 1 quick video = entered to win $100 (every 60 days).

Help Me Cook helps other families use what's already in the kitchen.

Full rules: WhipItFlipIt.com/giveaway`,
    cta: "Sign Up",
  },
] as const;

export const GIVEAWAY_IG_THANKSGIVING_ORGANIC = `🦃 Cooking for Thanksgiving (or just trying to survive the week before)?

Your family favorites count — not just "influencer" recipes.

Share 3 real meals + 1 cooking video on Whip It Flip It → enter to win $100 every 60 days.

Help Me Cook: recipes from what's in your fridge 🥘
Giveaway rules: link in bio

#thanksgivingrecipes #leftoverturkey #familydinner #mealprep #whipitflipit`;

export const GIVEAWAY_IG_REELS = [
  {
    id: "fridge-check",
    title: "Fridge check (Help Me Cook + giveaway)",
    beats: [
      "6pm. Kids are hungry. Open the fridge — random ingredients.",
      "Whip It Flip It Help Me Cook → recipes from what you already have.",
      "Cook it once, upload your real recipe — 3 meals + 1 video = entered to win $100 every 60 days.",
      "Weeknight cooks welcome. Link in bio.",
    ],
    caption:
      "Not a chef account. Just someone who feeds people. #mealprep #dinnerideas #busymom #whipitflipit",
  },
  {
    id: "what-i-actually-make",
    title: "What I actually make",
    beats: [
      "These aren't viral recipes.",
      "They're what my family eats.",
      "Share yours on WhipItFlipIt.com → win cash.",
      "$50 · $20 · $10 · $10 · $10",
    ],
    caption: "Real dinners. Real prizes. whipitflipit.com/giveaway",
  },
] as const;
