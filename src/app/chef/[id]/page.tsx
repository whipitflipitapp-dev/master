import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AffiliateDisclosure } from "@/components/affiliate/AffiliateDisclosure";
import { ChefAvatar } from "@/components/chef/ChefAvatar";
import { AffiliateOutboundLink } from "@/components/affiliate/AffiliateOutboundLink";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

type CookbookPublic = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  external_link: string | null;
};

function CookbookCardInner({ book }: { book: CookbookPublic }) {
  return (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))]">
        {book.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- Amazon / arbitrary HTTPS covers
          <img
            src={book.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-4xl opacity-[0.35]"
            aria-hidden
          >
            📚
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--text)]">
          {book.title}
        </h3>
        {book.description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">
            {book.description}
          </p>
        ) : null}
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          {book.external_link ? "View on Amazon →" : "Link unavailable"}
        </p>
      </div>
    </>
  );
}

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
    return { configured: true as const, error: headerErr.message };
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

  if (booksErr) {
    return { configured: true as const, error: booksErr.message };
  }

  return {
    configured: true as const,
    error: null as string | null,
    header,
    cookbooks: books ?? [],
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

  const { header, cookbooks } = data;
  const list = cookbooks ?? [];
  const displayName =
    header?.display_name?.trim() || "Chef";

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
          </div>
        </div>
      </header>

      <section aria-labelledby="cookbooks-heading">
        <h2
          id="cookbooks-heading"
          className="text-xl font-semibold tracking-tight text-[var(--text)]"
        >
          Cookbooks
        </h2>
        <AffiliateDisclosure className="mt-3" />

        {list.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            No cookbook links here yet.
          </p>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {list.map((book) => (
              <li key={book.id}>
                {book.external_link ? (
                  <AffiliateOutboundLink
                    href={book.external_link}
                    recipeId={null}
                    linkType="cookbook_amazon"
                    className="group block overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.992] md:active:scale-100"
                  >
                    <CookbookCardInner book={book} />
                  </AffiliateOutboundLink>
                ) : (
                  <div className="block overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]">
                    <CookbookCardInner book={book} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
