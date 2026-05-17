"use client";

import Image from "next/image";
import Link from "next/link";

import type { WhippedRecipeListItem } from "@/app/actions/recipe-experiences";

type ProfileWhippedRecipesProps = {
  items: WhippedRecipeListItem[];
  emptyLabel: string;
  locale: string;
  labels: {
    madeYes: string;
    madeNo: string;
    rating: string;
    ratingNone: string;
    spent: string;
    spentNone: string;
    recorded: string;
    updated: string;
  };
};

function formatUsd(cents: number | null): string {
  if (cents == null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatHistoryDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export function ProfileWhippedRecipes({
  items,
  emptyLabel,
  locale,
  labels,
}: ProfileWhippedRecipesProps) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-[var(--muted)]">{emptyLabel}</p>;
  }

  return (
    <ul className="mt-4 list-none space-y-3">
      {items.map((item) => (
        <li key={item.recipeId}>
          <Link
            href={`/recipes/${item.recipeId}`}
            className="flex gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-card)] transition-[border-color,transform] duration-200 hover:border-[color-mix(in_srgb,var(--muted)_45%,var(--border))] active:scale-[0.99]"
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
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--text)]">
                {item.title}
              </span>
              <span className="mt-1 block text-[length:var(--text-caption)] text-[var(--muted)]">
                {labels.updated.replace(
                  "{{date}}",
                  formatHistoryDate(item.updatedAt, locale),
                )}
                {item.createdAt !== item.updatedAt ? (
                  <>
                    {" · "}
                    {labels.recorded.replace(
                      "{{date}}",
                      formatHistoryDate(item.createdAt, locale),
                    )}
                  </>
                ) : null}
              </span>
              <span className="mt-1 block text-[length:var(--text-caption)] text-[var(--muted)]">
                {item.madeRecipe ? labels.madeYes : labels.madeNo}
                {" · "}
                {item.rating != null
                  ? labels.rating.replace("{{rating}}", String(item.rating))
                  : labels.ratingNone}
                {" · "}
                {item.spentCents != null
                  ? labels.spent.replace(
                      "{{amount}}",
                      formatUsd(item.spentCents),
                    )
                  : labels.spentNone}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
