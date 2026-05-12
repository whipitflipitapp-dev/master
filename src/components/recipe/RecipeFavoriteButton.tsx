"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";

import { toggleFavorite } from "@/app/actions/recipes";

type RecipeFavoriteButtonProps = {
  recipeId: string;
  loginNextPath: string;
  authenticated: boolean;
  initialFavored: boolean;
  /** Denormalized public count after DB trigger refresh. */
  initialCount: number;
};

type FavoriteSnapshot = {
  favored: boolean;
  count: number;
};

export function RecipeFavoriteButton({
  recipeId,
  loginNextPath,
  authenticated,
  initialFavored,
  initialCount,
}: RecipeFavoriteButtonProps) {
  const [pending, startTransition] = useTransition();
  // useOptimistic keeps the visible state in lock-step with the server props
  // (`initialFavored` / `initialCount`) once a server action settles + revalidates,
  // while letting us paint an instant optimistic flip during the in-flight call.
  // This avoids the stale-state and remount races that broke toggling for the
  // second recipe / unsave path in the previous useState + useEffect pattern.
  const [optimistic, applyOptimistic] = useOptimistic<
    FavoriteSnapshot,
    FavoriteSnapshot
  >(
    { favored: initialFavored, count: Math.max(0, initialCount) },
    (_state, next) => next,
  );

  if (!authenticated) {
    const next = `/login?next=${encodeURIComponent(loginNextPath)}`;
    return (
      <Link
        href={next}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_94%,transparent)] px-3.5 py-2 text-[length:var(--text-meta)] font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.03)] backdrop-blur-[2px] transition-colors hover:bg-[color-mix(in_srgb,var(--primary-muted)_85%,var(--card))]"
      >
        <span className="text-base leading-none text-[var(--primary)]" aria-hidden>
          ♡
        </span>
        <span className="whitespace-nowrap">Save</span>
        <span className="text-[length:var(--text-caption)] font-medium text-[var(--muted)]">
          {Math.max(0, initialCount)}
        </span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          const nextFav = !optimistic.favored;
          applyOptimistic({
            favored: nextFav,
            count: Math.max(0, optimistic.count + (nextFav ? 1 : -1)),
          });
          // When the action returns, revalidatePath rerenders the parent server
          // component with fresh `initialFavored` / `initialCount`. Once the
          // transition settles, useOptimistic reverts to that authoritative
          // base — covering both the success and error paths without manual
          // rollback bookkeeping.
          await toggleFavorite(recipeId);
        });
      }}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_94%,transparent)] px-3.5 py-2 text-[length:var(--text-meta)] font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.03)] backdrop-blur-[2px] transition-colors hover:bg-[color-mix(in_srgb,var(--primary-muted)_85%,var(--card))] disabled:opacity-55"
      aria-pressed={optimistic.favored}
      aria-label={
        optimistic.favored ? "Remove from saved recipes" : "Save recipe"
      }
    >
      <span
        className={`text-base leading-none ${optimistic.favored ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}
        aria-hidden
      >
        {optimistic.favored ? "♥" : "♡"}
      </span>
      <span className="whitespace-nowrap">
        {optimistic.favored ? "Saved" : "Save"}
      </span>
      <span className="text-[length:var(--text-caption)] font-medium text-[var(--muted)]">
        {optimistic.count}
      </span>
    </button>
  );
}
