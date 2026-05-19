"use client";

import { useActionState, useEffect, useState } from "react";

import { submitSuggestion } from "@/app/actions/suggestions";
import {
  SUGGESTION_MAX_LENGTH,
  type SubmitSuggestionErrorCode,
  type SubmitSuggestionState,
} from "@/lib/suggestions";

type SuggestionBoxLabels = {
  title: string;
  subtitle: string;
  label: string;
  placeholder: string;
  counter: string;
  submit: string;
  submitting: string;
  success: string;
  errors: Record<SubmitSuggestionErrorCode, string>;
};

const INITIAL_STATE: SubmitSuggestionState = {
  ok: false,
  errorCode: null,
};

export function SuggestionBox({ labels }: { labels: SuggestionBoxLabels }) {
  const [text, setText] = useState("");
  const [state, formAction, pending] = useActionState(
    submitSuggestion,
    INITIAL_STATE,
  );
  const trimmedLength = text.trim().length;

  useEffect(() => {
    if (state.ok) {
      setText("");
    }
  }, [state.ok]);

  return (
    <section
      className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
      aria-labelledby="dashboard-suggestion-box-heading"
    >
      <h2
        id="dashboard-suggestion-box-heading"
        className="text-xl font-semibold tracking-tight text-[var(--text)]"
      >
        {labels.title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
        {labels.subtitle}
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="dashboard-suggestion"
              className="text-sm font-medium text-[var(--text)]"
            >
              {labels.label}
            </label>
            <span className="text-[length:var(--text-caption)] text-[var(--muted)]">
              {labels.counter.replace("{{count}}", String(text.length))}
            </span>
          </div>
          <textarea
            id="dashboard-suggestion"
            name="suggestion"
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            maxLength={SUGGESTION_MAX_LENGTH}
            rows={4}
            placeholder={labels.placeholder}
            className="min-h-28 w-full resize-y rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[var(--shadow-card)] outline-none transition-[border-color] placeholder:text-[color-mix(in_srgb,var(--muted)_72%,transparent)] focus:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]"
          />
        </div>

        {state.errorCode ? (
          <p className="text-xs font-medium text-[var(--danger)]" role="alert">
            {labels.errors[state.errorCode]}
          </p>
        ) : null}
        {state.ok && !text ? (
          <p className="text-xs font-medium text-[var(--success)]" role="status">
            {labels.success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || trimmedLength === 0}
          className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-[background-color,border-color,transform] duration-200 hover:border-[color-mix(in_srgb,var(--muted)_45%,var(--border))] active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? labels.submitting : labels.submit}
        </button>
      </form>
    </section>
  );
}
