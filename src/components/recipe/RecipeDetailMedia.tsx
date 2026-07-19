import { InstagramEmbed } from "@/components/recipe/InstagramEmbed";
import { RecipeDetailHero } from "@/components/recipe/RecipeDetailHero";
import type { ParsedRecipeVideo } from "@/lib/video-url";

type RecipeDetailMediaProps = {
  title: string;
  imageUrl: string | null;
  imageAlt: string;
  video: ParsedRecipeVideo | null;
  videoFrameTitle: string;
  tapForSoundHint: string;
};

/**
 * Media stack for recipe detail.
 * Instagram URLs: Reel/Post embed first (retention), then cover photo if present.
 * Otherwise: existing image-first hero unchanged. YouTube stays in a later section.
 */
export function RecipeDetailMedia({
  title,
  imageUrl,
  imageAlt,
  video,
  videoFrameTitle,
  tapForSoundHint,
}: RecipeDetailMediaProps) {
  const isInstagram = video?.provider === "instagram";

  if (isInstagram && video.provider === "instagram") {
    return (
      <div className="space-y-4">
        <InstagramEmbed
          embedSrc={video.instagram.embedSrc}
          title={videoFrameTitle}
          priority
          tapForSoundHint={tapForSoundHint}
        />
        {imageUrl ? (
          <RecipeDetailHero
            title={title}
            imageUrl={imageUrl}
            imageAlt={imageAlt}
          />
        ) : null}
      </div>
    );
  }

  return (
    <RecipeDetailHero title={title} imageUrl={imageUrl} imageAlt={imageAlt} />
  );
}
