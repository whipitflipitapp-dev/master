"use client";

type InstagramEmbedProps = {
  embedSrc: string;
  title: string;
  /** Load eagerly in the hero — Instagram muted autoplay is best-effort. */
  priority?: boolean;
  /** Instagram does not expose reliable muted-autoplay controls to third parties. */
  tapForSoundHint?: string;
};

/**
 * Official Instagram embed iframe only — never render user-supplied HTML.
 * Muted autoplay is best-effort (browser + Instagram policy); tap for sound.
 */
export function InstagramEmbed({
  embedSrc,
  title,
  priority = false,
  tapForSoundHint,
}: InstagramEmbedProps) {
  // Instagram’s player often autoplays muted when visible; autoplay=1 is a soft hint.
  const src = embedSrc.includes("?")
    ? embedSrc
    : `${embedSrc}?autoplay=1`;

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black shadow-[var(--shadow-card)]">
        <div className="relative mx-auto w-full max-w-[540px]">
          <iframe
            title={title}
            src={src}
            className="block min-h-[min(72vh,640px)] w-full border-0 bg-black sm:min-h-[560px]"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
            loading={priority ? "eager" : "lazy"}
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
      {tapForSoundHint ? (
        <p className="text-[length:var(--text-caption)] text-[var(--muted)]">
          {tapForSoundHint}
        </p>
      ) : null}
    </div>
  );
}
