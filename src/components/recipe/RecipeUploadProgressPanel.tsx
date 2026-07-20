"use client";

type RecipeUploadProgressPanelProps = {
  title: string;
  phaseLabel: string;
  warningText: string;
  /** 0–100 when known; null shows indeterminate animation. */
  progressPercent: number | null;
  failed?: boolean;
  failedMessage?: string | null;
  retryLabel?: string;
  onRetry?: () => void;
};

export function RecipeUploadProgressPanel({
  title,
  phaseLabel,
  warningText,
  progressPercent,
  failed = false,
  failedMessage,
  retryLabel,
  onRetry,
}: RecipeUploadProgressPanelProps) {
  const barWidth =
    progressPercent != null
      ? `${Math.max(0, Math.min(100, progressPercent))}%`
      : undefined;

  return (
    <section
      aria-busy={!failed}
      aria-live="polite"
      className={`overflow-hidden rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-card)] ${
        failed
          ? "border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,var(--card))]"
          : "border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary-muted)_74%,var(--card)),var(--card))]"
      }`}
      role={failed ? "alert" : "status"}
    >
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
          <p
            className={`mt-1 text-[length:var(--text-meta)] ${
              failed ? "text-[var(--danger)]" : "text-[var(--primary)]"
            }`}
          >
            {failed ? failedMessage ?? phaseLabel : phaseLabel}
          </p>
          {!failed ? (
            <p className="mt-2 text-[length:var(--text-caption)] font-medium leading-relaxed text-[var(--text)]">
              {warningText}
            </p>
          ) : null}
        </div>

        {!failed ? (
          <div>
            <div className="flex items-center justify-between gap-2 text-[10px] tabular-nums text-[var(--muted)]">
              <span>{progressPercent != null ? `${progressPercent}%` : "…"}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_16%,var(--border))]">
              {progressPercent != null ? (
                <span
                  className="block h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--accent))] transition-[width] duration-200"
                  style={{ width: barWidth }}
                />
              ) : (
                <span className="recipe-save-progress block h-full w-1/3 rounded-full bg-[linear-gradient(90deg,var(--primary),var(--accent),var(--primary))]" />
              )}
            </div>
          </div>
        ) : null}

        {failed && onRetry && retryLabel ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
          >
            {retryLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
