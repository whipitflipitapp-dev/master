import type { RecipeUploadBadgeTierId } from "@/lib/recipe-upload-badges";

type RecipeUploadBadgeProps = {
  tier: RecipeUploadBadgeTierId;
  label: string;
  size?: "sm" | "md";
  className?: string;
};

const TIER_ACCENT: Record<
  RecipeUploadBadgeTierId,
  { chip: string; icon: string }
> = {
  tier_1_5: {
    chip: "border-[color-mix(in_srgb,#b45309_35%,var(--border))] bg-[color-mix(in_srgb,#b45309_10%,var(--card))] text-[#92400e]",
    icon: "text-[#b45309]",
  },
  tier_6_10: {
    chip: "border-[color-mix(in_srgb,#78716c_35%,var(--border))] bg-[color-mix(in_srgb,#78716c_12%,var(--card))] text-[#57534e]",
    icon: "text-[#78716c]",
  },
  tier_11_20: {
    chip: "border-[color-mix(in_srgb,#ca8a04_35%,var(--border))] bg-[color-mix(in_srgb,#ca8a04_12%,var(--card))] text-[#a16207]",
    icon: "text-[#ca8a04]",
  },
  tier_21_40: {
    chip: "border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--primary-muted)] text-[var(--primary-hover)]",
    icon: "text-[var(--primary)]",
  },
  tier_41_50: {
    chip: "border-[color-mix(in_srgb,#7c3aed_35%,var(--border))] bg-[color-mix(in_srgb,#7c3aed_10%,var(--card))] text-[#6d28d9]",
    icon: "text-[#7c3aed]",
  },
  tier_50_plus: {
    chip: "border-[color-mix(in_srgb,#0f766e_35%,var(--border))] bg-[color-mix(in_srgb,#0f766e_10%,var(--card))] text-[#115e59]",
    icon: "text-[#0f766e]",
  },
};

function AwardIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8.5" r="5.25" />
      <path d="M8.2 13.2 5 20l7-3.5L19 20l-3.2-6.8" />
    </svg>
  );
}

/** Creator milestone badge by recipes uploaded. */
export function RecipeUploadBadge({
  tier,
  label,
  size = "md",
  className = "",
}: RecipeUploadBadgeProps) {
  const accent = TIER_ACCENT[tier];
  const pad = size === "sm" ? "px-2 py-0.5 gap-1" : "px-2.5 py-1 gap-1.5";
  const text = size === "sm" ? "text-[10px]" : "text-xs";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border font-semibold leading-tight ${pad} ${text} ${accent.chip} ${className}`}
      title={label}
    >
      <AwardIcon className={`shrink-0 ${icon} ${accent.icon}`} />
      <span className="truncate">{label}</span>
    </span>
  );
}
