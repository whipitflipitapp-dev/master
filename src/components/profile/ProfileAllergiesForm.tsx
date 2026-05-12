"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { saveUserAllergies } from "@/app/actions/profile";
import type { AllergyMode } from "@/lib/profile";

export function ProfileAllergiesForm({
  allergens,
  selectedIds,
  defaultAllergyMode,
  onSaved,
  submitLabel = "Save allergies",
  submitPendingLabel = "Saving…",
  formClassName = "mt-4 flex flex-col gap-4",
  otherSection,
}: {
  allergens: { id: string; name: string }[];
  selectedIds: string[];
  defaultAllergyMode: AllergyMode;
  onSaved?: () => void;
  submitLabel?: string;
  submitPendingLabel?: string;
  /** Override default top margin when nested (e.g. onboarding hero layout). */
  formClassName?: string;
  /** Profile page: free-text allergens + disclaimer (omit during onboarding). */
  otherSection?: {
    defaultText: string;
    legend: string;
    checkboxLabel: string;
    placeholder: string;
    disclaimerTitle: string;
    disclaimerBody: string;
  };
}) {
  const selectedSet = new Set(selectedIds);
  const prevPending = useRef(false);
  const allergyModeLabelId = useId();
  const [otherAllergenOpen, setOtherAllergenOpen] = useState(
    () => Boolean(otherSection?.defaultText.trim()),
  );

  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) =>
      saveUserAllergies(formData),
    { error: null as string | null },
  );

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      onSaved?.();
    }
    prevPending.current = pending;
  }, [pending, state.error, onSaved]);

  return (
    <form className={formClassName} action={formAction}>
      <fieldset
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]"
        aria-labelledby={allergyModeLabelId}
      >
        <p
          id={allergyModeLabelId}
          className="mb-2 text-sm font-medium text-[var(--text)]"
        >
          When recipes match your allergens
        </p>
        <p className="mb-3 text-[length:var(--text-caption)] text-[var(--muted)]">
          Strict hides those recipes in Help Me Cook (and recipe browse when the safe filter is on).
          Warn still lists them with a visible warning.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--text)]">
            <input
              type="radio"
              name="allergy_mode"
              value="strict"
              defaultChecked={defaultAllergyMode === "strict"}
            />
            <span>
              <span className="font-medium">Strict</span>
              <span className="block text-[length:var(--text-caption)] text-[var(--muted)]">
                Exclude from matched lists
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--text)]">
            <input
              type="radio"
              name="allergy_mode"
              value="warn"
              defaultChecked={defaultAllergyMode === "warn"}
            />
            <span>
              <span className="font-medium">Warn</span>
              <span className="block text-[length:var(--text-caption)] text-[var(--muted)]">
                Show matches with a warning badge
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:grid-cols-2">
        {allergens.map((a) => (
          <label
            key={a.id}
            className="flex items-center gap-2 text-sm text-[var(--text)]"
          >
            <input
              type="checkbox"
              name="allergen_id"
              value={a.id}
              defaultChecked={selectedSet.has(a.id)}
            />
            <span>{a.name}</span>
          </label>
        ))}
      </div>

      {otherSection ? (
        <>
          <input type="hidden" name="allergy_other_section" value="1" />
          <fieldset className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
            <legend className="px-1 text-sm font-medium text-[var(--text)]">
              {otherSection.legend}
            </legend>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                name="allergy_other_check"
                value="1"
                checked={otherAllergenOpen}
                onChange={(e) => setOtherAllergenOpen(e.target.checked)}
              />
              <span>{otherSection.checkboxLabel}</span>
            </label>
            {otherAllergenOpen ? (
              <textarea
                name="allergy_other"
                rows={3}
                maxLength={500}
                defaultValue={otherSection.defaultText}
                placeholder={otherSection.placeholder}
                className="mt-3 min-h-[72px] w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-[border-color] focus:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]"
              />
            ) : null}
          </fieldset>

          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_6%,var(--card))] p-4 text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
            <p className="font-semibold text-[var(--text)]">
              {otherSection.disclaimerTitle}
            </p>
            <p className="mt-1.5">{otherSection.disclaimerBody}</p>
          </div>
        </>
      ) : null}

      {state.error ? (
        <p
          className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--danger)]"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-card)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? submitPendingLabel : submitLabel}
      </button>
    </form>
  );
}
