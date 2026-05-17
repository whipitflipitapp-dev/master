"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  buildGroceryItems,
  buildGroceryListCsv,
  buildGroceryListText,
  GROCERY_LIST_LOGO_PATH,
  GROCERY_LIST_TITLE,
  type GroceryListRecipe,
} from "@/lib/grocery-list";
import { UpgradePitch } from "@/components/billing/UpgradePitch";
import { isProOrAbove, type PlanType } from "@/lib/plan";

type GroceryListBuilderProps = {
  recipes: GroceryListRecipe[];
  planType: PlanType;
  labels: {
    emptyTitle: string;
    emptyBody: string;
    browseRecipes: string;
    selectHeading: string;
    selectHint: string;
    previewHeading: string;
    noSelection: string;
    exportHeading: string;
    exportBody: string;
    exportLocked: string;
    exportPrint: string;
    exportText: string;
    exportCsv: string;
  };
};

function downloadTextFile(fileName: string, mimeType: string, text: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function GroceryListBuilder({
  recipes,
  planType,
  labels,
}: GroceryListBuilderProps) {
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(recipes.map((recipe) => recipe.id)),
  );

  const selectedItems = useMemo(
    () => buildGroceryItems(recipes, selectedIds),
    [recipes, selectedIds],
  );
  const textBody = useMemo(
    () => buildGroceryListText(recipes, selectedIds, selectedItems),
    [recipes, selectedIds, selectedItems],
  );
  const csvBody = useMemo(
    () => buildGroceryListCsv(recipes, selectedIds, selectedItems),
    [recipes, selectedIds, selectedItems],
  );
  const canExport = isProOrAbove(planType);
  const hasExportableList = selectedIds.size > 0 && selectedItems.length > 0;

  const toggleRecipe = (recipeId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(recipeId);
      } else {
        next.delete(recipeId);
      }
      return next;
    });
  };

  if (recipes.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-[color-mix(in_srgb,var(--muted)_35%,var(--border))] bg-[color-mix(in_srgb,var(--card)_98%,var(--bg))] px-6 py-12 text-center shadow-[var(--shadow-card)]">
        <p className="text-base font-semibold text-[var(--text)]">
          {labels.emptyTitle}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
          {labels.emptyBody}
        </p>
        <Link
          href="/recipes"
          className="mt-5 inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(28,25,23,0.06)] hover:bg-[var(--primary-hover)]"
        >
          {labels.browseRecipes}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          {labels.selectHeading}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
          {labels.selectHint}
        </p>
        <div className="mt-4 space-y-3">
          {recipes.map((recipe) => (
            <label
              key={recipe.id}
              className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)]"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(recipe.id)}
                onChange={(event) => toggleRecipe(recipe.id, event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
              />
              <span>
                <span className="block font-semibold">{recipe.title}</span>
                <span className="mt-0.5 block text-[length:var(--text-caption)] text-[var(--muted)]">
                  {recipe.ingredients.length} ingredient
                  {recipe.ingredients.length === 1 ? "" : "s"}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col items-center border-b border-[var(--border)] pb-5 text-center">
          <Image
            src={GROCERY_LIST_LOGO_PATH}
            alt=""
            width={96}
            height={96}
            className="h-20 w-20 object-contain"
          />
          <p className="mt-2 text-[length:var(--text-caption)] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {labels.previewHeading}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)]">
            {GROCERY_LIST_TITLE}
          </h2>
        </div>
        {selectedItems.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {selectedItems.map((item) => (
              <li
                key={item.key}
                className="flex gap-3 rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--bg)] px-4 py-3"
              >
                <input
                  type="checkbox"
                  aria-label={item.text}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
                />
                <span className="text-[0.9375rem] leading-relaxed text-[var(--text)]">
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-[var(--muted)]">
            {labels.noSelection}
          </p>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          {labels.exportHeading}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
          {canExport ? labels.exportBody : labels.exportLocked}
        </p>
        {canExport ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!hasExportableList}
              onClick={() => window.print()}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] disabled:opacity-60"
            >
              {labels.exportPrint}
            </button>
            <button
              type="button"
              disabled={!hasExportableList}
              onClick={() =>
                downloadTextFile(
                  "whip-it-flip-it-grocery-list.txt",
                  "text/plain;charset=utf-8",
                  textBody,
                )
              }
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] disabled:opacity-60"
            >
              {labels.exportText}
            </button>
            <button
              type="button"
              disabled={!hasExportableList}
              onClick={() =>
                downloadTextFile(
                  "whip-it-flip-it-grocery-list.csv",
                  "text/csv;charset=utf-8",
                  csvBody,
                )
              }
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] disabled:opacity-60"
            >
              {labels.exportCsv}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <UpgradePitch currentPlan={planType} compact showLogo={false} />
          </div>
        )}
      </section>
    </div>
  );
}
