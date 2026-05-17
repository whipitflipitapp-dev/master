"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { excludeRecipe } from "@/app/actions/excluded-recipes";

type RecipeExcludeButtonProps = {
  recipeId: string;
  loginNextPath: string;
  authenticated: boolean;
  /** When set, navigate after a successful hide (e.g. recipe detail page). */
  redirectAfterExclude?: string;
  /** i18n label for the hide action */
  label: string;
  /** i18n label while the action is in flight */
  pendingLabel: string;
  className?: string;
};

export function RecipeExcludeButton({
  recipeId,
  loginNextPath,
  authenticated,
  redirectAfterExclude,
  label,
  pendingLabel,
  className = "",
}: RecipeExcludeButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!authenticated) {
    const next = `/login?next=${encodeURIComponent(loginNextPath)}`;
    return (
      <Link
        href={next}
        className={
          className ||
          "inline-flex items-center rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_94%,transparent)] px-3 py-2 text-[length:var(--text-caption)] font-semibold text-[var(--muted)] shadow-[0_1px_0_rgba(28,25,23,0.03)] transition-colors hover:bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))]"
        }
      >
        {label}
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
          const result = await excludeRecipe(recipeId);
          if (result.ok && redirectAfterExclude) {
            router.push(redirectAfterExclude);
            router.refresh();
          }
        });
      }}
      className={
        className ||
        "inline-flex items-center rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_94%,transparent)] px-3 py-2 text-[length:var(--text-caption)] font-semibold text-[var(--muted)] shadow-[0_1px_0_rgba(28,25,23,0.03)] transition-colors hover:border-[color-mix(in_srgb,var(--muted)_45%,var(--border))] hover:text-[var(--text)] disabled:opacity-55"
      }
      aria-label={label}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
