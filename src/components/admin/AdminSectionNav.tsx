"use client";

import { useEffect, useState } from "react";

import {
  ADMIN_SECTION_LINKS,
  type AdminSectionTint,
} from "@/components/admin/admin-section-styles";

const SECTION_IDS = ADMIN_SECTION_LINKS.map((l) => l.id);

function sectionTintForId(id: string): AdminSectionTint | null {
  if (id === "events-log") return "events";
  if (id === "moderation") return "moderation";
  if (
    id === "revenue" ||
    id === "subscribers" ||
    id === "growth" ||
    id === "engagement" ||
    id === "support"
  ) {
    return id;
  }
  return null;
}

export function AdminSectionNav() {
  const [activeId, setActiveId] = useState<string>(SECTION_IDS[0] ?? "revenue");

  useEffect(() => {
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      Boolean,
    ) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-9rem 0px -55% 0px",
        threshold: [0, 0.12, 0.35],
      },
    );

    for (const el of elements) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className="border-b border-[color-mix(in_srgb,var(--muted)_28%,transparent)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur-md"
      aria-label="Admin sections"
    >
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ADMIN_SECTION_LINKS.map(({ id, label }) => {
          const active = activeId === id;
          const tint = sectionTintForId(id);
          const activeClass =
            tint === "revenue"
              ? "border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--primary)_14%,var(--bg))] text-[var(--primary-hover)]"
              : tint === "subscribers"
                ? "border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_12%,var(--bg))] text-[var(--success)]"
                : tint === "growth"
                  ? "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,var(--bg))] text-[var(--primary-hover)]"
                  : active
                    ? "border-[color-mix(in_srgb,var(--primary)_28%,transparent)] bg-[var(--primary-muted)] text-[var(--primary-hover)]"
                    : "";

          return (
            <a
              key={id}
              href={`#${id}`}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? activeClass
                  : "border-transparent text-[var(--muted)] hover:border-[color-mix(in_srgb,var(--muted)_25%,transparent)] hover:bg-[var(--card)] hover:text-[var(--text)]"
              }`}
              aria-current={active ? "location" : undefined}
            >
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
