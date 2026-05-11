import "server-only";

import { cookies } from "next/headers";

import {
  type AppLocale,
  LOCALE_COOKIE,
  normalizeLocale,
} from "@/lib/i18n/locale";
import { getCurrentProfile } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type { AppLocale } from "@/lib/i18n/locale";
export { APP_LOCALES, LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n/locale";

export async function resolveAppLocale(): Promise<AppLocale> {
  const jar = await cookies();
  const fromCookie = jar.get(LOCALE_COOKIE)?.value;
  if (fromCookie) {
    return normalizeLocale(fromCookie);
  }

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const ctx = await getCurrentProfile(supabase);
    if (ctx?.profile.language) {
      return normalizeLocale(ctx.profile.language);
    }
  }

  return "en";
}

type CommonJson = Record<string, string>;

export async function getDictionary(locale: AppLocale): Promise<CommonJson> {
  const [primary, fallback] = await Promise.all([
    import(`@/i18n/locales/${locale}/common.json`) as Promise<{
      default: CommonJson;
    }>,
    import(`@/i18n/locales/en/common.json`) as Promise<{
      default: CommonJson;
    }>,
  ]);
  return { ...fallback.default, ...primary.default };
}

export function formatDict(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key)
      ? String(vars[key])
      : "",
  );
}

export function dictText(
  dict: CommonJson,
  key: string,
  vars: Record<string, string | number> = {},
): string {
  const raw = dict[key] ?? key;
  return raw.includes("{{") ? formatDict(raw, vars) : raw;
}
