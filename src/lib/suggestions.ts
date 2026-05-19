export const SUGGESTION_MAX_LENGTH = 300;
export const SUGGESTION_RATE_LIMIT_MAX = 5;
export const SUGGESTION_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export type SubmitSuggestionErrorCode =
  | "auth"
  | "config"
  | "empty"
  | "generic"
  | "rate_limited"
  | "too_long";

export type SubmitSuggestionState = {
  ok: boolean;
  errorCode: SubmitSuggestionErrorCode | null;
};

export function normalizeSuggestionText(value: FormDataEntryValue | null): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function submitterNameFromProfile(profile: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
} | null): string | null {
  const display = profile?.display_name?.trim();
  if (display) return display;

  const parts = [profile?.first_name, profile?.last_name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" ") : null;
}
