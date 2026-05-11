export default function RecipesLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-8">
      <div className="border-b border-[var(--border)] pb-6">
        <div className="h-8 w-40 animate-pulse rounded-md bg-[color-mix(in_srgb,var(--muted)_22%,transparent)]" />
        <div className="mt-3 h-4 w-[min(100%,26rem)] max-w-full animate-pulse rounded-md bg-[color-mix(in_srgb,var(--muted)_16%,transparent)]" />
        <div className="mt-6 h-11 w-full max-w-md animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--muted)_14%,transparent)]" />
      </div>
      <ul className="grid list-none gap-4 sm:grid-cols-2 sm:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]">
            <div className="aspect-[4/3] animate-pulse bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))]" />
            <div className="space-y-2 p-4">
              <div className="h-5 w-[82%] max-w-[14rem] animate-pulse rounded bg-[color-mix(in_srgb,var(--muted)_14%,transparent)]" />
              <div className="h-4 w-full max-w-[18rem] animate-pulse rounded bg-[color-mix(in_srgb,var(--muted)_10%,transparent)]" />
              <div className="h-3 w-28 animate-pulse rounded bg-[color-mix(in_srgb,var(--muted)_8%,transparent)]" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
