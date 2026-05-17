import Link from "next/link";

import { dictText } from "@/lib/i18n/server";
import type { RecipeUploadQuotaUi } from "@/lib/recipe-upload-limit";

type Dict = Record<string, string>;

export function RecipeUploadQuotaNotice({
  dict,
  quota,
}: {
  dict: Dict;
  quota: RecipeUploadQuotaUi;
}) {
  if (!quota.showQuota || quota.atLimit || quota.remaining == null) {
    return null;
  }

  return (
    <p className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary-muted)_45%,var(--card))] px-4 py-3 text-sm leading-relaxed text-[var(--text)]">
      {dictText(dict, "recipe_upload_quota_remaining", {
        count: quota.remaining,
      })}{" "}
      {dictText(dict, "recipe_upload_quota_or")}{" "}
      <Link
        href="/upgrade"
        className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
      >
        {dictText(dict, "recipe_upload_quota_upgrade_link")}
      </Link>{" "}
      {dictText(dict, "recipe_upload_quota_suffix")}
    </p>
  );
}
