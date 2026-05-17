import { CheckoutTierForm, type CheckoutTier } from "@/components/billing/CheckoutTierForm";
import { PlanDowngradeForm } from "@/components/billing/PlanDowngradeForm";
import { dictText, type Dictionary } from "@/lib/i18n/server";
import { hasTier, type PlanType } from "@/lib/plan";

type Props = {
  tier: CheckoutTier;
  monthlyLabel: string;
  yearlyLabel: string;
  isSignedIn: boolean;
  currentPlan: PlanType;
  pendingPlan: PlanType | null;
  dict: Dictionary;
};

export function UpgradeTierActions({
  tier,
  monthlyLabel,
  yearlyLabel,
  isSignedIn,
  currentPlan,
  pendingPlan,
  dict,
}: Props) {
  const isCurrent = currentPlan === tier;
  const isDowngradeTarget =
    hasTier(currentPlan, tier) && currentPlan !== tier && currentPlan !== "free";

  if (isCurrent) {
    const cancelPending = pendingPlan === "free";
    if (currentPlan === "free") {
      return null;
    }
    return (
      <PlanDowngradeForm
        targetPlan="free"
        isSignedIn={isSignedIn}
        isPending={cancelPending}
        label={dictText(dict, "upgrade_cancel_subscription")}
        pendingLabel={dictText(dict, "upgrade_cancel_scheduled")}
        explanation={dictText(dict, "upgrade_cancel_explanation")}
      />
    );
  }

  if (isDowngradeTarget) {
    const downgradePending = pendingPlan === tier;
    return (
      <PlanDowngradeForm
        targetPlan={tier}
        isSignedIn={isSignedIn}
        isPending={downgradePending}
        label={dictText(dict, "upgrade_downgrade_to_pro")}
        pendingLabel={dictText(dict, "upgrade_downgrade_scheduled_pro")}
        explanation={dictText(dict, "upgrade_downgrade_explanation")}
      />
    );
  }

  return (
    <CheckoutTierForm
      tier={tier}
      monthlyLabel={monthlyLabel}
      yearlyLabel={yearlyLabel}
      isSignedIn={isSignedIn}
      isCurrent={false}
    />
  );
}
