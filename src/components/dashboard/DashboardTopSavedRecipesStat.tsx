"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export type DashboardTopSavedRecipeRow = {
  id: string;
  title: string;
  imageUrl: string | null;
  savesCount: number;
  savesLabel: string;
};

type DashboardTopSavedRecipesStatProps = {
  totalSaves: number;
  recipes: DashboardTopSavedRecipeRow[];
  labels: {
    statLabel: string;
    dialogTitle: string;
    dialogSubtitle: string;
    empty: string;
    close: string;
  };
};

export function DashboardTopSavedRecipesStat({
  totalSaves,
  recipes,
  labels,
}: DashboardTopSavedRecipesStatProps) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleClose]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="-mx-1 flex w-full max-w-full items-baseline justify-between gap-3 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-[var(--text)]">
          {labels.statLabel}
        </span>
        <span className="text-lg font-bold tabular-nums text-[var(--primary)]">
          {totalSaves}
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label={labels.close}
            onClick={handleClose}
          />
          <div className="relative z-10 flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col rounded-t-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)] sm:rounded-[var(--radius-card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2
                id={titleId}
                className="text-lg font-semibold tracking-tight text-[var(--text)]"
              >
                {labels.dialogTitle}
              </h2>
              <p
                id={bodyId}
                className="mt-1 text-sm leading-relaxed text-[var(--muted)]"
              >
                {labels.dialogSubtitle}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {recipes.length === 0 ? (
                <p className="py-6 text-sm leading-relaxed text-[var(--muted)]">
                  {labels.empty}
                </p>
              ) : (
                <ol className="divide-y divide-[var(--border)]">
                  {recipes.map((recipe, index) => {
                    const href = `/recipes/${recipe.id}`;
                    return (
                      <li key={recipe.id} className="flex gap-3 py-3 first:pt-2">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))] text-sm font-bold tabular-nums text-[var(--primary)]"
                          aria-hidden
                        >
                          {index + 1}
                        </span>
                        <Link
                          href={href}
                          onClick={handleClose}
                          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))]"
                          aria-hidden
                          tabIndex={-1}
                        >
                          {recipe.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- user recipe covers
                            <img
                              src={recipe.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-lg opacity-40">
                              W
                            </span>
                          )}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={href}
                            onClick={handleClose}
                            className="line-clamp-2 font-semibold leading-snug text-[var(--text)] underline-offset-4 hover:text-[var(--primary)] hover:underline"
                          >
                            {recipe.title}
                          </Link>
                          <p className="mt-1 text-xs font-medium tabular-nums text-[var(--muted)]">
                            {recipe.savesLabel}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
            <div className="border-t border-[var(--border)] px-5 py-4">
              <button
                ref={closeRef}
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm font-semibold text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
              >
                {labels.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
