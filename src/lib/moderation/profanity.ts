/**
 * Server-side profanity screening for display names and recipe text.
 * Hard terms → block names; recipes held for admin review (hard + soft/context terms).
 */

export type ProfanitySeverity = "hard" | "soft";

export type ProfanityScanResult = {
  flagged: boolean;
  severity: ProfanitySeverity | null;
  /** Normalized token(s) that matched (for admin audit notes, not end-user display). */
  matched: string[];
};

const HARD_TERMS = [
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "mf",
  "shit",
  "shitty",
  "bullshit",
  "bitch",
  "bitches",
  "cunt",
  "dick",
  "pussy",
  "whore",
  "slut",
  "bastard",
  "asshole",
  "cock",
  "ass",
  "badass",
  "dumbass",
  "jackass",
  "shithead",
  "faggot",
  "fag",
  "nigger",
  "nigga",
  "retard",
  "retarded",
];

/** Allowed alone but triggers recipe review when used in recipe copy. */
const SOFT_TERMS = ["damn", "goddamn", "hell"];

function leetspeakNormalize(input: string): string {
  return input
    .replace(/[@]/g, "a")
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[$5]/g, "s")
    .replace(/[7]/g, "t");
}

function normalizeScanText(raw: string): string {
  const lowered = leetspeakNormalize(raw.toLowerCase());
  return lowered
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function termPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

const HARD_PATTERNS = HARD_TERMS.map((t) => ({ term: t, re: termPattern(t) }));
const SOFT_PATTERNS = SOFT_TERMS.map((t) => ({ term: t, re: termPattern(t) }));

export function scanProfanity(raw: string): ProfanityScanResult {
  const text = normalizeScanText(raw);
  if (!text) {
    return { flagged: false, severity: null, matched: [] };
  }

  const matched: string[] = [];
  for (const { term, re } of HARD_PATTERNS) {
    if (re.test(text)) {
      matched.push(term);
    }
  }
  if (matched.length > 0) {
    return { flagged: true, severity: "hard", matched: [...new Set(matched)] };
  }

  for (const { term, re } of SOFT_PATTERNS) {
    if (re.test(text)) {
      matched.push(term);
    }
  }
  if (matched.length > 0) {
    return { flagged: true, severity: "soft", matched: [...new Set(matched)] };
  }

  return { flagged: false, severity: null, matched: [] };
}

export function scanProfanityInFields(
  fields: readonly string[],
): ProfanityScanResult {
  const combined = fields.filter(Boolean).join("\n");
  return scanProfanity(combined);
}

/** User-facing error when a display name contains hard profanity. */
export function displayNameProfanityError(name: string): string | null {
  const result = scanProfanity(name);
  if (result.severity === "hard") {
    return "Display name cannot include offensive language.";
  }
  return null;
}

export function recipeProfanityReviewReason(result: ProfanityScanResult): string | null {
  if (!result.flagged) {
    return null;
  }
  if (result.severity === "hard") {
    return "Auto-held: offensive language detected — pending admin review.";
  }
  return "Auto-held: language flagged for context review — pending admin review.";
}

export const USER_TEXT_PROFANITY_BLOCK_ERROR =
  "Please remove offensive language before posting.";

export const USER_TEXT_PENDING_REVIEW_NOTICE =
  "Saved. Your text is pending review before it appears publicly.";

/** Hard profanity blocks posting; soft terms (e.g. damn) allow save but need review. */
export function evaluateUserGeneratedText(text: string): {
  blocked: boolean;
  pendingReview: boolean;
  error: string | null;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { blocked: false, pendingReview: false, error: null };
  }
  const scan = scanProfanity(trimmed);
  if (!scan.flagged) {
    return { blocked: false, pendingReview: false, error: null };
  }
  if (scan.severity === "hard") {
    return {
      blocked: true,
      pendingReview: false,
      error: USER_TEXT_PROFANITY_BLOCK_ERROR,
    };
  }
  return { blocked: false, pendingReview: true, error: null };
}

export function evaluateUserGeneratedTextFields(
  fields: readonly string[],
): {
  blocked: boolean;
  pendingReview: boolean;
  error: string | null;
} {
  let pendingReview = false;
  for (const field of fields) {
    const result = evaluateUserGeneratedText(field);
    if (result.blocked) {
      return result;
    }
    if (result.pendingReview) {
      pendingReview = true;
    }
  }
  return { blocked: false, pendingReview, error: null };
}

export function contentModerationStatusForUserText(pendingReview: boolean): "published" | "pending_review" {
  return pendingReview ? "pending_review" : "published";
}

export const DISPLAY_NAME_PROFANITY_ERROR =
  "Display name cannot include offensive language.";

export const RECIPE_HELD_FOR_REVIEW_MESSAGE =
  "Your recipe was saved but is hidden from the public catalog until our team reviews the language.";
