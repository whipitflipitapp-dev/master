import { RecipeDetailHero } from "@/components/recipe/RecipeDetailHero";
import {
  RecipeMediaGallery,
  type RecipeMediaSlide,
} from "@/components/recipe/RecipeMediaGallery";

type RecipeDetailMediaProps = {
  title: string;
  imageUrl: string | null;
  galleryImageUrls?: string[];
  imageAlt: string;
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

/** Recipe detail hero / photo gallery at top of page. */
export function RecipeDetailMedia({
  title,
  imageUrl,
  galleryImageUrls,
  imageAlt,
}: RecipeDetailMediaProps) {
  const photos = resolveGalleryUrls(galleryImageUrls, imageUrl);
  const slides = photoSlides(photos);

  if (slides.length === 0) {
    return (
      <RecipeDetailHero title={title} imageUrl={null} imageAlt={imageAlt} />
    );
  }

  if (slides.length === 1) {
    return (
      <RecipeDetailHero
        title={title}
        imageUrl={slides[0]!.url}
        imageAlt={imageAlt}
      />
    );
  }

  return (
    <RecipeMediaGallery title={title} imageAlt={imageAlt} slides={slides} />
  );
}
