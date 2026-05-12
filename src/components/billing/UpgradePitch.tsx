"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { nextPlanType, type PlanType } from "@/lib/plan";

const PRO_BENEFIT_KEYS = [
  "upgrade_pro_benefit_1",
  "upgrade_pro_benefit_2",
  "upgrade_pro_benefit_3",
] as const;

const AI_BENEFIT_KEYS = [
  "upgrade_ai_benefit_1",
  "upgrade_ai_benefit_2",
  "upgrade_ai_benefit_3",
] as const;

export type UpgradePitchProps = {
  currentPlan: PlanType;
  buttonVariant?: "primary" | "secondary";
  /** Tighter spacing for overlays and dense layouts */
  compact?: boolean;
  className?: string;
};

export function UpgradePitch({
  currentPlan,
  buttonVariant = "primary",
  compact,
  className,
}: UpgradePitchProps) {
  const { t } = useTranslation("common");
  const next = nextPlanType(currentPlan);
  if (!next) {
    return null;
  }

  const isNextPro = next === "pro";
  const benefitKeys = isNextPro ? PRO_BENEFIT_KEYS : AI_BENEFIT_KEYS;
  const titleKey = isNextPro
    ? "upgrade_pitch_heading_pro"
    : "upgrade_pitch_heading_ai_chef";
  const ctaKey = isNextPro
    ? "upgrade_next_cta_pro"
    : "upgrade_next_cta_ai_chef";

  const btnClass =
    buttonVariant === "primary"
      ? "inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-card)] bg-[var(--primary)] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99]"
      : "inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color-mix(in_srgb,var(--card)_88%,var(--text))] active:scale-[0.99]";

  const cardPad = compact ? "p-3" : "p-4";
  const bodyClass = compact
    ? "mt-2 list-inside list-disc space-y-1 text-xs text-[var(--text)]/90"
    : "mt-2 list-inside list-disc space-y-1.5 text-sm text-[var(--text)]/90";

  return (
    <div className={`flex w-full flex-col gap-3 ${className ?? ""}`}>
      <Link href="/upgrade" className={btnClass}>
        {t(ctaKey)}
      </Link>
      <div
        className={`rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] ${cardPad} shadow-[var(--shadow-card)]`}
      >
        <p
          className={`font-semibold text-[var(--text)] ${compact ? "text-xs" : "text-sm"}`}
        >
          {t(titleKey)}
        </p>
        <ul className={bodyClass}>
          {benefitKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
