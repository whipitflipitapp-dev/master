"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";

import {
  buildGroceryItems,
  buildGroceryListCsv,
  buildGroceryListText,
  GROCERY_LIST_LOGO_PATH,
  GROCERY_LIST_TITLE,
  type GroceryListItem,
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
    addHeading: string;
    addHint: string;
    customNameLabel: string;
    customNamePlaceholder: string;
    customQuantityLabel: string;
    customQuantityPlaceholder: string;
    customNotesLabel: string;
    customNotesPlaceholder: string;
    customSubmit: string;
    customNameRequired: string;
    customRemove: string;
  };
};

type CustomGroceryItem = {
  id: string;
  name: string;
  quantity: string;
  notes: string;
};

type GroceryListDisplayItem = GroceryListItem & {
  customId?: string;
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

function customItemText(item: CustomGroceryItem): string {
  const details = [item.quantity, item.notes].filter(Boolean);
  return details.length > 0 ? `${item.name} - ${details.join("; ")}` : item.name;
}

function createCustomItemId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function GroceryListBuilder({
  recipes,
  planType,
  labels,
}: GroceryListBuilderProps) {
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(recipes.map((recipe) => recipe.id)),
  );
  const [customItems, setCustomItems] = useState<CustomGroceryItem[]>([]);
  const [customName, setCustomName] = useState("");
  const [customQuantity, setCustomQuantity] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const selectedItems = useMemo(
    () => buildGroceryItems(recipes, selectedIds),
    [recipes, selectedIds],
  );
  const customGroceryItems = useMemo<GroceryListDisplayItem[]>(
    () =>
      customItems.map((item) => ({
        key: `custom-${item.id}`,
        name: item.name,
        notes: [item.quantity, item.notes].filter(Boolean),
        text: customItemText(item),
        customId: item.id,
      })),
    [customItems],
  );
  const groceryItems = useMemo<GroceryListDisplayItem[]>(
    () => [...selectedItems, ...customGroceryItems],
    [selectedItems, customGroceryItems],
  );
  const textBody = useMemo(
    () => buildGroceryListText(recipes, selectedIds, groceryItems),
    [recipes, selectedIds, groceryItems],
  );
  const csvBody = useMemo(
    () => buildGroceryListCsv(recipes, selectedIds, groceryItems),
    [recipes, selectedIds, groceryItems],
  );
  const canExport = isProOrAbove(planType);
  const hasExportableList = groceryItems.length > 0;

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

  const addCustomItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = customName.trim();
    if (!name) {
      setCustomError(labels.customNameRequired);
      return;
    }

    setCustomItems((prev) => [
      ...prev,
      {
        id: createCustomItemId(),
        name,
        quantity: customQuantity.trim(),
        notes: customNotes.trim(),
      },
    ]);
    setCustomName("");
    setCustomQuantity("");
    setCustomNotes("");
    setCustomError(null);
  };

  const removeCustomItem = (itemId: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  return (
    <div className="space-y-6">
      {recipes.length === 0 ? (
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
      ) : (
        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            {labels.selectHeading}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
            {labels.selectHint}
          </p>
          <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto overscroll-contain pr-1">
            {recipes.map((recipe) => (
              <label
                key={recipe.id}
                className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)]"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(recipe.id)}
                  onChange={(event) =>
                    toggleRecipe(recipe.id, event.target.checked)
                  }
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
      )}

      <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          {labels.addHeading}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
          {labels.addHint}
        </p>
        <form className="mt-4 space-y-4" onSubmit={addCustomItem}>
          <div>
            <label
              htmlFor="custom-grocery-item-name"
              className="text-sm font-semibold text-[var(--text)]"
            >
              {labels.customNameLabel}
            </label>
            <input
              id="custom-grocery-item-name"
              type="text"
              value={customName}
              onChange={(event) => {
                setCustomName(event.target.value);
                if (customError) setCustomError(null);
              }}
              placeholder={labels.customNamePlaceholder}
              aria-invalid={customError ? "true" : undefined}
              aria-describedby={customError ? "custom-grocery-item-error" : undefined}
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]"
            />
            {customError ? (
              <p
                id="custom-grocery-item-error"
                className="mt-1.5 text-sm text-[var(--danger)]"
                role="alert"
              >
                {customError}
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="custom-grocery-item-quantity"
                className="text-sm font-semibold text-[var(--text)]"
              >
                {labels.customQuantityLabel}
              </label>
              <input
                id="custom-grocery-item-quantity"
                type="text"
                value={customQuantity}
                onChange={(event) => setCustomQuantity(event.target.value)}
                placeholder={labels.customQuantityPlaceholder}
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]"
              />
            </div>
            <div>
              <label
                htmlFor="custom-grocery-item-notes"
                className="text-sm font-semibold text-[var(--text)]"
              >
                {labels.customNotesLabel}
              </label>
              <input
                id="custom-grocery-item-notes"
                type="text"
                value={customNotes}
                onChange={(event) => setCustomNotes(event.target.value)}
                placeholder={labels.customNotesPlaceholder}
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(28,25,23,0.06)] hover:bg-[var(--primary-hover)] sm:w-auto"
          >
            {labels.customSubmit}
          </button>
        </form>
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
        {groceryItems.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {groceryItems.map((item) => {
              const customId = item.customId;
              return (
                <li
                  key={item.key}
                  className="flex gap-3 rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--bg)] px-4 py-3"
                >
                  <input
                    type="checkbox"
                    aria-label={item.text}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 text-[0.9375rem] leading-relaxed text-[var(--text)]">
                    {item.text}
                  </span>
                  {customId ? (
                    <button
                      type="button"
                      onClick={() => removeCustomItem(customId)}
                      aria-label={`${labels.customRemove} ${item.name}`}
                      className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] hover:border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] hover:text-[var(--danger)]"
                    >
                      {labels.customRemove}
                    </button>
                  ) : null}
                </li>
              );
            })}
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
