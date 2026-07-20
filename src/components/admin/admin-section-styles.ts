export const ADMIN_SECTION_LINKS = [
  { id: "revenue", label: "Revenue" },
  { id: "subscribers", label: "Subscribers" },
  { id: "growth", label: "Growth" },
  { id: "engagement", label: "Engagement" },
  { id: "moderation", label: "Moderation" },
  { id: "support", label: "Support" },
  { id: "events-log", label: "Event log" },
] as const;

export type AdminSectionTint =
  | "revenue"
  | "subscribers"
  | "growth"
  | "engagement"
  | "moderation"
  | "support"
  | "events";

const SECTION_TINT: Record<AdminSectionTint, string> = {
  revenue:
    "border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_7%,var(--bg))]",
  subscribers:
    "border-[color-mix(in_srgb,var(--success)_22%,var(--border))] bg-[color-mix(in_srgb,var(--success)_6%,var(--bg))]",
  growth:
    "border-[color-mix(in_srgb,var(--accent)_25%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_8%,var(--bg))]",
  engagement:
    "border-[color-mix(in_srgb,var(--primary)_18%,var(--border))] bg-[color-mix(in_srgb,var(--primary-muted)_55%,var(--bg))]",
  moderation:
    "border-[color-mix(in_srgb,var(--danger)_18%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_5%,var(--bg))]",
  support:
    "border-[color-mix(in_srgb,var(--muted)_28%,var(--border))] bg-[color-mix(in_srgb,var(--card)_85%,var(--bg))]",
  events:
    "border-[color-mix(in_srgb,var(--muted)_32%,var(--border))] bg-[color-mix(in_srgb,var(--card)_70%,var(--bg))]",
};

/** Offset for in-page anchors below sticky admin chrome (~7.5rem). */
export const ADMIN_SECTION_SCROLL_MT = "scroll-mt-[9rem]";

export function adminSectionShellClass(tint: AdminSectionTint): string {
  return `rounded-2xl border p-5 shadow-sm sm:p-6 ${ADMIN_SECTION_SCROLL_MT} ${SECTION_TINT[tint]}`;
}

export function adminMetricCardClass(): string {
  return "rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--bg)_88%,var(--card))] p-5 shadow-sm";
}
