import Image from "next/image";

type RecipeDetailHeroProps = {
  title: string;
  imageUrl: string | null;
  /** Alt describes the hero image only; callers may omit when decorative. */
  imageAlt?: string;
};

/** Tiny SVG blur placeholder for remote images without real LQIP. */
const BLUR_FALLBACK =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4";

export function RecipeDetailHero({
  title,
  imageUrl,
  imageAlt = "",
}: RecipeDetailHeroProps) {
  return (
    <section
      className="relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))] shadow-[var(--shadow-card)]"
      aria-label="Recipe hero"
    >
      <div className="relative aspect-[16/10] w-full">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 672px) 100vw, 672px"
            priority
            placeholder="blur"
            blurDataURL={BLUR_FALLBACK}
          />
        ) : (
          <div className="flex h-full min-h-[10rem] w-full flex-col items-center justify-center gap-3 px-6 text-[var(--muted)]">
            <span className="text-6xl opacity-[0.38]" aria-hidden>
              🍳
            </span>
            <p className="max-w-[20rem] text-center text-[length:var(--text-caption)] leading-relaxed opacity-95">
              Add a bright photo later — cooks love a clear thumbnail.
            </p>
            <span className="sr-only">{title}</span>
          </div>
        )}
      </div>
    </section>
  );
}
