"use client";

import { type ReactNode, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { syncPantryFromCommaString } from "@/app/actions/pantry";
import { mergeIngredientTokens, parseIngredientInput } from "@/lib/ingredients";
import type { GenericPantryTokenHint } from "@/lib/pantry-ingredient-resolve";

export type HelpMeCookPantryProps = {
  loggedIn: boolean;
  pantryItems: string[];
  /** Raw `q` search param — merged with pantry for defaults and checkbox reset. */
  urlQRaw: string;
  /** Controlled default for textarea after navigation. */
  initialTextarea: string;
  initialPantryOnly: boolean;
  matchError?: string | null;
  /** Tokens with no DB ingredient row; matching used only resolved tokens. */
  unmatchedTokens?: string[];
  /** Broad tokens — suggest specific catalog names. */
  genericTokenHints?: GenericPantryTokenHint[];
  allergyNote?: string | null;
  /** Rendered after the Find Matches submit control (e.g. upsell). */
  afterFindMatches?: ReactNode;
  children?: ReactNode;
};

function joinedFromTokens(tokens: string[]): string {
  return tokens.join(", ");
}

export function HelpMeCookPantry(props: HelpMeCookPantryProps) {
  const { t } = useTranslation("common");
  const {
    loggedIn,
    pantryItems,
    urlQRaw,
    initialTextarea,
    initialPantryOnly,
    matchError,
    unmatchedTokens,
    genericTokenHints,
    allergyNote,
    afterFindMatches = null,
    children = null,
  } = props;

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savePending, startSave] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [pantryOnly, setPantryOnly] = useState(initialPantryOnly);
  const [text, setText] = useState(initialTextarea);

  const handleFindMatches = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const qValue = String(fd.get("q") ?? "").trim();
    const parsedPantry = parseIngredientInput(pantryItems.join("\n"));
    const parsedForm = parseIngredientInput(qValue);
    const tokens = mergeIngredientTokens(parsedPantry, parsedForm);
    const qOut = joinedFromTokens(tokens);
    const params = new URLSearchParams();
    if (qOut) params.set("q", qOut);
    if (pantryOnly) params.set("pantry_only", "1");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/help-me-cook?${qs}` : "/help-me-cook");
    });
  };

  const handleSavePantry = () => {
    setSaveMessage(null);
    setSaveError(null);
    startSave(async () => {
      const res = await syncPantryFromCommaString(text);
      if (!res.ok) {
        setSaveError(res.error ?? t("help_cook_pantry_save_error"));
        return;
      }
      setSaveMessage(t("help_cook_pantry_saved"));
      router.refresh();
    });
  };

  const readOnlyTextarea = loggedIn && pantryOnly;

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleFindMatches} className="flex flex-col gap-3">
        <label className="text-sm font-medium text-[var(--text)]" htmlFor="q">
          {t("help_cook_ingredients_label")}
        </label>
        <textarea
          id="q"
          name="q"
          rows={5}
          readOnly={readOnlyTextarea}
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          placeholder={t("help_cook_ingredients_placeholder")}
          className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] shadow-[var(--shadow-card)] outline-none ring-[var(--primary)]/25 focus:ring-2 read-only:opacity-90"
        />

        {loggedIn ? (
          <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-[var(--border)]"
              checked={pantryOnly}
              onChange={(ev) => {
                const on = ev.target.checked;
                setPantryOnly(on);
                if (on) {
                  const p = parseIngredientInput(pantryItems.join("\n"));
                  const fromUrl = parseIngredientInput(urlQRaw);
                  setText(joinedFromTokens(mergeIngredientTokens(p, fromUrl)));
                }
              }}
            />
            <span>{t("help_cook_pantry_only_hint")}</span>
          </label>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-card)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? t("help_cook_find_pending") : t("help_cook_find_matches")}
        </button>
      </form>

      {afterFindMatches}

      {loggedIn ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleSavePantry}
            disabled={savePending}
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color-mix(in_srgb,var(--card)_94%,var(--text))] disabled:opacity-60"
          >
            {savePending ? t("help_cook_save_pending") : t("help_cook_save_pantry")}
          </button>
          {saveMessage ? (
            <p className="text-xs text-[var(--success)]">{saveMessage}</p>
          ) : null}
          {saveError ? (
            <p className="text-xs text-[var(--danger)]" role="alert">
              {saveError}
            </p>
          ) : null}
        </div>
      ) : null}

      {allergyNote ? (
        <p className="text-xs text-[var(--muted)]">{allergyNote}</p>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          {t("help_cook_sign_in_allergies")}
        </p>
      )}

      {matchError ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {matchError}
        </p>
      ) : null}

      {unmatchedTokens?.length ? (
        <p className="text-sm text-[var(--muted)]" role="status">
          {t("help_cook_unmatched_tokens", {
            tokens: unmatchedTokens.join(", "),
          })}
        </p>
      ) : null}

      {genericTokenHints?.length ? (
        <ul className="flex flex-col gap-2" role="status">
          {genericTokenHints.map((hint) => (
            <li
              key={hint.token}
              className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))] px-3 py-2 text-sm text-[var(--text)]"
            >
              <p>{t("pantry_generic_hint", { token: hint.token })}</p>
              {hint.examples.length > 0 ? (
                <p className="mt-1 text-[var(--muted)]">
                  {t("pantry_generic_examples", {
                    examples: hint.examples.join(", "),
                  })}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {children}
    </div>
  );
}
