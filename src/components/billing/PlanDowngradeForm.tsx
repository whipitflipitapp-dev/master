"use client";

import { useState } from "react";

import type { PlanType } from "@/lib/plan";

type Props = {
  targetPlan: Extract<PlanType, "pro" | "free">;
  label: string;
  explanation: string;
  pendingLabel?: string;
  isPending?: boolean;
  isSignedIn: boolean;
};

type FormState = {
  error: string | null;
  success: string | null;
};

export function PlanDowngradeForm({
  targetPlan,
  label,
  explanation,
  pendingLabel,
  isPending = false,
  isSignedIn,
}: Props) {
  const [state, setState] = useState<FormState>({
    error: null,
    success: null,
  });
  const [submitting, setSubmitting] = useState(false);

  async function scheduleDowngrade() {
    if (isPending) {
      return;
    }

    setSubmitting(true);
    setState({ error: null, success: null });

    try {
      const response = await fetch("/api/billing/schedule-downgrade", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetPlan }),
      });

      const payload: {
        error?: string;
        effectiveAt?: string;
        ok?: boolean;
      } = await response.json().catch(() => ({}));

      if (!response.ok) {
        setState({
          error:
            typeof payload.error === "string" && payload.error.trim()
              ? payload.error
              : "Could not schedule the plan change. Try again in a moment.",
          success: null,
        });
        return;
      }

      setState({
        error: null,
        success:
          typeof payload.effectiveAt === "string" && payload.effectiveAt.trim()
            ? payload.effectiveAt
            : "scheduled",
      });
      window.location.reload();
    } catch {
      setState({
        error: "Network error. Check your connection and try again.",
        success: null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!isSignedIn) {
    const next = encodeURIComponent("/upgrade");
    return (
      <a
        href={`/login?next=${next}`}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-center text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-[background-color,transform] duration-200 hover:bg-[color-mix(in_srgb,var(--card)_88%,var(--text))] active:scale-[0.99]"
      >
        Sign in to manage your plan
      </a>
    );
  }

  if (isPending) {
    return (
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="w-full cursor-not-allowed rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--muted)]"
        >
          {pendingLabel ?? label}
        </button>
        <p className="text-xs text-[var(--muted)]">{explanation}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-3">
      <p className="text-xs text-[var(--muted)]">{explanation}</p>

      {state.error ? (
        <p
          className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--danger)]"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={submitting}
        onClick={() => void scheduleDowngrade()}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-[background-color,border-color,transform] duration-200 hover:border-[color-mix(in_srgb,var(--muted)_45%,var(--border))] active:scale-[0.99] disabled:opacity-60"
      >
        {submitting ? "Scheduling…" : label}
      </button>
    </div>
  );
}
