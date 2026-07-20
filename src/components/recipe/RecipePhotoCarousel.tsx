"use client";

import {
  RecipeMediaGallery,
  type RecipeMediaSlide,
} from "@/components/recipe/RecipeMediaGallery";

type RecipePhotoCarouselProps = {
  title: string;
  imageUrls: string[];
  imageAlt: string;
};

/** @deprecated Prefer RecipeMediaGallery — kept for imports that pass photos only. */
export function RecipePhotoCarousel({
  title,
  imageUrls,
  imageAlt,
}: RecipePhotoCarouselProps) {
  const slides: RecipeMediaSlide[] = imageUrls
    .filter((url) => url.trim())
    .map((url) => ({ kind: "image", url }));

  if (slides.length === 0) {
    return null;
  }

  return (
    <RecipeMediaGallery title={title} imageAlt={imageAlt} slides={slides} />
  );
}
