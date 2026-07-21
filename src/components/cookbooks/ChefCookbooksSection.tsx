import { AffiliateOutboundLink } from "@/components/affiliate/AffiliateOutboundLink";
import { isAmazonAffiliateProductUrl } from "@/lib/amazon-affiliate-url";

export type ChefCookbookPublic = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  external_link: string | null;
};

export function filterAffiliateCookbooks(
  rows: ChefCookbookPublic[],
): Array<ChefCookbookPublic & { external_link: string }> {
  const out: Array<ChefCookbookPublic & { external_link: string }> = [];
  for (const row of rows) {
    const link = row.external_link?.trim();
    if (link && isAmazonAffiliateProductUrl(link)) {
      out.push({ ...row, external_link: link });
    }
  }
  return out;
}

function CookbookCardInner({
  book,
  ctaLabel,
}: {
  book: ChefCookbookPublic;
  ctaLabel: string;
}) {
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
          {ctaLabel}
        </p>
      </div>
    </>
  );
}

type ChefCookbooksSectionProps = {
  books: ChefCookbookPublic[];
  heading: string;
  intro?: string;
  ctaLabel: string;
  /** When set, affiliate clicks are attributed to this recipe. */
  recipeId?: string | null;
  className?: string;
  showDisclosure?: boolean;
  /** Footnote shown with a * on the heading (e.g. platform commission on cookbook sales). */
  affiliateFootnote?: string;
  /** When false, footnote still shows but * is omitted (e.g. parent supplies the heading). */
  affiliateMarkOnHeading?: boolean;
  hideHeading?: boolean;
  emptyMessage?: string;
};

const COOKBOOK_AFFILIATE_FOOTNOTE_ID = "cookbook-affiliate-footnote";

export function ChefCookbooksSection({
  books,
  heading,
  intro,
  ctaLabel,
  recipeId = null,
  className = "mt-8",
  showDisclosure = true,
  affiliateFootnote,
  affiliateMarkOnHeading = true,
  hideHeading = false,
  emptyMessage,
}: ChefCookbooksSectionProps) {
  const affiliateBooks = filterAffiliateCookbooks(books);

  const showAffiliateNote =
    showDisclosure && Boolean(affiliateFootnote?.trim());
  const showAffiliateMark = showAffiliateNote && affiliateMarkOnHeading;

  function headingWithMark(text: string) {
    if (!showAffiliateMark) {
      return text;
    }
    return (
      <>
        {text}
        <sup
          className="ml-0.5 text-[0.65em] font-normal text-[var(--muted)]"
          aria-hidden
        >
          *
        </sup>
      </>
    );
  }

  function affiliateNote() {
    if (!showAffiliateNote || !affiliateFootnote) {
      return null;
    }
    return (
      <p
        id={COOKBOOK_AFFILIATE_FOOTNOTE_ID}
        className="mt-3 text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]"
        role="note"
      >
        {affiliateFootnote}
      </p>
    );
  }

  if (affiliateBooks.length === 0) {
    if (!emptyMessage) {
      return null;
    }
    return (
      <section className={className} aria-labelledby="chef-cookbooks-heading">
        {hideHeading ? (
          <h2 id="chef-cookbooks-heading" className="sr-only">
            {heading || "Cookbooks"}
          </h2>
        ) : (
          <h2
            id="chef-cookbooks-heading"
            className="text-xl font-semibold tracking-tight text-[var(--text)]"
            aria-describedby={
              showAffiliateMark ? COOKBOOK_AFFILIATE_FOOTNOTE_ID : undefined
            }
          >
            {headingWithMark(heading)}
          </h2>
        )}
        {intro ? (
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{intro}</p>
        ) : null}
        {affiliateNote()}
        <p className="mt-4 text-sm text-[var(--muted)]">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className={className} aria-labelledby="chef-cookbooks-heading">
      {hideHeading ? (
        <h2 id="chef-cookbooks-heading" className="sr-only">
          {heading || "Cookbooks"}
        </h2>
      ) : (
        <h2
          id="chef-cookbooks-heading"
          className="text-xl font-semibold tracking-tight text-[var(--text)]"
          aria-describedby={
            showAffiliateMark ? COOKBOOK_AFFILIATE_FOOTNOTE_ID : undefined
          }
        >
          {headingWithMark(heading)}
        </h2>
      )}
      {intro ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{intro}</p>
      ) : null}
      {affiliateNote()}
      <ul className="mt-6 grid gap-5 sm:grid-cols-2">
        {affiliateBooks.map((book) => (
          <li key={book.id}>
            <AffiliateOutboundLink
              href={book.external_link}
              recipeId={recipeId}
              linkType="cookbook_amazon"
              className="group block overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.992] md:active:scale-100"
            >
              <CookbookCardInner book={book} ctaLabel={ctaLabel} />
            </AffiliateOutboundLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
