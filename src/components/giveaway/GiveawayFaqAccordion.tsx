"use client";

import { GIVEAWAY_FAQ_ITEMS } from "@/lib/giveaway/content";

const detailsClass =
  "group rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]";

const summaryClass =
  "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--text)] marker:content-none [&::-webkit-details-marker]:hidden";

export function GiveawayFaqAccordion() {
  return (
    <div className="flex flex-col gap-2">
      {GIVEAWAY_FAQ_ITEMS.map((item) => (
        <details key={item.id} className={detailsClass}>
          <summary className={summaryClass}>
            <span>{item.question}</span>
            <span
              className="text-[var(--muted)] transition-transform group-open:rotate-180"
              aria-hidden
            >
              ▾
            </span>
          </summary>
          <p className="border-t border-[var(--border)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
