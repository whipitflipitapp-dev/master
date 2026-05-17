import { foodBackgroundForKey } from "@/lib/page-food-backgrounds";

type ContentPageBackdropProps = {
  /** Any stable string (path + optional query facets) used to pick a background. */
  pageKey: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Subtle full-page food texture behind primary app routes. Cards and body tokens
 * stay authoritative for UI chrome; this layer is decorative only.
 */
export function ContentPageBackdrop({
  pageKey,
  children,
  className,
}: ContentPageBackdropProps) {
  const src = foodBackgroundForKey(pageKey);

  return (
    <div
      className={[
        "relative isolate flex min-h-0 flex-1 flex-col overflow-x-hidden",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[var(--bg)]" />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.35] saturate-[1.06] sm:opacity-[0.42]"
          style={{ backgroundImage: `url(${src})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[color-mix(in_srgb,var(--bg)_55%,transparent)] via-[color-mix(in_srgb,var(--bg)_44%,transparent)] to-[var(--bg)]" />
      </div>
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
