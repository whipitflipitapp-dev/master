"use client";

type RecipeHostedReelPlayerProps = {
  src: string;
  title: string;
  posterUrl?: string | null;
};

/** Native in-app reel playback (Supabase-hosted file). Loads on demand until play. */
export function RecipeHostedReelPlayer({
  src,
  title,
  posterUrl,
}: RecipeHostedReelPlayerProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black shadow-[var(--shadow-card)]">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[min(100%,400px)]">
        <video
          className="absolute inset-0 h-full w-full object-contain"
          src={src}
          title={title}
          controls
          playsInline
          preload="none"
          poster={posterUrl ?? undefined}
        />
      </div>
    </div>
  );
}
