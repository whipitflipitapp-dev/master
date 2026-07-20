import { RecipeDetailHero } from "@/components/recipe/RecipeDetailHero";
import {
  RecipeMediaGallery,
  type RecipeMediaSlide,
} from "@/components/recipe/RecipeMediaGallery";
import type { ParsedRecipeVideo } from "@/lib/video-url";

type RecipeDetailMediaProps = {
  title: string;
  imageUrl: string | null;
  galleryImageUrls?: string[];
  imageAlt: string;
  video: ParsedRecipeVideo | null;
  videoFrameTitle: string;
  tapForSoundHint: string;
  instagramInAppHint?: string;
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

function buildMediaSlides(
  video: ParsedRecipeVideo | null,
  photos: string[],
  videoFrameTitle: string,
): RecipeMediaSlide[] {
  const slides: RecipeMediaSlide[] = [];
  if (video?.provider === "instagram") {
    slides.push({
      kind: "instagram",
      embedSrc: video.instagram.embedSrc,
      frameTitle: videoFrameTitle,
    });
  }
  for (const url of photos) {
    slides.push({ kind: "image", url });
  }
  return slides;
}

/**
 * Recipe detail hero: optional Instagram reel/post slide, then swipeable photos.
 */
export function RecipeDetailMedia({
  title,
  imageUrl,
  galleryImageUrls,
  imageAlt,
  video,
  videoFrameTitle,
  tapForSoundHint,
  instagramInAppHint,
}: RecipeDetailMediaProps) {
  const photos = resolveGalleryUrls(galleryImageUrls, imageUrl);
  const slides = buildMediaSlides(video, photos, videoFrameTitle);

  if (slides.length === 0) {
    return (
      <RecipeDetailHero title={title} imageUrl={null} imageAlt={imageAlt} />
    );
  }

  return (
    <RecipeMediaGallery
      title={title}
      imageAlt={imageAlt}
      slides={slides}
      tapForSoundHint={tapForSoundHint}
      instagramInAppHint={instagramInAppHint}
    />
  );
}
