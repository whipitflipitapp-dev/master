import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AiChefWorkbench } from "@/components/ai-chef/AiChefWorkbench";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { loadAiChefUserContext } from "@/lib/ai/user-context";
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
  let initialPantryItems: string[] = [];
  const supabase = await createSupabaseServerClient();
  if (supabase && ctx?.user) {
    const userContext = await loadAiChefUserContext(supabase, ctx.user.id);
    suggestedAllergyNotes = userContext.allergyNotes.join(", ");
    initialPantryItems = userContext.pantryItems;
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
        initialPantryItems={initialPantryItems}
      />
    </main>
    </ContentPageBackdrop>
  );
}
