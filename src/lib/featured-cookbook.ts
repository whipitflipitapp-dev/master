import type { SupabaseClient } from "@supabase/supabase-js";

import { isAmazonAffiliateProductUrl } from "@/lib/amazon-affiliate-url";
import { canSellCookbooks } from "@/lib/cookbooks-plan-gate";
import type { PlanType } from "@/lib/plan";
import type { Database } from "@/lib/supabase/database.types";

export type CookbookPickOption = {
  id: string;
  title: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CookbookAffiliatePickRow = Pick<
  Database["public"]["Tables"]["cookbooks"]["Row"],
  "id" | "title" | "external_link"
>;

export async function listAffiliateCookbookPickOptions(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CookbookPickOption[]> {
  const { data, error } = await supabase
    .from("cookbooks")
    .select("id,title,external_link")
    .eq("created_by", userId)
    .order("title", { ascending: true });

  if (error || !data) {
    return [];
  }

  const out: CookbookPickOption[] = [];
  for (const row of data as CookbookAffiliatePickRow[]) {
    const link = row.external_link?.trim();
    if (!link || !isAmazonAffiliateProductUrl(link)) continue;
    out.push({ id: row.id, title: row.title });
  }
  return out;
}

/** Validates featured cookbook choice for recipe author (Pro+ selling only). */
export async function resolveFeaturedCookbookIdForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  plan: PlanType,
  raw: FormDataEntryValue | null | undefined,
): Promise<{ id: string | null; error: string | null }> {
  if (!canSellCookbooks(plan)) {
    const trimmed =
      typeof raw === "string" ? raw.trim() : String(raw ?? "").trim();
    if (trimmed && trimmed !== "" && trimmed !== "none") {
      return {
        id: null,
        error: "Cookbook links require a Pro or AI Chef plan.",
      };
    }
    return { id: null, error: null };
  }

  const trimmed =
    typeof raw === "string" ? raw.trim() : String(raw ?? "").trim();
  if (!trimmed || trimmed === "none") {
    return { id: null, error: null };
  }
  if (!UUID_RE.test(trimmed)) {
    return { id: null, error: "Choose a valid cookbook." };
  }

  const { data, error } = await supabase
    .from("cookbooks")
    .select("id,external_link")
    .eq("id", trimmed)
    .eq("created_by", userId)
    .maybeSingle();

  if (error || !data) {
    return { id: null, error: "That cookbook is not on your account." };
  }

  const cookbook = data as Pick<
    Database["public"]["Tables"]["cookbooks"]["Row"],
    "id" | "external_link"
  >;

  const link = cookbook.external_link?.trim();
  if (!link || !isAmazonAffiliateProductUrl(link)) {
    return {
      id: null,
      error: "That cookbook needs a valid Amazon affiliate link first.",
    };
  }

  return { id: cookbook.id, error: null };
}
