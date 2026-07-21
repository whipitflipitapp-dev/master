import type { CookbookPickOption } from "@/lib/featured-cookbook";

type FeaturedCookbookFieldProps = {
  cookbooks: CookbookPickOption[];
  defaultValue?: string | null;
  label: string;
  hint: string;
  noneLabel: string;
  manageHref: string;
  manageLabel: string;
  emptyHint: string;
};

export function FeaturedCookbookField({
  cookbooks,
  defaultValue,
  label,
  hint,
  noneLabel,
  manageHref,
  manageLabel,
  emptyHint,
}: FeaturedCookbookFieldProps) {
  if (cookbooks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-4">
        <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
          {emptyHint}
        </p>
        <a
          href={manageHref}
          className="mt-3 inline-flex text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
        >
          {manageLabel}
        </a>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="featured_cookbook_id"
        className="block text-sm font-semibold text-[var(--text)]"
      >
        {label}
      </label>
      <p className="mt-1 text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
        {hint}
      </p>
      <select
        id="featured_cookbook_id"
        name="featured_cookbook_id"
        defaultValue={defaultValue ?? "none"}
        className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)]"
      >
        <option value="none">{noneLabel}</option>
        {cookbooks.map((book) => (
          <option key={book.id} value={book.id}>
            {book.title}
          </option>
        ))}
      </select>
      <p className="mt-2 text-[length:var(--text-caption)] text-[var(--muted)]">
        <a
          href={manageHref}
          className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
        >
          {manageLabel}
        </a>
      </p>
    </div>
  );
}
