import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GroceryListBuilder } from "@/components/grocery-list/GroceryListBuilder";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { loadSavedGroceryListRecipes } from "@/lib/grocery-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  return {
    title: dictText(dict, "grocery_list_meta_title", { brand: dict.brand }),
    description: dictText(dict, "grocery_list_meta_desc"),
  };
}

export const dynamic = "force-dynamic";

export default async function GroceryListPage() {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <ContentPageBackdrop pageKey="/grocery-list">
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-8">
          <header>
            <h1 className="text-[1.625rem] font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              {dictText(dict, "grocery_list_title")}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
              {dictText(dict, "recipes_supabase_env_hint")}
            </p>
          </header>
        </main>
      </ContentPageBackdrop>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/grocery-list");
  }

  const { recipes, error } = await loadSavedGroceryListRecipes(supabase, user.id);

  return (
    <ContentPageBackdrop pageKey="/grocery-list">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-8">
        <header className="border-b border-[var(--border)] pb-6">
          <p className="text-sm font-semibold text-[var(--muted)]">
            <Link
              href="/saved"
              className="text-[var(--primary)] underline-offset-4 hover:underline"
            >
              {dictText(dict, "saved_title")}
            </Link>
            <span aria-hidden className="px-1.5">
              /
            </span>
            {dictText(dict, "grocery_list_breadcrumb")}
          </p>
          <h1 className="mt-2 text-[1.625rem] font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            {dictText(dict, "grocery_list_title")}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            {dictText(dict, "grocery_list_subtitle")}
          </p>
        </header>

        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : (
          <GroceryListBuilder
            recipes={recipes}
            labels={{
              emptyTitle: dictText(dict, "grocery_list_empty_title"),
              emptyBody: dictText(dict, "grocery_list_empty_body"),
              browseRecipes: dictText(dict, "saved_browse_recipes"),
              selectHeading: dictText(dict, "grocery_list_select_heading"),
              selectHint: dictText(dict, "grocery_list_select_hint"),
              previewHeading: dictText(dict, "grocery_list_preview_heading"),
              emailHeading: dictText(dict, "grocery_list_email_heading"),
              emailLabel: dictText(dict, "grocery_list_email_label"),
              emailPlaceholder: dictText(dict, "grocery_list_email_placeholder"),
              emailSubmit: dictText(dict, "grocery_list_email_submit"),
              emailSending: dictText(dict, "grocery_list_email_sending"),
              smsHeading: dictText(dict, "grocery_list_sms_heading"),
              smsLabel: dictText(dict, "grocery_list_sms_label"),
              smsPlaceholder: dictText(dict, "grocery_list_sms_placeholder"),
              smsCta: dictText(dict, "grocery_list_sms_cta"),
              smsDisabled: dictText(dict, "grocery_list_no_selection"),
              smsHint: dictText(dict, "grocery_list_sms_hint"),
            }}
          />
        )}
      </main>
    </ContentPageBackdrop>
  );
}
