import type { Metadata } from "next";

import { BookstoreGrid } from "@/components/bookstore/BookstoreGrid";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { listBookstoreListings } from "@/lib/bookstore";
import { GENERIC_LOAD_ERROR } from "@/lib/server-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BookstorePageProps = {
  searchParams?: Promise<{ q?: string | string[] | undefined }>;
};

function firstQuery(q: string | string[] | undefined): string | undefined {
  if (typeof q === "string") return q;
  if (Array.isArray(q) && q.length > 0) return q[0];
  return undefined;
}

export async function generateMetadata({
  searchParams,
}: BookstorePageProps): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const sp = await searchParams;
  const q = firstQuery(sp?.q)?.trim() ?? "";
  const brand = dict.brand;
  const qMeta = q.length > 38 ? `${q.slice(0, 38)}…` : q;

  return {
    title:
      q.length > 0
        ? dictText(dict, "bookstore_meta_title_query", { q: qMeta, brand })
        : dictText(dict, "bookstore_meta_title", { brand }),
    description:
      q.length > 0
        ? dictText(dict, "bookstore_meta_desc_query", { q: q.slice(0, 120) })
        : dictText(dict, "bookstore_meta_desc"),
  };
}

export default async function BookstorePage({ searchParams }: BookstorePageProps) {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const sp = await searchParams;
  const qRaw = firstQuery(sp?.q);
  const qTrim = qRaw?.trim() ?? "";

  const supabase = await createSupabaseServerClient();

  let listings: Awaited<
    ReturnType<typeof listBookstoreListings>
  >["listings"] = [];
  let loadError: string | null = null;

  if (!supabase) {
    loadError = "missing_env";
  } else {
    const result = await listBookstoreListings(supabase, qRaw);
    if (result.errorMessage) {
      loadError = result.errorMessage;
    } else {
      listings = result.listings ?? [];
    }
  }

  const backdropKey = `/bookstore|q=${qTrim}`;

  return (
    <ContentPageBackdrop pageKey={backdropKey}>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-8">
        <header className="border-b border-[var(--border)] pb-6">
          <h1
            className="text-[1.625rem] font-bold tracking-tight text-[var(--text)] sm:text-3xl"
            aria-describedby="bookstore-affiliate-footnote"
          >
            {dictText(dict, "bookstore_title")}
            <sup
              className="ml-0.5 text-[0.65em] font-normal text-[var(--muted)]"
              aria-hidden
            >
              *
            </sup>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            {dictText(dict, "bookstore_subtitle")}
          </p>
          <p
            id="bookstore-affiliate-footnote"
            className="mt-2 max-w-2xl text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]"
            role="note"
          >
            {dictText(dict, "cookbooks_affiliate_footnote")}
          </p>

          <form
            action="/bookstore"
            method="GET"
            className="relative mt-5 max-w-md"
            role="search"
          >
            <label htmlFor="bookstore-search" className="sr-only">
              {dictText(dict, "bookstore_search_aria")}
            </label>
            <input
              id="bookstore-search"
              type="search"
              name="q"
              defaultValue={qTrim}
              placeholder={dictText(dict, "bookstore_search_placeholder")}
              autoComplete="off"
              maxLength={120}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 pl-4 pr-11 text-sm text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)] placeholder:text-[var(--muted)] focus:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)]"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-lg text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
              aria-label={dictText(dict, "bookstore_search_aria")}
            >
              <span aria-hidden>🔍</span>
            </button>
          </form>
        </header>

        {loadError === "missing_env" ? (
          <p className="text-sm text-[var(--muted)]">
            {dictText(dict, "bookstore_unconfigured")}
          </p>
        ) : loadError ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {GENERIC_LOAD_ERROR}
          </p>
        ) : listings.length === 0 ? (
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {qTrim.length > 0
              ? dictText(dict, "bookstore_empty_search", { q: qTrim })
              : dictText(dict, "bookstore_empty")}
          </p>
        ) : (
          <>
            {qTrim.length > 0 ? (
              <p className="text-sm text-[var(--muted)]">
                {dictText(dict, "bookstore_results_count", {
                  count: listings.length,
                })}
              </p>
            ) : null}
            <BookstoreGrid
              listings={listings.map((book) => ({
                ...book,
                byChefLine: dictText(dict, "bookstore_by_chef", {
                  name: book.chefDisplayName,
                }),
              }))}
              ctaLabel={dictText(dict, "recipe_detail_cookbook_cta")}
              chefProfileLabel={dictText(dict, "bookstore_chef_profile_link")}
            />
          </>
        )}
      </main>
    </ContentPageBackdrop>
  );
}
