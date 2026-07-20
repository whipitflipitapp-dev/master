import { RecipeDetailHero } from "@/components/recipe/RecipeDetailHero";
import { RecipeDetailReelSection } from "@/components/recipe/RecipeDetailReelSection";
import {
  RecipeMediaGallery,
  type RecipeMediaSlide,
} from "@/components/recipe/RecipeMediaGallery";

type RecipeDetailMediaProps = {
  title: string;
  imageUrl: string | null;
  galleryImageUrls?: string[];
  imageAlt: string;
  hostedReelUrl?: string | null;
  /** Legacy Instagram reel permalink (when no hosted upload). */
  instagramEmbedSrc?: string | null;
  instagramInAppHint?: string;
  instagramTapForSoundHint?: string;
  /** Optional cover/thumbnail shown until the user presses play. */
  reelPosterUrl?: string | null;
  videoFrameTitle: string;
  hostedReelHint?: string;
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

function photoSlides(photos: string[]): RecipeMediaSlide[] {
  return photos.map((url) => ({ kind: "image", url }));
}

/** Recipe detail: photos first, compact reel (hosted or Instagram) below. */
export function RecipeDetailMedia({
  title,
  imageUrl,
  galleryImageUrls,
  imageAlt,
  hostedReelUrl,
  instagramEmbedSrc,
  instagramInAppHint,
  instagramTapForSoundHint,
  reelPosterUrl,
  videoFrameTitle,
  hostedReelHint,
}: RecipeDetailMediaProps) {
  const photos = resolveGalleryUrls(galleryImageUrls, imageUrl);
  const hosted = hostedReelUrl?.trim() || null;
  const instagram =
    !hosted && instagramEmbedSrc?.trim() ? instagramEmbedSrc.trim() : null;
  const hasReelBlock = Boolean(hosted || instagram);

  const slides = photoSlides(photos);

  if (!hasReelBlock && slides.length === 0) {
    return (
      <RecipeDetailHero title={title} imageUrl={null} imageAlt={imageAlt} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {slides.length === 0 ? null : slides.length === 1 && !hasReelBlock ? (
        <RecipeDetailHero
          title={title}
          imageUrl={slides[0]!.url}
          imageAlt={imageAlt}
        />
      ) : slides.length > 0 ? (
        <RecipeMediaGallery
          title={title}
          imageAlt={imageAlt}
          slides={slides}
        />
      ) : null}

      {hasReelBlock ? (
        <RecipeDetailReelSection
          videoFrameTitle={videoFrameTitle}
          posterUrl={reelPosterUrl}
          hostedReelUrl={hosted}
          hostedReelHint={hostedReelHint}
          instagramEmbedSrc={instagram}
          instagramInAppHint={instagramInAppHint}
          instagramTapForSoundHint={instagramTapForSoundHint}
        />
      ) : null}
    </div>
  );
}
