import Link from "next/link";

const SIZE_CLASS = {
  sm: "h-7 w-7 text-sm",
  md: "h-10 w-10 text-lg",
  lg: "h-20 w-20 text-3xl",
} as const;

type ChefAvatarProps = {
  avatarUrl?: string | null;
  displayName?: string | null;
  size?: keyof typeof SIZE_CLASS;
  href?: string | null;
  className?: string;
};

function AvatarVisual({
  avatarUrl,
  displayName,
  size,
}: Pick<ChefAvatarProps, "avatarUrl" | "displayName" | "size">) {
  const sizeClass = SIZE_CLASS[size ?? "sm"];
  const label = displayName?.trim() || "Chef";

  if (avatarUrl?.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Supabase public avatar URLs
      <img
        src={avatarUrl.trim()}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full border border-[var(--border)] object-cover shadow-[0_1px_2px_rgba(28,25,23,0.06)]`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,var(--bg))] text-[var(--muted)]`}
      aria-hidden
    >
      👨‍🍳
    </span>
  );
}

export function ChefAvatar({
  avatarUrl,
  displayName,
  size = "sm",
  href,
  className = "",
}: ChefAvatarProps) {
  const visual = (
    <AvatarVisual avatarUrl={avatarUrl} displayName={displayName} size={size} />
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`inline-flex shrink-0 rounded-full outline-none ring-[var(--primary)]/25 transition-opacity hover:opacity-90 focus-visible:ring-2 ${className}`}
        aria-label={
          displayName?.trim()
            ? `View ${displayName.trim()}'s chef profile`
            : "View chef profile"
        }
      >
        {visual}
      </Link>
    );
  }

  return <span className={`inline-flex shrink-0 ${className}`}>{visual}</span>;
}
