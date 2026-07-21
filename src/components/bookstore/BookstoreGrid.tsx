"use client";

import Link from "next/link";

import { AffiliateOutboundLink } from "@/components/affiliate/AffiliateOutboundLink";
import type { BookstoreListing } from "@/lib/bookstore";

export type BookstoreGridItem = BookstoreListing & { byChefLine: string };

type BookstoreGridProps = {
  listings: BookstoreGridItem[];
  ctaLabel: string;
  chefProfileLabel: string;
};

export function BookstoreGrid({
  listings,
  ctaLabel,
  chefProfileLabel,
}: BookstoreGridProps) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((book) => (
        <li key={book.id} className="flex flex-col">
          <AffiliateOutboundLink
            href={book.external_link}
            recipeId={null}
            linkType="bookstore_amazon"
            className="group flex flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.992] md:active:scale-100"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))]">
              {book.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- external HTTPS covers
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
            <div className="flex flex-1 flex-col p-4">
              <h2 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--text)]">
                {book.title}
              </h2>
              <p className="mt-1.5 text-[length:var(--text-caption)] text-[var(--muted)]">
                {book.byChefLine}
              </p>
              {book.description ? (
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--muted)]">
                  {book.description}
                </p>
              ) : (
                <div className="flex-1" />
              )}
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                {ctaLabel}
              </p>
            </div>
          </AffiliateOutboundLink>
          <Link
            href={`/chef/${book.chefId}`}
            className="mt-2 self-start text-[length:var(--text-caption)] font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {chefProfileLabel}
          </Link>
        </li>
      ))}
    </ul>
  );
}
