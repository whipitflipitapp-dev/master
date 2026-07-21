import Link from "next/link";

import { normalizeRecipeCoverImgSrc } from "@/lib/demo-recipe-cover-images";
import type { HomeInstagramReelItem } from "@/lib/video-url";

type HomeInstagramReelsFeedProps = {
  items: HomeInstagramReelItem[];
  heading: string;
};

/**
 * Compact horizontal strip of recipe Instagram Reels (poster + link).
 * No Instagram player in the feed — keeps the homepage light.
 */
export function HomeInstagramReelsFeed({
  items,
  heading,
}: HomeInstagramReelsFeedProps) {
  if (items.length === 0) return null;

  return (
    <section
      className="mt-7 w-full max-w-md"
      aria-labelledby="home-reels-heading"
    >
      <h2
        id="home-reels-heading"
        className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/90 drop-shadow-md"
      >
        {heading}
      </h2>
      <ul className="-mx-1 flex list-none touch-pan-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin] snap-x snap-mandatory">
        {items.map((item) => {
          const thumb =
            typeof item.imageUrl === "string" && item.imageUrl.trim().length > 0
              ? normalizeRecipeCoverImgSrc(item.imageUrl)
              : null;
          return (
            <li
              key={item.recipeId}
              className="w-[7.25rem] shrink-0 snap-start sm:w-[8rem]"
            >
              <Link
                href={`/recipes/${item.recipeId}`}
                className="group block overflow-hidden rounded-2xl border border-white/20 bg-black/40 shadow-lg backdrop-blur-sm transition-[transform,border-color] duration-200 hover:border-[#ea580c]/70 active:scale-[0.98]"
              >
                <span className="relative block aspect-[9/14] w-full overflow-hidden bg-neutral-900">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- recipe storage / demo covers
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <span
                      className="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#1c1917_0%,#292524_55%,#431407_100%)] text-3xl opacity-80"
                      aria-hidden
                    >
                      ▶
                    </span>
                  )}
                  <span
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10"
                    aria-hidden
                  />
                  <span
                    className="pointer-events-none absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/45 text-sm text-white shadow-md backdrop-blur-[2px]"
                    aria-hidden
                  >
                    ▶
                  </span>
                  <span className="absolute inset-x-0 bottom-0 p-2">
                    <span className="line-clamp-2 text-[0.7rem] font-semibold leading-snug text-white drop-shadow">
                      {item.title}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
