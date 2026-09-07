import Link from "next/link";
import type { Metadata } from "next";

import { GiveawayFaqAccordion } from "@/components/giveaway/GiveawayFaqAccordion";
import { GiveawayOfficialRules } from "@/components/giveaway/GiveawayOfficialRules";
import {
  GIVEAWAY_CONTACT_EMAIL,
  GIVEAWAY_PAYOUT_DAYS,
  GIVEAWAY_RULES_LAST_UPDATED,
  GIVEAWAY_SIGNUP_CTA_HREF,
} from "@/lib/giveaway/constants";
import {
  GIVEAWAY_META_DESCRIPTION,
  GIVEAWAY_PAGE_COPY,
} from "@/lib/giveaway/page-copy";
import { fetchGiveawayPublicSnapshot } from "@/lib/giveaway/public-snapshot";

export const metadata: Metadata = {
  title: "Recipe Giveaway & Official Rules | WhipItFlipIt.com",
  description: GIVEAWAY_META_DESCRIPTION,
};

function formatCycleDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function GiveawayPage() {
  const snapshot = await fetchGiveawayPublicSnapshot();
  const cycle = snapshot.currentCycle;
  const copy = GIVEAWAY_PAGE_COPY;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-10 px-5 py-8 pb-12">
      {/* 1. Hero */}
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-8">
        <p className="text-[length:var(--text-meta)] font-semibold uppercase tracking-wide text-[var(--primary)]">
          {copy.kicker}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
          {copy.headline}
        </h1>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          {copy.intro}
        </p>
        <div
          className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] bg-[color-mix(in_srgb,var(--primary-muted)_55%,var(--card))] p-4 shadow-[var(--shadow-card)]"
          role="note"
        >
          <p className="text-sm font-semibold text-[var(--text)]">
            ${snapshot.prizePoolUsd} prize pool per cycle
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            One ${snapshot.prizes[0].amountUsd} prize, one $
            {snapshot.prizes[1].amountUsd} prize, and three $
            {snapshot.prizes[2].amountUsd} prizes — five winners total.
          </p>
          <p className="mt-2 text-[length:var(--text-meta)] text-[var(--muted)]">
            {copy.prizeNote}
          </p>
        </div>
        <aside
          className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]"
          aria-labelledby="help-me-cook-callout"
        >
          <h2
            id="help-me-cook-callout"
            className="text-sm font-semibold text-[var(--text)]"
          >
            {copy.helpMeCookTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {copy.helpMeCookBody}
          </p>
          <Link
            href={copy.helpMeCookHref}
            className="mt-3 inline-block text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {copy.helpMeCookLinkLabel}
          </Link>
        </aside>
        <Link
          href={GIVEAWAY_SIGNUP_CTA_HREF}
          className="inline-flex min-h-[48px] items-center justify-center rounded-[var(--radius-card)] bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,transform] hover:bg-[var(--primary-hover)] active:scale-[0.99]"
        >
          {copy.ctaLabel}
        </Link>
      </header>

      {/* 2. Current cycle status */}
      <section aria-labelledby="cycle-status-heading">
        <h2
          id="cycle-status-heading"
          className="text-lg font-semibold text-[var(--text)]"
        >
          Current cycle status
        </h2>
        {cycle ? (
          <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
            <p className="text-sm font-medium text-[var(--text)]">
              Entry period
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatCycleDate(cycle.entryStart)} →{" "}
              {formatCycleDate(cycle.entryEnd)} (UTC)
            </p>
            {cycle.daysLeft != null && cycle.status === "active" ? (
              <p className="mt-3 inline-flex rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 text-sm font-semibold text-[var(--primary)]">
                {cycle.daysLeft === 0
                  ? "Last day of this cycle"
                  : `${cycle.daysLeft} day${cycle.daysLeft === 1 ? "" : "s"} left in this cycle`}
              </p>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                This cycle is {cycle.status}. Check back for the next Entry
                Period.
              </p>
            )}
            {cycle.qualifyingEntrantCount != null ? (
              <p className="mt-3 text-[length:var(--text-meta)] text-[var(--muted)]">
                {cycle.qualifyingEntrantCount} qualifying entr
                {cycle.qualifyingEntrantCount === 1 ? "y" : "ies"} so far
                {snapshot.entrantCountUpdatedAt
                  ? " (updated live — identities are never shown)"
                  : null}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
            The next Entry Period dates will be posted here soon. You can still
            create a free account and share the meals you cook for your family
            anytime.
          </p>
        )}

        {snapshot.previousCycleWinners.length > 0 ? (
          <div className="mt-4 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--success)_20%,var(--border))] bg-[color-mix(in_srgb,var(--success)_6%,var(--card))] p-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Previous cycle winners
              {snapshot.previousCycleLabel
                ? ` (${snapshot.previousCycleLabel})`
                : null}
            </h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-[var(--muted)]">
              {snapshot.previousCycleWinners.map((w) => (
                <li key={w.prizeRank}>
                  <span className="font-medium text-[var(--text)]">
                    {w.displayName}
                  </span>{" "}
                  — ${w.prizeAmountUsd}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* 3. How to enter */}
      <section aria-labelledby="how-to-enter-heading">
        <h2
          id="how-to-enter-heading"
          className="text-lg font-semibold text-[var(--text)]"
        >
          How to enter
        </h2>
        <ol className="mt-4 flex flex-col gap-3">
          {copy.entrySteps.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-lg"
                aria-hidden
              >
                {step.icon}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                  Step {index + 1}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">
                  {step.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[length:var(--text-meta)] text-[var(--muted)]">
          {copy.entryFootnote}
        </p>
      </section>

      {/* 4. Originality */}
      <section aria-labelledby="originality-heading">
        <h2
          id="originality-heading"
          className="text-lg font-semibold text-[var(--text)]"
        >
          What counts as &ldquo;original&rdquo;
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted)]">
          {copy.originalityBullets.map((item) => (
            <li key={item.slice(0, 32)}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {copy.originalityClosing}
        </p>
      </section>

      {/* 5. Prizes */}
      <section aria-labelledby="prizes-heading">
        <h2 id="prizes-heading" className="text-lg font-semibold text-[var(--text)]">
          Prizes &amp; winner selection
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {snapshot.prizes.map((prize) => (
            <li
              key={prize.rank}
              className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-3 text-center shadow-[var(--shadow-card)]"
            >
              <p className="text-xl font-bold tabular-nums text-[var(--primary)]">
                ${prize.amountUsd}
              </p>
              <p className="mt-1 text-[length:var(--text-meta)] text-[var(--muted)]">
                {prize.label}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
          At the end of each cycle, we randomly draw names from everyone who
          qualified. If a drawn entry doesn&apos;t meet the originality
          guidelines, we draw another name — you don&apos;t lose future
          eligibility unless your content was AI-generated, copied, or
          duplicated.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          Winners are paid by check within {GIVEAWAY_PAYOUT_DAYS} business days
          of confirmation and verification.
        </p>
        <p className="mt-2 text-[length:var(--text-meta)] text-[var(--muted-light)]">
          Tax note: prizes totaling $600 or more to one person in a calendar
          year may require IRS Form 1099.
        </p>
      </section>

      {/* 6. Official rules */}
      <section aria-labelledby="rules-heading">
        <h2 id="rules-heading" className="text-lg font-semibold text-[var(--text)]">
          Official rules
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Summary above; full legal terms below.
        </p>
        <div className="mt-3">
          <GiveawayOfficialRules />
        </div>
      </section>

      {/* 7. FAQ */}
      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-lg font-semibold text-[var(--text)]">
          FAQ
        </h2>
        <div className="mt-4">
          <GiveawayFaqAccordion />
        </div>
      </section>

      {/* Footer disclaimer + CTA */}
      <footer className="flex flex-col gap-4 border-t border-[var(--border)] pt-6">
        <p className="text-[length:var(--text-meta)] leading-relaxed text-[var(--muted)]">
          This promotion is not sponsored, endorsed, or administered by Instagram
          or Meta Platforms, Inc.
        </p>
        <p className="text-[length:var(--text-meta)] text-[var(--muted)]">
          Questions?{" "}
          <a
            href={`mailto:${GIVEAWAY_CONTACT_EMAIL}?subject=Recipe%20Giveaway`}
            className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
          >
            {GIVEAWAY_CONTACT_EMAIL}
          </a>
        </p>
        <p className="text-[length:var(--text-meta)] text-[var(--muted-light)]">
          Last updated: {GIVEAWAY_RULES_LAST_UPDATED}
        </p>
        <Link
          href={GIVEAWAY_SIGNUP_CTA_HREF}
          className="inline-flex min-h-[48px] items-center justify-center rounded-[var(--radius-card)] bg-[var(--primary)] px-5 py-3 text-center text-sm font-semibold text-white shadow-[var(--shadow-card)] hover:bg-[var(--primary-hover)]"
        >
          {copy.ctaLabel}
        </Link>
      </footer>
    </main>
  );
}
