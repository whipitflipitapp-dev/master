"use client";

import { buildInstagramEmbedIframeSrc } from "@/lib/video-url";

type InstagramEmbedProps = {
  embedSrc: string;
  title: string;
  priority?: boolean;
  tapForSoundHint?: string;
  /** Shown under player — use in-frame controls, not “Open in Instagram” when possible. */
  inAppHint?: string;
  variant?: "default" | "reel";
  /** When false, iframe is not mounted (carousel off-screen slides). */
  active?: boolean;
};

/**
 * Official Instagram embed iframe only — never render user-supplied HTML.
 */
export function InstagramEmbed({
  embedSrc,
  title,
  priority = false,
  tapForSoundHint,
  inAppHint,
  variant = "default",
  active = true,
}: InstagramEmbedProps) {
  const src = buildInstagramEmbedIframeSrc(embedSrc);

  const frame = active ? (
    <iframe
      title={title}
      src={src}
      className={
        variant === "reel"
          ? "absolute inset-0 h-full w-full border-0 bg-black"
          : "block min-h-[min(72vh,640px)] w-full border-0 bg-black sm:min-h-[560px]"
      }
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      loading={priority ? "eager" : "lazy"}
      referrerPolicy="strict-origin-when-cross-origin"
    />
  ) : (
    <div
      className={
        variant === "reel"
          ? "absolute inset-0 bg-black"
          : "min-h-[min(72vh,640px)] w-full bg-black sm:min-h-[560px]"
      }
      aria-hidden
    />
  );

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black shadow-[var(--shadow-card)]">
        {variant === "reel" ? (
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[min(100%,400px)]">
            {frame}
          </div>
        ) : (
          <div className="relative mx-auto w-full max-w-[540px]">{frame}</div>
        )}
      </div>
      {inAppHint ? (
        <p className="text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
          {inAppHint}
        </p>
      ) : null}
      {tapForSoundHint ? (
        <p className="text-[length:var(--text-caption)] text-[var(--muted)]">
          {tapForSoundHint}
        </p>
      ) : null}
    </div>
  );
}
