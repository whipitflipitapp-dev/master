"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";

import {
  completeProductTour,
  dismissProductTour,
} from "@/app/actions/product-tour";
import { ONBOARDING_STEP_VISUALS } from "@/lib/page-food-backgrounds";

export type ProductTourStep = {
  id: string;
  icon: string;
  titleKey: string;
  bodyKey: string;
  href?: string;
  hrefLabelKey?: string;
};

export const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  {
    id: "welcome",
    icon: "👋",
    titleKey: "product_tour_step_welcome_title",
    bodyKey: "product_tour_step_welcome_body",
  },
  {
    id: "recipes",
    icon: "🔍",
    titleKey: "product_tour_step_recipes_title",
    bodyKey: "product_tour_step_recipes_body",
    href: "/recipes",
    hrefLabelKey: "product_tour_step_recipes_link",
  },
  {
    id: "help",
    icon: "✨",
    titleKey: "product_tour_step_help_title",
    bodyKey: "product_tour_step_help_body",
    href: "/help-me-cook",
    hrefLabelKey: "product_tour_step_help_link",
  },
  {
    id: "add",
    icon: "➕",
    titleKey: "product_tour_step_add_title",
    bodyKey: "product_tour_step_add_body",
    href: "/add",
    hrefLabelKey: "product_tour_step_add_link",
  },
  {
    id: "saved",
    icon: "❤️",
    titleKey: "product_tour_step_saved_title",
    bodyKey: "product_tour_step_saved_body",
    href: "/saved",
    hrefLabelKey: "product_tour_step_saved_link",
  },
  {
    id: "bookstore",
    icon: "📚",
    titleKey: "product_tour_step_bookstore_title",
    bodyKey: "product_tour_step_bookstore_body",
    href: "/bookstore",
    hrefLabelKey: "product_tour_step_bookstore_link",
  },
  {
    id: "menu",
    icon: "☰",
    titleKey: "product_tour_step_menu_title",
    bodyKey: "product_tour_step_menu_body",
    href: "/profile",
    hrefLabelKey: "product_tour_step_menu_link",
  },
];

type ProductTourOverlayProps = {
  open: boolean;
  onClose: () => void;
  /** When false, skip/dismiss only closes UI (e.g. manual replay). */
  persistDismiss?: boolean;
};

export function ProductTourOverlay({
  open,
  onClose,
  persistDismiss = true,
}: ProductTourOverlayProps) {
  const { t } = useTranslation("common");
  const [stepIndex, setStepIndex] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  const steps = PRODUCT_TOUR_STEPS;
  const step = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;

  const finish = useCallback(
    (action: "complete" | "dismiss") => {
      startTransition(async () => {
        if (action === "complete") {
          await completeProductTour();
        } else if (persistDismiss) {
          await dismissProductTour();
        }
        onClose();
      });
    },
    [onClose, persistDismiss],
  );

  const stepLabel = useMemo(
    () =>
      t("product_tour_progress", {
        current: stepIndex + 1,
        total: steps.length,
      }),
    [stepIndex, steps.length, t],
  );

  const stepVisual = ONBOARDING_STEP_VISUALS[stepIndex];

  if (!step) {
    return null;
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="product-tour"
          className="fixed inset-0 z-[250] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-tour-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Branded food backdrop — low opacity so tour content stays readable */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            {stepVisual ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={stepVisual.src}
                alt=""
                className={`h-full w-full scale-105 opacity-[0.22] blur-[1px] ${stepVisual.objectClass}`}
              />
            ) : null}
            <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--bg)_72%,transparent)]" />
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
          </div>
          <button
            type="button"
            className="absolute inset-0 z-[1]"
            aria-label={t("product_tour_close")}
            onClick={() => finish("dismiss")}
          />
          <motion.div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-2xl"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            {stepVisual ? (
              <div className="relative h-28 overflow-hidden" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stepVisual.src}
                  alt=""
                  className={`h-full w-full ${stepVisual.objectClass}`}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--card)] via-[color-mix(in_srgb,var(--card)_35%,transparent)] to-transparent" />
              </div>
            ) : null}
            <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[length:var(--text-caption)] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {stepLabel}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() => finish("dismiss")}
                className="shrink-0 rounded-full px-2 py-1 text-sm font-semibold text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-[var(--text)]"
              >
                {t("product_tour_skip")}
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center text-center">
              <span className="text-4xl" aria-hidden>
                {step.icon}
              </span>
              <h2
                id="product-tour-title"
                className="mt-3 text-xl font-bold tracking-tight text-[var(--text)]"
              >
                {t(step.titleKey)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {t(step.bodyKey)}
              </p>
              {step.href && step.hrefLabelKey ? (
                <Link
                  href={step.href}
                  className="mt-3 text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
                  onClick={() => finish("complete")}
                >
                  {t(step.hrefLabelKey)}
                </Link>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  className="min-h-[44px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
                >
                  {t("product_tour_back")}
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (isLast) {
                    finish("complete");
                  } else {
                    setStepIndex((i) => i + 1);
                  }
                }}
                className="min-h-[44px] flex-[2] rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {pending
                  ? t("product_tour_saving")
                  : isLast
                    ? t("product_tour_done")
                    : t("product_tour_next")}
              </button>
            </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
