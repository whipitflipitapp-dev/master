import { dictText, type CommonJson } from "@/lib/i18n/server";
import { planTypeBadgeLabel, type PlanType } from "@/lib/plan";

type Props = {
  pendingPlan: PlanType;
  effectiveAt: string;
  locale: string;
  dict: CommonJson;
};

function formatEffectiveDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
      new Date(iso),
    );
  } catch {
    return iso.slice(0, 10);
  }
}

export function ProfilePendingPlanNotice({
  pendingPlan,
  effectiveAt,
  locale,
  dict,
}: Props) {
  const date = formatEffectiveDate(effectiveAt, locale);
  const planLabel = planTypeBadgeLabel(pendingPlan);
  const messageKey =
    pendingPlan === "free"
      ? "profile_pending_downgrade_free"
      : "profile_pending_downgrade_plan";

  return (
    <p
      className="mt-3 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] bg-[var(--primary-muted)] px-3 py-2.5 text-sm text-[var(--text)]"
      role="status"
    >
      {dictText(dict, messageKey, { plan: planLabel, date })}
    </p>
  );
}
