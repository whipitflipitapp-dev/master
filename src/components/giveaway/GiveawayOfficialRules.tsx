"use client";

import {
  GIVEAWAY_CONTACT_EMAIL,
  GIVEAWAY_RULES_LAST_UPDATED,
} from "@/lib/giveaway/constants";
import { GIVEAWAY_OFFICIAL_RULES_SECTIONS } from "@/lib/giveaway/content";

export function GiveawayOfficialRules() {
  return (
    <details className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--text)] marker:content-none [&::-webkit-details-marker]:hidden">
        Read full official rules
        <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
          All twelve sections — eligibility, originality, drawing, and payouts.
        </span>
      </summary>
      <div className="border-t border-[var(--border)] px-4 py-4">
        <article className="flex flex-col gap-8 text-sm leading-relaxed text-[var(--muted)]">
          {GIVEAWAY_OFFICIAL_RULES_SECTIONS.map((section) => (
            <section key={section.id} id={`rules-${section.id}`}>
              <h3 className="text-base font-semibold text-[var(--text)]">
                {section.title}
              </h3>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="mt-2">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
        <p className="mt-6 text-[length:var(--text-meta)] text-[var(--muted-light)]">
          Last updated: {GIVEAWAY_RULES_LAST_UPDATED}. Questions:{" "}
          <a
            href={`mailto:${GIVEAWAY_CONTACT_EMAIL}?subject=Recipe%20Giveaway`}
            className="font-medium text-[var(--primary)] underline-offset-2 hover:underline"
          >
            {GIVEAWAY_CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </details>
  );
}
