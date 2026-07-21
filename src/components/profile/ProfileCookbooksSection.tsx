import Link from "next/link";

import {
  ChefCookbooksSection,
  filterAffiliateCookbooks,
  type ChefCookbookPublic,
} from "@/components/cookbooks/ChefCookbooksSection";

type ProfileCookbooksSectionProps = {
  userId: string;
  books: ChefCookbookPublic[];
  canSell: boolean;
  labels: {
    heading: string;
    intro: string;
    introProRequired: string;
    manage: string;
    empty: string;
    emptyProRequired: string;
    cta: string;
    viewPublicProfile: string;
  };
};

export function ProfileCookbooksSection({
  userId,
  books,
  canSell,
  labels,
}: ProfileCookbooksSectionProps) {
  const affiliateBooks = canSell ? filterAffiliateCookbooks(books) : [];

  return (
    <section className="mt-8" aria-labelledby="profile-cookbooks-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="profile-cookbooks-heading"
            className="text-lg font-semibold text-[var(--text)]"
          >
            {labels.heading}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {canSell ? labels.intro : labels.introProRequired}
          </p>
        </div>
        <Link
          href="/dashboard/cookbooks"
          className="shrink-0 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
        >
          {labels.manage}
        </Link>
      </div>

      {canSell && affiliateBooks.length > 0 ? (
        <ChefCookbooksSection
          books={books}
          heading={labels.heading}
          ctaLabel={labels.cta}
          className="mt-4"
          showDisclosure
          hideHeading
        />
      ) : (
        <p className="mt-4 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-relaxed text-[var(--muted)]">
          {canSell ? labels.empty : labels.emptyProRequired}
        </p>
      )}

      {canSell ? (
        <p className="mt-3 text-[length:var(--text-caption)] text-[var(--muted)]">
          <Link
            href={`/chef/${userId}`}
            className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {labels.viewPublicProfile}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
