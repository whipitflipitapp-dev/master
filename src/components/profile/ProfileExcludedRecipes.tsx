"use client";

import Link from "next/link";
import Image from "next/image";
import { useTransition } from "react";

import { includeRecipe, type ExcludedRecipeListItem } from "@/app/actions/excluded-recipes";

type ProfileExcludedRecipesProps = {
  items: ExcludedRecipeListItem[];
  includeLabel: string;
  includingLabel: string;
  emptyLabel: string;
};

export function ProfileExcludedRecipes({
  items,
  includeLabel,
  includingLabel,
  emptyLabel,
}: ProfileExcludedRecipesProps) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="mt-3 text-sm text-[var(--muted)]">{emptyLabel}</p>
    );
  }

  return (
    <ul className="mt-4 list-none space-y-3">
      {items.map((item) => (
        <li
          key={item.recipeId}
          className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-card)]"
        >
          <Link
            href={`/recipes/${item.recipeId}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--muted)_18%,var(--card))]">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center text-lg text-[var(--muted)]"
                  aria-hidden
                >
                  ·
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--text)]">
                {item.title}
              </span>
            </span>
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await includeRecipe(item.recipeId);
              });
            }}
            className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[length:var(--text-caption)] font-semibold text-[var(--text)] transition-colors hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] disabled:opacity-55"
          >
            {pending ? includingLabel : includeLabel}
          </button>
        </li>
      ))}
    </ul>
  );
}
