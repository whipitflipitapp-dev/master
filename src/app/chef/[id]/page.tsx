import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChefAvatar } from "@/components/chef/ChefAvatar";
import { ChefCookbooksSection } from "@/components/cookbooks/ChefCookbooksSection";
import { RecipeUploadBadge } from "@/components/creator/RecipeUploadBadge";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import {
  recipeUploadBadgeLabelKey,
  resolveRecipeUploadBadgeTier,
} from "@/lib/recipe-upload-badges";
import { canSellCookbooks } from "@/lib/cookbooks-plan-gate";
import { parsePlanType } from "@/lib/plan";
import { GENERIC_LOAD_ERROR, logServerError } from "@/lib/server-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

async function loadChefPage(chefId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { configured: false as const };
  }

  const { data: headerRows, error: headerErr } = await supabase.rpc(
    "chef_public_profile",
    { p_user_id: chefId },
  );

  if (headerErr) {
    logServerError("chef.public_profile", headerErr);
    return { configured: true as const, error: GENERIC_LOAD_ERROR };
  }

  type Header = { display_name: string | null; avatar_url: string | null };
  const header: Header | null =
    Array.isArray(headerRows) && headerRows.length > 0
      ? (headerRows[0] as Header)
      : null;

  const { data: books, error: booksErr } = await supabase
    .from("cookbooks")
    .select("id,title,description,cover_image_url,external_link")
    .eq("created_by", chefId)
    .order("title", { ascending: true });

  const { data: planRow } = await supabase
    .from("profiles")
    .select("plan_type")
    .eq("id", chefId)
    .maybeSingle();

  const chefPlan = parsePlanType(planRow?.plan_type) ?? "free";
  const publicCookbooks = canSellCookbooks(chefPlan) ? (books ?? []) : [];

  const { count: recipeCount, error: recipeCountErr } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true })
    .eq("created_by", chefId);

  if (booksErr) {
    logServerError("chef.cookbooks", booksErr);
    return { configured: true as const, error: GENERIC_LOAD_ERROR };
  }

  if (recipeCountErr) {
    logServerError("chef.recipe_count", recipeCountErr);
    return { configured: true as const, error: GENERIC_LOAD_ERROR };
  }

  return {
    configured: true as const,
    error: null as string | null,
    header,
    cookbooks: publicCookbooks,
    uploadedRecipeCount:
      typeof recipeCount === "number" && recipeCount >= 0 ? recipeCount : 0,
  };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;
  if (!isUuid(id)) {
    return { title: "Chef | Whip It Flip It" };
  }
  const data = await loadChefPage(id);
  if (!data.configured || data.error) {
    return { title: "Chef | Whip It Flip It" };
  }
  const name = data.header?.display_name?.trim() || "Chef";
  return {
    title: `${name} | Cookbooks | Whip It Flip It`,
    description: `Cookbooks and affiliate picks from ${name} on Whip It Flip It.`,
  };
}

export default async function ChefProfilePage(props: Props) {
  const { id } = await props.params;
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);

  if (!isUuid(id)) {
    notFound();
  }

  const data = await loadChefPage(id);

  if (!data.configured) {
    return (
      <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Chef profile</h1>
        <p className="text-sm text-[var(--muted)]">
          Configure Supabase to view creator pages.
        </p>
      </main>
    );
  }

  if (data.error) {
    return (
      <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Chef profile</h1>
        <p className="text-sm text-[var(--danger)]" role="alert">
          {data.error}
        </p>
      </main>
    );
  }

  const { header, cookbooks, uploadedRecipeCount } = data;
  const list = cookbooks ?? [];
  const displayName =
    header?.display_name?.trim() || "Chef";
  const uploadBadgeTier = resolveRecipeUploadBadgeTier(uploadedRecipeCount ?? 0);
  const uploadBadgeLabel =
    uploadBadgeTier != null
      ? dictText(dict, recipeUploadBadgeLabelKey(uploadBadgeTier))
      : null;

  if (list.length === 0 && !header?.display_name?.trim()) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-8">
      <header className="border-b border-[var(--border)] pb-6">
        <Link
          href="/recipes"
          className="text-sm font-semibold text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
        >
          ← Recipes
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <ChefAvatar
            avatarUrl={header?.avatar_url}
            displayName={displayName}
            size="lg"
          />
          <div>
            <h1 className="text-[1.65rem] font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              {displayName}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Cookbooks &amp; affiliate picks
            </p>
            {uploadBadgeTier && uploadBadgeLabel ? (
              <div className="mt-2">
                <RecipeUploadBadge
                  tier={uploadBadgeTier}
                  label={uploadBadgeLabel}
                  size="sm"
                />
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <ChefCookbooksSection
        books={list}
        heading={dictText(dict, "chef_profile_cookbooks_heading")}
        ctaLabel={dictText(dict, "recipe_detail_cookbook_cta")}
        className=""
        emptyMessage={dictText(dict, "chef_profile_cookbooks_empty")}
      />
    </main>
  );
}
