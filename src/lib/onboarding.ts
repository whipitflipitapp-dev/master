export { FOOD_CATEGORY_VALUES, type FoodCategory } from "@/lib/recipe-categories";

export const REFERRAL_SOURCE_VALUES = [
  "friend",
  "search",
  "social",
  "app_store",
  "ad",
  "blog",
  "other",
] as const;
export type ReferralSource = (typeof REFERRAL_SOURCE_VALUES)[number];

export const FEATURE_INTEREST_VALUES = [
  "upload_recipes",
  "pantry_match",
  "sell_cookbook",
  "ai_chef",
  "save_favorites",
] as const;
export type FeatureInterest = (typeof FEATURE_INTEREST_VALUES)[number];

export type OnboardingInput = {
  firstName?: string;
  lastName?: string;
  birthdate?: string | null;
  featureInterests?: string[];
  foodsLoved?: string[];
  foodsLovedOther?: string;
  cooksPerWeek?: number | null;
  allergyOther?: string;
  referralSource?: string;
};
