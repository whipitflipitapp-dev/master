import Link from "next/link";

import type { RecipeCategory } from "@/lib/recipe-categories";

type CategoryOption = {
  value: RecipeCategory;
  label: string;
};

type Props = {
  /** Accessible name for the filter group. */
  ariaLabel: string;
  /** Section heading above the chips. */
  heading: string;
  allLabel: string;
  active: RecipeCategory | null;
  options: CategoryOption[];
  query?: string;
  safe?: "1";
  sort?: string;
};

function buildRecipesHref(
  category: RecipeCategory | null,
  opts: { query?: string; safe?: "1"; sort?: string },
): string {
  const params = new URLSearchParams();
  if (opts.query?.trim()) params.set("q", opts.query.trim());
  if (opts.safe) params.set("safe", opts.safe);
  if (opts.sort && opts.sort !== "newest") params.set("sort", opts.sort);
  if (category) params.set("category", category);
  const qs = params.toString();
  return qs.length > 0 ? `/recipes?${qs}` : "/recipes";
}

export function RecipesBrowseCategoryChips({
  ariaLabel,
  heading,
  allLabel,
  active,
  options,
  query,
  safe,
  sort,
}: Props) {
  const preserve = { query, safe, sort };

  return (
    <nav
      className="mt-4"
      aria-label={ariaLabel}
    >
      <p className="mb-2 text-[length:var(--text-caption)] font-medium uppercase tracking-wide text-[var(--muted-light)]">
        {heading}
      </p>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <Link
          href={buildRecipesHref(null, preserve)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            active === null
              ? "border-[color-mix(in_srgb,var(--primary)_45%,var(--border))] bg-[var(--primary-muted)] text-[var(--primary)]"
              : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
          }`}
          aria-current={active === null ? "true" : undefined}
        >
          {allLabel}
        </Link>
        {options.map((o) => {
          const isActive = active === o.value;
          return (
            <Link
              key={o.value}
              href={buildRecipesHref(isActive ? null : o.value, preserve)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-[color-mix(in_srgb,var(--primary)_45%,var(--border))] bg-[var(--primary-muted)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
              }`}
              aria-current={isActive ? "true" : undefined}
            >
              {o.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
