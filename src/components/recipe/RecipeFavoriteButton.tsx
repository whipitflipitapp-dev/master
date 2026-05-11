"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { toggleFavorite } from "@/app/actions/recipes";

type RecipeFavoriteButtonProps = {
  recipeId: string;
  loginNextPath: string;
  authenticated: boolean;
  initialFavored: boolean;
  /** Denormalized public count after DB trigger refresh. */
  initialCount: number;
};

export function RecipeFavoriteButton({
  recipeId,
  loginNextPath,
  authenticated,
  initialFavored,
  initialCount,
}: RecipeFavoriteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [favored, setFavored] = useState(initialFavored);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setFavored(initialFavored);
    setCount(initialCount);
  }, [recipeId, initialFavored, initialCount]);

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
          {count}
        </span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const prevFav = favored;
          const prevCount = count;
          const nextFav = !prevFav;
          setFavored(nextFav);
          setCount(Math.max(0, prevCount + (nextFav ? 1 : -1)));

          const res = await toggleFavorite(recipeId);
          if (!res.ok) {
            setFavored(prevFav);
            setCount(prevCount);
            return;
          }
          router.refresh();
        });
      }}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_94%,transparent)] px-3.5 py-2 text-[length:var(--text-meta)] font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.03)] backdrop-blur-[2px] transition-colors hover:bg-[color-mix(in_srgb,var(--primary-muted)_85%,var(--card))] disabled:opacity-55"
      aria-pressed={favored}
      aria-label={favored ? "Remove from saved recipes" : "Save recipe"}
    >
      <span
        className={`text-base leading-none ${favored ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}
        aria-hidden
      >
        {favored ? "♥" : "♡"}
      </span>
      <span className="whitespace-nowrap">{favored ? "Saved" : "Save"}</span>
      <span className="text-[length:var(--text-caption)] font-medium text-[var(--muted)]">
        {count}
      </span>
    </button>
  );
}
