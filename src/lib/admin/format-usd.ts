/** USD cents → display string for admin dashboards. */
export function formatUsdFromCents(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: safe % 100 === 0 ? 0 : 2,
  }).format(safe / 100);
}

export function formatUsdFromCentsCompact(cents: number): string {
  const safe = Number.isFinite(cents) ? cents / 100 : 0;
  if (Math.abs(safe) >= 1_000_000) {
    return `$${(safe / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(safe) >= 10_000) {
    return `$${(safe / 1_000).toFixed(1)}k`;
  }
  return formatUsdFromCents(Number.isFinite(cents) ? cents : 0);
}
