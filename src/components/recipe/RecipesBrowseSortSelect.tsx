"use client";

import { useId } from "react";

export type RecipesBrowseSortValue = "newest" | "cook_asc" | "cook_desc";

type RecipesBrowseSortOption = {
  value: RecipesBrowseSortValue;
  label: string;
};

type Props = {
  current: RecipesBrowseSortValue;
  label: string;
  options: RecipesBrowseSortOption[];
  /** Preserved across submit via hidden input so search context survives sort changes. */
  query?: string;
  /** Preserved across submit when the safe-filter is explicit/active. */
  safe?: "1";
};

/**
 * Auto-submitting native `<select>` for the /recipes browse page. Mirrors the
 * Help Me Cook carousel pattern but persists the choice through URL params so
 * the server component can re-render with the new order.
 */
export function RecipesBrowseSortSelect({
  current,
  label,
  options,
  query,
  safe,
}: Props) {
  const id = useId();
  return (
    <form
      action="/recipes"
      method="GET"
      className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2"
    >
      {query ? <input type="hidden" name="q" value={query} /> : null}
      {safe ? <input type="hidden" name="safe" value={safe} /> : null}
      <label
        htmlFor={id}
        className="text-[length:var(--text-caption)] font-medium uppercase tracking-wide text-[var(--muted-light)]"
      >
        {label}
      </label>
      <select
        id={id}
        name="sort"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 text-sm font-medium text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.03)] outline-none ring-[var(--primary)] focus:border-[color-mix(in_srgb,var(--primary)_42%,var(--border))] focus:ring-2"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
