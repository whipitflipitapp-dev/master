"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";

import {
  buildGroceryItems,
  buildGroceryListText,
  GROCERY_LIST_LOGO_PATH,
  GROCERY_LIST_TITLE,
  type GroceryListRecipe,
} from "@/lib/grocery-list";
import {
  sendGroceryListEmail,
  type SendGroceryListEmailState,
} from "@/app/actions/grocery-list";

type GroceryListBuilderProps = {
  recipes: GroceryListRecipe[];
  labels: {
    emptyTitle: string;
    emptyBody: string;
    browseRecipes: string;
    selectHeading: string;
    selectHint: string;
    previewHeading: string;
    emailHeading: string;
    emailLabel: string;
    emailPlaceholder: string;
    emailSubmit: string;
    emailSending: string;
    smsHeading: string;
    smsLabel: string;
    smsPlaceholder: string;
    smsCta: string;
    smsDisabled: string;
    smsHint: string;
  };
};

function normalizePhoneForSms(raw: string): string {
  const compact = raw.trim().replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\+/g, "")}`;
  }
  return compact.replace(/\+/g, "");
}

function isPlausiblePhone(raw: string): boolean {
  const normalized = normalizePhoneForSms(raw);
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function GroceryListBuilder({
  recipes,
  labels,
}: GroceryListBuilderProps) {
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(recipes.map((recipe) => recipe.id)),
  );
  const [phone, setPhone] = useState("");
  const [emailState, emailAction, emailPending] = useActionState<
    SendGroceryListEmailState,
    FormData
  >(sendGroceryListEmail, { error: null, success: null });

  const selectedItems = useMemo(
    () => buildGroceryItems(recipes, selectedIds),
    [recipes, selectedIds],
  );
  const smsBody = useMemo(
    () => buildGroceryListText(recipes, selectedIds, selectedItems),
    [recipes, selectedIds, selectedItems],
  );
  const normalizedPhone = normalizePhoneForSms(phone);
  const canSendSms =
    selectedIds.size > 0 && selectedItems.length > 0 && isPlausiblePhone(phone);
  const smsHref = canSendSms
    ? `sms:${normalizedPhone}?&body=${encodeURIComponent(smsBody)}`
    : undefined;

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
        <a
          href="/recipes"
          className="mt-5 inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(28,25,23,0.06)] hover:bg-[var(--primary-hover)]"
        >
          {labels.browseRecipes}
        </a>
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
                <span
                  aria-hidden
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-[var(--primary)] bg-white"
                />
                <span className="text-[0.9375rem] leading-relaxed text-[var(--text)]">
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-[var(--muted)]">
            {labels.smsDisabled}
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <form
          action={emailAction}
          className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
        >
          {Array.from(selectedIds).map((id) => (
            <input key={id} type="hidden" name="recipe_ids" value={id} />
          ))}
          <h2 className="text-lg font-semibold text-[var(--text)]">
            {labels.emailHeading}
          </h2>
          <label className="mt-4 block text-sm font-semibold text-[var(--text)]">
            {labels.emailLabel}
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={labels.emailPlaceholder}
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)]"
            />
          </label>
          {emailState.error ? (
            <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
              {emailState.error}
            </p>
          ) : null}
          {emailState.success ? (
            <p className="mt-3 text-sm font-medium text-[var(--primary)]" role="status">
              {emailState.success}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={emailPending || selectedIds.size === 0 || selectedItems.length === 0}
            className="mt-4 w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,transform] hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {emailPending ? labels.emailSending : labels.emailSubmit}
          </button>
        </form>

        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            {labels.smsHeading}
          </h2>
          <label className="mt-4 block text-sm font-semibold text-[var(--text)]">
            {labels.smsLabel}
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={labels.smsPlaceholder}
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)]"
            />
          </label>
          <p className="mt-2 text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
            {labels.smsHint}
          </p>
          {smsHref ? (
            <a
              href={smsHref}
              className="mt-4 flex w-full justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,transform] hover:bg-[var(--primary-hover)]"
            >
              {labels.smsCta}
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="mt-4 w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white opacity-60 shadow-[var(--shadow-card)]"
            >
              {labels.smsCta}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
