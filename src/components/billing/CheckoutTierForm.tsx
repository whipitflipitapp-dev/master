"use client";

import { useId, useState, type FormEvent } from "react";

export type CheckoutTier = "pro" | "ai_chef";

type Props = {
  tier: CheckoutTier;
  monthlyLabel: string;
  yearlyLabel: string;
  isCurrent?: boolean;
  isSignedIn: boolean;
  ctaLabel?: string;
};

type CheckoutFormState = {
  error: string | null;
};

export function CheckoutTierForm({
  tier,
  monthlyLabel,
  yearlyLabel,
  isCurrent = false,
  isSignedIn,
  ctaLabel,
}: Props) {
  const intervalId = useId();
  const [state, setState] = useState<CheckoutFormState>({ error: null });
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({ error: null });

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      const payload: { url?: string; error?: string } = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setState({
          error:
            typeof payload.error === "string" && payload.error.trim()
              ? payload.error
              : "Could not start checkout. Try again in a moment.",
        });
        return;
      }

      if (typeof payload.url === "string" && payload.url.trim()) {
        window.location.replace(payload.url);
        return;
      }

      setState({ error: "Stripe did not return a checkout URL." });
    } catch {
      setState({
        error: "Network error. Check your connection and try again.",
      });
    } finally {
      setPending(false);
    }
  }

  if (!isSignedIn) {
    const next = encodeURIComponent("/upgrade");
    return (
      <a
        href={`/login?next=${next}`}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-center text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99]"
      >
        Sign in to upgrade
      </a>
    );
  }

  if (isCurrent) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="mt-5 w-full cursor-not-allowed rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--muted)]"
      >
        Current plan
      </button>
    );
  }

  return (
    <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
      <input type="hidden" name="tier" value={tier} />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-[length:var(--text-meta)] font-medium text-[var(--text)]">
          Billing
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <label
            htmlFor={`${intervalId}-monthly`}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[var(--shadow-card)] transition-[border-color] has-[input:checked]:border-[color-mix(in_srgb,var(--primary)_55%,var(--border))]"
          >
            <span className="flex items-center gap-2">
              <input
                id={`${intervalId}-monthly`}
                type="radio"
                name="interval"
                value="monthly"
                defaultChecked
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span className="font-medium">Monthly</span>
            </span>
            <span className="text-[length:var(--text-meta)] text-[var(--muted)]">
              {monthlyLabel}
            </span>
          </label>
          <label
            htmlFor={`${intervalId}-yearly`}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[var(--shadow-card)] transition-[border-color] has-[input:checked]:border-[color-mix(in_srgb,var(--primary)_55%,var(--border))]"
          >
            <span className="flex items-center gap-2">
              <input
                id={`${intervalId}-yearly`}
                type="radio"
                name="interval"
                value="yearly"
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span className="font-medium">Yearly</span>
            </span>
            <span className="text-[length:var(--text-meta)] text-[var(--muted)]">
              {yearlyLabel}
            </span>
          </label>
        </div>
      </fieldset>

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
        className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Redirecting to Stripe…" : (ctaLabel ?? "Continue to checkout")}
      </button>
    </form>
  );
}
