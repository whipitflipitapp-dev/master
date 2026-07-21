/** Short FTC-style affiliate notice for outbound product links. */
export function AffiliateDisclosure({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)] ${className}`}
      role="note"
    >
      When you purchase through links on Whip It Flip It, we may earn a commission.
      Prices are set by sellers; your price is not affected by using these links.
    </p>
  );
}
