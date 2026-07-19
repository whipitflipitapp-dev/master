import { listLatestInstagramRecipeReels } from "@/app/actions/recipes";
import { SplashHome } from "@/components/splash/SplashHome";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";

export default async function Home() {
  const [reels, locale] = await Promise.all([
    listLatestInstagramRecipeReels(12),
    resolveAppLocale(),
  ]);
  const dict = await getDictionary(locale);

  return (
    <SplashHome
      instagramReels={reels}
      reelsHeading={dictText(dict, "home_reels_heading")}
    />
  );
}
