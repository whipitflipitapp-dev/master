"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  deleteUserWinePairing,
  submitUserWinePairing,
  type UserWinePairingRow,
  type WineTypeCount,
} from "@/app/actions/user-wine-pairings";
import { CURATED_WINE_TYPES } from "@/lib/wine-types";

const MAX_WHY_BLURB = 200;

type RecipeCommunityWinePairingsSectionProps = {
  recipeId: string;
  authenticated: boolean;
  currentUserId: string | null;
  loginNextPath: string;
  pairings: UserWinePairingRow[];
  typeCounts: WineTypeCount[];
  wineTypeLabels: Record<string, string>;
  labels: {
    sectionTitle: string;
    empty: string;
    popularTypes: string;
    expandTypes: string;
    collapseTypes: string;
    addYours: string;
    wineNameLabel: string;
    wineNamePlaceholder: string;
    whyBlurbLabel: string;
    whyBlurbPlaceholder: string;
    charCounter: string;
    expandPairing: string;
    collapsePairing: string;
    whyBlurbHeading: string;
    submit: string;
    submitting: string;
    saved: string;
    signInLink: string;
    signInPrompt: string;
    remove: string;
    selectedType: string;
    pickTypeFirst: string;
    cancel: string;
  };
};

function CommunityPairingListItem({
  pairing,
  typeLabel,
  isOwn,
  deletePending,
  labels,
  onDelete,
}: {
  pairing: UserWinePairingRow;
  typeLabel: string;
  isOwn: boolean;
  deletePending: boolean;
  labels: RecipeCommunityWinePairingsSectionProps["labels"];
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const heading = `${typeLabel}${pairing.wine_name ? ` — ${pairing.wine_name}` : ""}`;

  return (
    <li className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <span className="font-semibold text-[var(--text)]">{heading}</span>
        <span className="shrink-0 text-xs font-semibold text-[var(--primary)] underline-offset-4">
          {expanded ? labels.collapsePairing : labels.expandPairing}
        </span>
      </button>
      {expanded ? (
        <ExpandedPairingContent
          pairing={pairing}
          typeLabel={typeLabel}
          isOwn={isOwn}
          deletePending={deletePending}
          labels={labels}
          onDelete={onDelete}
        />
      ) : null}
    </li>
  );
}

function ExpandedPairingContent({
  pairing,
  typeLabel,
  isOwn,
  deletePending,
  labels,
  onDelete,
}: {
  pairing: UserWinePairingRow;
  typeLabel: string;
  isOwn: boolean;
  deletePending: boolean;
  labels: RecipeCommunityWinePairingsSectionProps["labels"];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mt-2 space-y-2 border-l-2 border-[color-mix(in_srgb,var(--primary)_25%,var(--border))] pl-3">
      <p className="text-[length:var(--text-caption)] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {typeLabel}
        {pairing.wine_name ? (
          <span className="font-medium normal-case text-[var(--text)]">
            {" "}
            · {pairing.wine_name}
          </span>
        ) : null}
      </p>
      {pairing.why_blurb ? (
        <WhyBlurbBlock labels={labels} text={pairing.why_blurb} />
      ) : null}
      {isOwn ? (
        <button
          type="button"
          disabled={deletePending}
          onClick={() => onDelete(pairing.id)}
          className="text-xs font-semibold text-[var(--danger)] underline-offset-4 hover:underline disabled:opacity-60"
        >
          {labels.remove}
        </button>
      ) : null}
    </div>
  );
}

function WhyBlurbBlock({
  labels,
  text,
}: {
  labels: RecipeCommunityWinePairingsSectionProps["labels"];
  text: string;
}) {
  return (
    <div>
      <p className="text-[length:var(--text-caption)] font-semibold text-[var(--muted)]">
        {labels.whyBlurbHeading}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">{text}</p>
    </div>
  );
}

export function RecipeCommunityWinePairingsSection({
  recipeId,
  authenticated,
  currentUserId,
  loginNextPath,
  pairings,
  typeCounts,
  wineTypeLabels,
  labels,
}: RecipeCommunityWinePairingsSectionProps) {
  const [typesOpen, setTypesOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [whyBlurbLen, setWhyBlurbLen] = useState(0);
  const [deletePending, startDelete] = useTransition();

  const [state, formAction, pending] = useActionState(submitUserWinePairing, {
    ok: false,
    error: null as string | null,
  });

  const countBySlug = new Map(typeCounts.map((c) => [c.slug, c.count]));

  const formatTypeLabel = (slug: string, label: string) => {
    const n = countBySlug.get(slug) ?? 0;
    return n > 0 ? `${label} (${n})` : label;
  };

  const pickType = (slug: string) => {
    setSelectedSlug(slug);
    setFormOpen(true);
    setTypesOpen(false);
  };

  const selectedLabel =
    selectedSlug && wineTypeLabels[selectedSlug]
      ? wineTypeLabels[selectedSlug]
      : null;

  const topWithCounts = CURATED_WINE_TYPES.map((t) => ({
    slug: t.slug,
    label: wineTypeLabels[t.slug] ?? t.slug,
    count: countBySlug.get(t.slug) ?? 0,
  })).filter((t) => t.count > 0);

  const handleDelete = (id: string) => {
    startDelete(async () => {
      await deleteUserWinePairing(id);
    });
  };

  return (
    <section className="mt-12" aria-labelledby="community-wine-heading">
      <h2
        id="community-wine-heading"
        className="text-xl font-semibold tracking-tight text-[var(--text)]"
      >
        {labels.sectionTitle}
      </h2>

      <div className="mt-4">
        {topWithCounts.length > 0 ? (
          <>
            <p className="text-[length:var(--text-caption)] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {labels.popularTypes}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {topWithCounts.map((t) => (
                <li key={t.slug}>
                  <button
                    type="button"
                    onClick={() => pickType(t.slug)}
                    className="rounded-full border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[color-mix(in_srgb,var(--primary-muted)_50%,var(--card))] px-3 py-1 text-xs font-semibold text-[var(--primary)] transition-opacity hover:opacity-90"
                  >
                    {formatTypeLabel(t.slug, t.label)}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <button
          type="button"
          aria-expanded={typesOpen}
          onClick={() => setTypesOpen(!typesOpen)}
          className="mt-3 text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
        >
          {typesOpen ? labels.collapseTypes : labels.expandTypes}
        </button>

        {typesOpen ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {CURATED_WINE_TYPES.map((t) => {
              const typeLabel = wineTypeLabels[t.slug] ?? t.slug;
              return (
                <li key={t.slug}>
                  <button
                    type="button"
                    onClick={() => pickType(t.slug)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left text-sm font-medium text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.03)] transition-[border-color] hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]"
                  >
                    {formatTypeLabel(t.slug, typeLabel)}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {pairings.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          {labels.empty}
        </p>
      ) : (
        <ul className="mt-4 space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] p-4 text-sm leading-relaxed shadow-[var(--shadow-card)]">
          {pairings.map((p) => {
            const typeLabel =
              (p.wine_type_slug && wineTypeLabels[p.wine_type_slug]) ||
              p.wine_type;
            const isOwn = Boolean(
              currentUserId && p.user_id === currentUserId,
            );
            return (
              <CommunityPairingListItem
                key={p.id}
                pairing={p}
                typeLabel={typeLabel}
                isOwn={isOwn}
                deletePending={deletePending}
                labels={labels}
                onDelete={handleDelete}
              />
            );
          })}
        </ul>
      )}

      {!authenticated ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          <Link
            href={`/login?next=${encodeURIComponent(loginNextPath)}`}
            className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {labels.signInLink}
          </Link>{" "}
          {labels.signInPrompt}
        </p>
      ) : !formOpen ? (
        <button
          type="button"
          onClick={() => {
            setFormOpen(true);
            if (!selectedSlug) {
              setTypesOpen(true);
            }
          }}
          className="mt-4 inline-flex items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary-muted)_70%,var(--card))] px-4 py-2 text-sm font-semibold text-[var(--primary)] shadow-[0_1px_0_rgba(28,25,23,0.03)] transition-opacity hover:opacity-90"
        >
          {labels.addYours}
        </button>
      ) : (
        <form
          action={formAction}
          className="mt-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]"
        >
          <input type="hidden" name="recipe_id" value={recipeId} />
          <input type="hidden" name="wine_type_slug" value={selectedSlug ?? ""} />

          {selectedLabel ? (
            <p className="text-sm text-[var(--muted)]">
              {labels.selectedType.replace("{{type}}", selectedLabel)}
            </p>
          ) : (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {labels.pickTypeFirst}
            </p>
          )}

          <label className="block text-sm font-medium text-[var(--text)]">
            {labels.wineNameLabel}
            <input
              name="wine_name"
              type="text"
              maxLength={120}
              placeholder={labels.wineNamePlaceholder}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>

          <label className="block text-sm font-medium text-[var(--text)]">
            {labels.whyBlurbLabel}
            <textarea
              name="why_blurb"
              rows={3}
              maxLength={MAX_WHY_BLURB}
              placeholder={labels.whyBlurbPlaceholder}
              onChange={(e) => setWhyBlurbLen(e.target.value.length)}
              className="mt-1 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>
          <p className="text-[length:var(--text-caption)] text-[var(--muted)]">
            {labels.charCounter.replace("{{count}}", String(whyBlurbLen))}
          </p>

          {state.error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.ok ? (
            <p className="text-sm font-medium text-[var(--primary)]" role="status">
              {labels.saved}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending || !selectedSlug}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? labels.submitting : labels.submit}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
            >
              {labels.cancel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
