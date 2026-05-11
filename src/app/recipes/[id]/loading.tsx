export default function RecipeDetailLoading() {
  return (
    <article className="mx-auto w-full max-w-2xl flex-1 animate-pulse px-5 py-8">
      <div className="relative aspect-[16/10] w-full rounded-2xl bg-[color-mix(in_srgb,var(--muted)_14%,transparent)]" />
      <div className="mt-8 h-10 w-[min(100%,28rem)] rounded-lg bg-[color-mix(in_srgb,var(--muted)_14%,transparent)]" />
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="h-9 w-[7.25rem] rounded-xl bg-[color-mix(in_srgb,var(--muted)_11%,transparent)]" />
        <div className="h-9 w-[5rem] rounded bg-[color-mix(in_srgb,var(--muted)_9%,transparent)]" />
      </div>
      <div className="mt-10 space-y-3">
        <div className="h-7 w-32 rounded-md bg-[color-mix(in_srgb,var(--muted)_12%,transparent)]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-lg bg-[color-mix(in_srgb,var(--muted)_8%,transparent)]"
          />
        ))}
      </div>
      <div className="mt-12 space-y-2">
        <div className="h-7 w-36 rounded-md bg-[color-mix(in_srgb,var(--muted)_12%,transparent)]" />
        <div className="h-24 rounded-lg bg-[color-mix(in_srgb,var(--muted)_8%,transparent)]" />
      </div>
      <div className="mt-14 h-4 w-40 rounded bg-[color-mix(in_srgb,var(--muted)_8%,transparent)]" />
    </article>
  );
}
