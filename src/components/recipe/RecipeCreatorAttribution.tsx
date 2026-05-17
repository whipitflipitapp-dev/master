import Link from "next/link";

import { ChefAvatar } from "@/components/chef/ChefAvatar";

type RecipeCreatorAttributionProps = {
  chefId: string | null | undefined;
  displayName: string | null | undefined;
  avatarUrl?: string | null;
  byPrefix: string;
};

export function RecipeCreatorAttribution({
  chefId,
  displayName,
  avatarUrl,
  byPrefix,
}: RecipeCreatorAttributionProps) {
  const name = displayName?.trim();
  if (!name && !chefId) {
    return null;
  }

  const chefHref = chefId ? `/chef/${chefId}` : null;
  const label = name ?? "Chef";

  return (
    <div className="flex items-center gap-2">
      <ChefAvatar
        avatarUrl={avatarUrl}
        displayName={label}
        href={chefHref}
        size="sm"
      />
      <p className="min-w-0 text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
        {byPrefix}{" "}
        {chefHref ? (
          <Link
            href={chefHref}
            className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {label}
          </Link>
        ) : (
          <span className="font-semibold text-[var(--text)]">{label}</span>
        )}
      </p>
    </div>
  );
}
