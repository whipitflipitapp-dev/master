import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AiChefWorkbench } from "@/components/ai-chef/AiChefWorkbench";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { isAiChef, type PlanType } from "@/lib/plan";
import { getCurrentProfile } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  return {
    title: dictText(dict, "ai_chef_meta_title", { brand: dict.brand }),
    description: dictText(dict, "ai_chef_meta_desc"),
  };
}

function allergenNameFromJoinedRow(row: unknown): string | undefined {
  if (!row || typeof row !== "object" || !("allergens" in row)) {
    return undefined;
  }
  const nested = (row as { allergens: unknown }).allergens;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const name = (nested as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
    return undefined;
  }
  if (Array.isArray(nested)) {
    for (const item of nested) {
      if (
        item &&
        typeof item === "object" &&
        "name" in item &&
        typeof (item as { name: unknown }).name === "string"
      ) {
        const name = (item as { name: string }).name.trim();
        if (name) {
          return name;
        }
      }
    }
  }
  return undefined;
}

export default async function AiChefPage() {
  const dict = await getDictionary(await resolveAppLocale());
  const ctx = await getCurrentProfile();
  const planType: PlanType = ctx?.profile.plan_type ?? "free";

  // Signed-in users without the AI Chef tier are routed to the existing upgrade
  // page. Signed-out users are already redirected to /login by the auth proxy
  // (see `PROTECTED_PREFIXES` in `src/proxy.ts`).
  if (ctx?.user && !isAiChef(planType)) {
    redirect("/upgrade");
  }

  let suggestedAllergyNotes = "";
  const supabase = await createSupabaseServerClient();
  if (supabase && ctx?.user) {
    const { data: rows } = await supabase
      .from("user_allergies")
      .select("allergens(name)")
      .eq("user_id", ctx.user.id);
    const names = (rows ?? [])
      .map((r) => allergenNameFromJoinedRow(r))
      .filter((n): n is string => Boolean(n));
    suggestedAllergyNotes = names.join(", ");
  }

  return (
    <ContentPageBackdrop pageKey="/ai-chef">
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 py-8">
      <header className="border-b border-[var(--border)] pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
              {dictText(dict, "ai_chef_title")}
            </h1>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              {dictText(dict, "ai_chef_intro")}
            </p>
          </div>
          <Link
            href="/help-me-cook"
            className="shrink-0 text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {dictText(dict, "ai_chef_help_link")}
          </Link>
        </div>
      </header>

      <AiChefWorkbench
        planType={planType}
        suggestedAllergyNotes={suggestedAllergyNotes}
      />
    </main>
    </ContentPageBackdrop>
  );
}
