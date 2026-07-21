import type { SupabaseClient } from "@supabase/supabase-js";

import { isAmazonAffiliateProductUrl } from "@/lib/amazon-affiliate-url";
import { canSellCookbooks } from "@/lib/cookbooks-plan-gate";
import { parsePlanType } from "@/lib/plan";
import { GENERIC_SERVER_ERROR, logServerError } from "@/lib/server-error";
import type { Database } from "@/lib/supabase/database.types";

export type BookstoreListing = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  external_link: string;
  chefId: string;
  chefDisplayName: string;
};

type CookbookRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  external_link: string | null;
  created_by: string | null;
};

function chefDisplayFromProfile(row: {
  display_name: string | null;
  first_name: string | null;
}): string {
  const first =
    typeof row.first_name === "string" && row.first_name.trim()
      ? row.first_name.trim()
      : "";
  if (first) return first;
  const display =
    typeof row.display_name === "string" ? row.display_name.trim() : "";
  if (display) {
    return display.split(/\s+/)[0] ?? display;
  }
  return "Chef";
}

export async function listBookstoreListings(
  supabase: SupabaseClient<Database>,
  queryRaw?: string | null,
): Promise<{ listings: BookstoreListing[] | null; errorMessage: string | null }> {
  const term = (queryRaw ?? "").trim().slice(0, 120);

  let booksQuery = supabase
    .from("cookbooks")
    .select("id,title,description,cover_image_url,external_link,created_by")
    .not("external_link", "is", null)
    .order("title", { ascending: true })
    .limit(500);

  const { data: bookRows, error: booksErr } = await booksQuery;

  if (booksErr) {
    logServerError("bookstore.list_cookbooks", booksErr);
    return { listings: null, errorMessage: GENERIC_SERVER_ERROR };
  }

  let books = (bookRows ?? []) as CookbookRow[];
  if (term.length > 0) {
    const needle = term.toLowerCase();
    books = books.filter((book) => {
      const title = book.title.toLowerCase();
      const desc = (book.description ?? "").toLowerCase();
      return title.includes(needle) || desc.includes(needle);
    });
  }
  const creatorIds = [
    ...new Set(
      books
        .map((b) => b.created_by)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const planByCreator = new Map<string, ReturnType<typeof parsePlanType>>();
  const nameByCreator = new Map<string, string>();

  if (creatorIds.length > 0) {
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id,plan_type,display_name,first_name")
      .in("id", creatorIds);

    if (profErr) {
      logServerError("bookstore.list_profiles", profErr);
      return { listings: null, errorMessage: GENERIC_SERVER_ERROR };
    }

    for (const row of profiles ?? []) {
      const id = (row as { id: string }).id;
      const planRaw = (row as { plan_type?: string | null }).plan_type;
      const display_name = (row as { display_name?: string | null }).display_name;
      const first_name = (row as { first_name?: string | null }).first_name;
      planByCreator.set(id, parsePlanType(planRaw) ?? "free");
      nameByCreator.set(
        id,
        chefDisplayFromProfile({
          display_name: display_name ?? null,
          first_name: first_name ?? null,
        }),
      );
    }
  }

  const listings: BookstoreListing[] = [];
  for (const book of books) {
    const link = book.external_link?.trim();
    if (!link || !isAmazonAffiliateProductUrl(link)) continue;
    const chefId = book.created_by;
    if (!chefId) continue;
    const plan = planByCreator.get(chefId) ?? "free";
    if (!canSellCookbooks(plan)) continue;

    listings.push({
      id: book.id,
      title: book.title,
      description: book.description,
      cover_image_url: book.cover_image_url,
      external_link: link,
      chefId,
      chefDisplayName: nameByCreator.get(chefId) ?? "Chef",
    });
  }

  return { listings, errorMessage: null };
}
