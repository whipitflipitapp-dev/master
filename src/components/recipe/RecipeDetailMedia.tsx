import { InstagramEmbed } from "@/components/recipe/InstagramEmbed";
import { RecipeDetailHero } from "@/components/recipe/RecipeDetailHero";
import { RecipePhotoCarousel } from "@/components/recipe/RecipePhotoCarousel";
import type { ParsedRecipeVideo } from "@/lib/video-url";

type RecipeDetailMediaProps = {
  title: string;
  imageUrl: string | null;
  /** Ordered gallery URLs (first = thumbnail). Falls back to imageUrl when empty. */
  galleryImageUrls?: string[];
  imageAlt: string;
  video: ParsedRecipeVideo | null;
  videoFrameTitle: string;
  tapForSoundHint: string;
};

function resolveGalleryUrls(
  galleryImageUrls: string[] | undefined,
  imageUrl: string | null,
): string[] {
  const fromGallery = (galleryImageUrls ?? [])
    .map((u) => u.trim())
    .filter(Boolean);
  if (fromGallery.length > 0) {
    return fromGallery;
  }
  const cover = imageUrl?.trim();
  return cover ? [cover] : [];
}

function RecipePhotosBlock({
  title,
  imageUrls,
  imageAlt,
}: {
  title: string;
  imageUrls: string[];
  imageAlt: string;
}) {
  if (imageUrls.length === 0) {
    return (
      <RecipeDetailHero title={title} imageUrl={null} imageAlt={imageAlt} />
    );
  }
  if (imageUrls.length === 1) {
    return (
      <RecipeDetailHero
        title={title}
        imageUrl={imageUrls[0]}
        imageAlt={imageAlt}
      />
    );
  }
  return (
    <RecipePhotoCarousel
      title={title}
      imageUrls={imageUrls}
      imageAlt={imageAlt}
    />
  );
}

/**
 * Media stack for recipe detail.
 * Instagram URLs: Reel/Post embed first (retention), then photo gallery / cover.
 * Otherwise: photo gallery or hero. YouTube stays in a later section.
 */
export function RecipeDetailMedia({
  title,
  imageUrl,
  galleryImageUrls,
  imageAlt,
  video,
  videoFrameTitle,
  tapForSoundHint,
}: RecipeDetailMediaProps) {
  const photos = resolveGalleryUrls(galleryImageUrls, imageUrl);
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
        {photos.length > 0 ? (
          <RecipePhotosBlock
            title={title}
            imageUrls={photos}
            imageAlt={imageAlt}
          />
        ) : null}
      </div>
    );
  }

  return (
    <RecipePhotosBlock title={title} imageUrls={photos} imageAlt={imageAlt} />
  );
}
