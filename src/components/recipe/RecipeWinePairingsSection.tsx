"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AffiliateOutboundLink } from "@/components/affiliate/AffiliateOutboundLink";
import { UpgradePitch } from "@/components/billing/UpgradePitch";
import { isAmazonAffiliateProductUrl } from "@/lib/amazon-affiliate-url";
import type { PlanType } from "@/lib/plan";

export type WinePairingRow = {
  id: string;
  wine_type: string;
  wine_name: string | null;
  notes: string | null;
  description: string | null;
  purchase_url: string | null;
};

type RecipeWinePairingsSectionProps = {
  recipeId: string;
  wineUnlocked: boolean;
  wineUpgradePlan: PlanType;
  pairings: WinePairingRow[];
  lockedPlaceholderCount: number;
  labels: {
    sectionTitle: string;
    empty: string;
    unlockPrompt: string;
    shop: string;
    generate: string;
    regenerate: string;
    generating: string;
    errGeneric: string;
    errNetwork: string;
  };
};

export function RecipeWinePairingsSection({
  recipeId,
  wineUnlocked,
  wineUpgradePlan,
  pairings,
  lockedPlaceholderCount,
  labels,
}: RecipeWinePairingsSectionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const runGenerate = () => {
    if (!wineUnlocked || pending) {
      return;
    }
    setErr(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/wine-pairings", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setErr(data.error ?? labels.errGeneric);
          return;
        }
        router.refresh();
      } catch {
        setErr(labels.errNetwork);
      }
    });
  };

  const showGenerate = wineUnlocked;
  const generateLabel =
    pairings.length > 0 ? labels.regenerate : labels.generate;

  return (
    <section className="mt-12" aria-labelledby="wine-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="wine-heading"
          className="text-xl font-semibold tracking-tight text-[var(--text)]"
        >
          {labels.sectionTitle}
        </h2>
        {showGenerate ? (
          <button
            type="button"
            disabled={pending}
            onClick={runGenerate}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary-muted)_70%,var(--card))] px-4 py-2 text-sm font-semibold text-[var(--primary)] shadow-[0_1px_0_rgba(28,25,23,0.03)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? labels.generating : generateLabel}
          </button>
        ) : null}
      </div>

      {err ? (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {err}
        </p>
      ) : null}

      {pairings.length === 0 && lockedPlaceholderCount === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          {labels.empty}
        </p>
      ) : (
        <div className={`relative mt-4 rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] ${wineUnlocked ? "" : "overflow-hidden"}`}>
          <ul
            className={`space-y-3 text-sm leading-relaxed ${wineUnlocked ? "" : "blur-sm select-none"}`}
          >
            {wineUnlocked
              ? pairings.map((w) => {
                  const buyUrl =
                    w.purchase_url &&
                    isAmazonAffiliateProductUrl(w.purchase_url)
                      ? w.purchase_url
                      : null;
                  return (
                    <li key={w.id}>
                      <p className="font-semibold text-[var(--text)]">
                        {w.wine_type}
                        {w.wine_name ? ` — ${w.wine_name}` : ""}
                      </p>
                      {w.description ? (
                        <p className="mt-1 text-[var(--muted)]">{w.description}</p>
                      ) : null}
                      {w.notes ? (
                        <p className="mt-1 text-[length:var(--text-caption)] text-[var(--muted)]">
                          {w.notes}
                        </p>
                      ) : null}
                      {buyUrl ? (
                        <p className="mt-2">
                          <AffiliateOutboundLink
                            href={buyUrl}
                            recipeId={recipeId}
                            linkType="wine_buy"
                            className="text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
                          >
                            {labels.shop}
                          </AffiliateOutboundLink>
                        </p>
                      ) : null}
                    </li>
                  );
                })
              : Array.from({
                  length: Math.min(Math.max(lockedPlaceholderCount, 1), 3),
                }).map((_, i) => (
                  <li key={`placeholder-${i}`} aria-hidden>
                    <p className="font-semibold text-[var(--text)]">
                      · · · · · ·
                    </p>
                    <p className="mt-1 text-[var(--muted)]">· · · · · · · · · ·</p>
                  </li>
                ))}
          </ul>
          {!wineUnlocked && lockedPlaceholderCount > 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-[color-mix(in_srgb,var(--bg)_65%,transparent)] px-4 py-4 text-center backdrop-blur-[2px]">
              <p className="text-sm font-medium leading-relaxed text-[var(--text)]">
                {labels.unlockPrompt}
              </p>
              <UpgradePitch
                currentPlan={wineUpgradePlan}
                compact
                className="max-w-sm"
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
