export const LOCALE_COOKIE = "NEXT_LOCALE";

export const APP_LOCALES = ["en", "it", "fr"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export function normalizeLocale(raw: string | null | undefined): AppLocale {
  const base =
    typeof raw === "string" ? raw.trim().split("-")[0]?.toLowerCase() ?? "" : "";
  return APP_LOCALES.includes(base as AppLocale) ? (base as AppLocale) : "en";
}

/** First supported locale from an Accept-Language header, or null. */
export function localeFromAcceptLanguageHeader(
  header: string | null,
): AppLocale | null {
  if (!header?.trim()) return null;
  for (const part of header.split(",")) {
    const tag = part.trim().split(";")[0]?.trim().toLowerCase();
    if (!tag) continue;
    const base = tag.split("-")[0];
    if (APP_LOCALES.includes(base as AppLocale)) {
      return base as AppLocale;
    }
  }
  return null;
}
