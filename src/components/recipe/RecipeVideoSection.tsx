import type { ParsedRecipeVideo } from "@/lib/video-url";

type RecipeVideoSectionProps = {
  video: Extract<ParsedRecipeVideo, { provider: "youtube" }>;
  heading: string;
  frameTitle: string;
  tapForSoundHint: string;
};

/** YouTube video block (Instagram plays in the detail hero via RecipeDetailMedia). */
export function RecipeVideoSection({
  video,
  heading,
  frameTitle,
  tapForSoundHint,
}: RecipeVideoSectionProps) {
  return (
    <section className="mt-12" aria-labelledby="video-heading">
      <h2
        id="video-heading"
        className="text-xl font-semibold tracking-tight text-[var(--text)]"
      >
        {heading}
      </h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-black shadow-[var(--shadow-card)]">
        <div className="aspect-video w-full">
          <iframe
            title={frameTitle}
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&mute=1&playsinline=1`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <p className="border-t border-white/10 px-3 py-2 text-[length:var(--text-caption)] text-white/70">
          {tapForSoundHint}
        </p>
      </div>
    </section>
  );
}
