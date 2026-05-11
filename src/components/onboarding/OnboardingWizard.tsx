"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";

import { completeOnboarding } from "@/app/actions/onboarding";
import { ProfileAllergiesForm } from "@/components/profile/ProfileAllergiesForm";
import type { AllergyMode } from "@/lib/profile";
import { PRICING } from "@/lib/pricing";

type Props = {
  allergens: { id: string; name: string }[];
  selectedIds: string[];
  defaultAllergyMode: AllergyMode;
};

export function OnboardingWizard({
  allergens,
  selectedIds,
  defaultAllergyMode,
}: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [finishErr, setFinishErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function finishSetup() {
    setFinishErr(null);
    startTransition(async () => {
      const r = await completeOnboarding();
      if (r.error) {
        setFinishErr(r.error);
        return;
      }
      router.push("/recipes");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-8">
      <div className="mb-6 flex gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              s <= step ? "bg-[var(--primary)]" : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>

      {step === 1 ? (
        <section className="flex flex-1 flex-col gap-4">
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("onboarding_step1_title")}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {t("onboarding_step1_body")}
          </p>
          {finishErr ? (
            <p className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
              {finishErr}
            </p>
          ) : null}
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="min-h-[48px] rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] hover:bg-[var(--primary-hover)]"
            >
              {t("onboarding_step1_next")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => finishSetup()}
              className="min-h-[48px] rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-60"
            >
              {t("onboarding_step1_skip")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="flex flex-1 flex-col gap-3">
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("onboarding_step2_title")}
          </h1>
          <ProfileAllergiesForm
            allergens={allergens}
            selectedIds={selectedIds}
            defaultAllergyMode={defaultAllergyMode}
            submitLabel={t("onboarding_step2_next")}
            submitPendingLabel={t("onboarding_step2_next")}
            onSaved={() => setStep(3)}
          />
          <button
            type="button"
            className="text-sm font-medium text-[var(--muted)] underline-offset-4 hover:underline"
            onClick={() => setStep(3)}
          >
            {t("onboarding_step1_skip")}
          </button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="flex flex-1 flex-col gap-4">
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("onboarding_step3_title")}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {t("onboarding_step3_body")}
          </p>
          <div className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-[var(--text)]">Free</span>
              <span className="text-[var(--muted)]">$0</span>
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-3 text-sm">
              <span className="font-semibold text-[var(--text)]">Pro</span>
              <span className="text-[var(--muted)]">
                {PRICING.pro.monthlyLabel} · {PRICING.pro.yearlyLabel}
              </span>
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-3 text-sm">
              <span className="font-semibold text-[var(--text)]">AI Chef</span>
              <span className="text-[var(--muted)]">
                {PRICING.ai_chef.monthlyLabel} · {PRICING.ai_chef.yearlyLabel}
              </span>
            </div>
          </div>
          <Link
            href="/upgrade"
            className="min-h-[48px] rounded-full border border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-4 py-3 text-center text-sm font-semibold text-[var(--primary)]"
          >
            {t("onboarding_step3_cta")}
          </Link>
          <button
            type="button"
            onClick={() => setStep(4)}
            className="min-h-[48px] rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
          >
            {t("onboarding_step3_next")}
          </button>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="flex flex-1 flex-col gap-4">
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("onboarding_step4_title")}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {t("onboarding_step4_body")}
          </p>
          {finishErr ? (
            <p className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
              {finishErr}
            </p>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => finishSetup()}
            className="mt-auto min-h-[48px] rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {pending ? "…" : t("onboarding_finish")}
          </button>
        </section>
      ) : null}
    </div>
  );
}
