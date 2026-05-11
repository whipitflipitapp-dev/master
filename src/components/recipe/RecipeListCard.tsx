import Link from "next/link";
import type { ReactNode } from "react";

type RecipeListCardProps = {
  href: string;
  title: string;
  imageUrl?: string | null;
  meta?: ReactNode;
  trailing?: ReactNode;
  footer?: ReactNode;
};

export function RecipeListCard({
  href,
  title,
  imageUrl,
  meta,
  trailing,
  footer,
}: RecipeListCardProps) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.992] md:active:scale-100"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase URLs; avoids remotePatterns setup
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-4xl opacity-[0.35]"
            aria-hidden
          >
            🍳
          </div>
        )}
        {!trailing ? (
          <span
            className="pointer-events-none absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] text-[1.05rem] text-[var(--muted-light)] shadow-[0_1px_2px_rgba(28,25,23,0.06)] backdrop-blur-[2px]"
            aria-hidden
          >
            ♡
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 min-w-0 flex-1 text-base font-semibold leading-snug text-[var(--text)]">
            {title}
          </h3>
          {trailing ? (
            <div className="max-w-[42%] shrink-0 text-right">{trailing}</div>
          ) : null}
        </div>
        {meta ? (
          <div
            className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-medium leading-snug text-[length:var(--text-meta)] text-[var(--muted)] tracking-tight"
          >
            {meta}
          </div>
        ) : null}
        {footer ? (
          <div className="mt-2 text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
            {footer}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
