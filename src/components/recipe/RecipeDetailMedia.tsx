import { RecipeDetailHero } from "@/components/recipe/RecipeDetailHero";
import { RecipeHostedReelPlayer } from "@/components/recipe/RecipeHostedReelPlayer";
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

/** Recipe detail: hosted reel (Pro upload) + photo gallery below. */
export function RecipeDetailMedia({
  title,
  imageUrl,
  galleryImageUrls,
  imageAlt,
  hostedReelUrl,
  reelPosterUrl,
  videoFrameTitle,
  hostedReelHint,
}: RecipeDetailMediaProps) {
  const photos = resolveGalleryUrls(galleryImageUrls, imageUrl);
  const hosted = hostedReelUrl?.trim() || null;
  const poster =
    reelPosterUrl?.trim() || photos[0]?.trim() || imageUrl?.trim() || null;

  const slides = photoSlides(photos);
  const hasReelBlock = Boolean(hosted);

  if (!hasReelBlock && slides.length === 0) {
    return (
      <RecipeDetailHero title={title} imageUrl={null} imageAlt={imageAlt} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hosted ? (
        <div className="space-y-2">
          <RecipeHostedReelPlayer
            src={hosted}
            title={videoFrameTitle}
            posterUrl={poster}
          />
          {hostedReelHint ? (
            <p className="text-[length:var(--text-caption)] text-[var(--muted)]">
              {hostedReelHint}
            </p>
          ) : null}
        </div>
      ) : null}

      {slides.length === 0 ? null : slides.length === 1 && !hasReelBlock ? (
        <RecipeDetailHero
          title={title}
          imageUrl={slides[0]!.url}
          imageAlt={imageAlt}
        />
      ) : (
        <RecipeMediaGallery
          title={title}
          imageAlt={imageAlt}
          slides={slides}
        />
      )}
    </div>
  );
}
