import Link from "next/link";
import type { Metadata } from "next";

import { CheckoutTierForm } from "@/components/billing/CheckoutTierForm";
import { UpgradeSignedInTelemetry } from "@/components/billing/UpgradeSignedInTelemetry";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { type PlanType } from "@/lib/plan";
import { PRICING } from "@/lib/pricing";
import { getCurrentProfile } from "@/lib/profile";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  return {
    title: dictText(dict, "upgrade_meta_title", { brand: dict.brand }),
    description: dictText(dict, "upgrade_meta_desc"),
  };
}

const PRO_KEYS = [
  "upgrade_pro_benefit_1",
  "upgrade_pro_benefit_2",
  "upgrade_pro_benefit_3",
] as const;

const AI_KEYS = [
  "upgrade_ai_benefit_1",
  "upgrade_ai_benefit_2",
  "upgrade_ai_benefit_3",
  "upgrade_ai_benefit_4",
] as const;

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const { pro, ai_chef: aiChef } = PRICING;
  const params = await searchParams;
  const cancelled = params.checkout === "cancelled";

  const session = await getCurrentProfile();
  const isSignedIn = !!session?.user;
  const currentPlan: PlanType = session?.profile.plan_type ?? "free";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)] px-5 py-5">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
              {dictText(dict, "upgrade_title")}
            </h1>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              {dictText(dict, "upgrade_subtitle")}
            </p>
          </div>
          <Link
            href="/profile"
            className="shrink-0 text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {dictText(dict, "upgrade_link_profile")}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 py-6">
        {isSignedIn ? <UpgradeSignedInTelemetry /> : null}
        {cancelled ? (
          <p
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_8%,var(--card))] px-4 py-3 text-sm text-[var(--text)]"
            role="status"
          >
            {dictText(dict, "upgrade_checkout_cancelled")}
          </p>
        ) : null}

        <section
          className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
          aria-labelledby="tier-pro"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="tier-pro" className="text-lg font-semibold">
              {dictText(dict, "upgrade_tier_pro")}
            </h2>
            <div className="text-right text-sm text-[var(--muted)]">
              <p className="font-medium text-[var(--text)]">{pro.monthlyLabel}</p>
              <p className="font-medium text-[var(--text)]">{pro.yearlyLabel}</p>
            </div>
          </div>
          <ul className="mt-4 list-inside list-disc space-y-1.5 text-sm text-[var(--text)]/90">
            {PRO_KEYS.map((key) => (
              <li key={key}>{dictText(dict, key)}</li>
            ))}
          </ul>

          <CheckoutTierForm
            tier="pro"
            monthlyLabel={pro.monthlyLabel}
            yearlyLabel={pro.yearlyLabel}
            isSignedIn={isSignedIn}
            isCurrent={currentPlan === "pro"}
          />
        </section>

        <section
          className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] bg-[var(--card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[var(--primary)]/15"
          aria-labelledby="tier-ai-chef"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="tier-ai-chef" className="text-lg font-semibold">
              {dictText(dict, "upgrade_tier_ai_chef")}
            </h2>
            <div className="text-right text-sm text-[var(--muted)]">
              <p className="font-medium text-[var(--text)]">{aiChef.monthlyLabel}</p>
              <p className="font-medium text-[var(--text)]">{aiChef.yearlyLabel}</p>
            </div>
          </div>
          <ul className="mt-4 list-inside list-disc space-y-1.5 text-sm text-[var(--text)]/90">
            {AI_KEYS.map((key) => (
              <li key={key}>{dictText(dict, key)}</li>
            ))}
          </ul>

          <CheckoutTierForm
            tier="ai_chef"
            monthlyLabel={aiChef.monthlyLabel}
            yearlyLabel={aiChef.yearlyLabel}
            isSignedIn={isSignedIn}
            isCurrent={currentPlan === "ai_chef"}
          />
        </section>

        <p className="pb-6 text-center text-xs text-[var(--muted)]">
          {dictText(dict, "upgrade_footer_note")}
        </p>
      </main>
    </div>
  );
}
