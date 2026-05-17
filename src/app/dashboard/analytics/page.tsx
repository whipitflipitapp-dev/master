import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UpgradePitch } from "@/components/billing/UpgradePitch";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import {
  parseCreatorAnalyticsOverview,
  type CreatorAnalyticsDay,
} from "@/lib/creator-analytics";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  return {
    title: dictText(dict, "creator_analytics_meta_title", {
      brand: dict.brand,
    }),
    description: dictText(dict, "creator_analytics_meta_desc"),
  };
}

export const dynamic = "force-dynamic";

function statCard(label: string, value: number) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
      <p className="text-[length:var(--text-caption)] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text)]">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function TrendBars({
  rows,
  locale,
  empty,
}: {
  rows: CreatorAnalyticsDay[];
  locale: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-[var(--muted)]">{empty}</p>;
  }

  const maxViews = Math.max(...rows.map((row) => row.views), 1);
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });

  return (
    <ol className="mt-4 space-y-3">
      {rows.slice(-14).map((row) => {
        const width = Math.max(8, Math.round((row.views / maxViews) * 100));
        const label = formatter.format(new Date(`${row.day}T00:00:00Z`));
        return (
          <li key={row.day} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 text-sm">
            <span className="text-[length:var(--text-caption)] text-[var(--muted)]">
              {label}
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted)_16%,transparent)]">
              <span
                className="block h-full rounded-full bg-[var(--primary)]"
                style={{ width: `${width}%` }}
              />
            </span>
            <span className="text-right tabular-nums text-[var(--text)]">
              {row.views}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function CreatorAnalyticsPage() {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <ContentPageBackdrop pageKey="/dashboard/analytics">
        <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 px-5 py-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {dictText(dict, "creator_analytics_title")}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {dictText(dict, "dashboard_env_hint")}
          </p>
        </main>
      </ContentPageBackdrop>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/analytics");
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc("creator_analytics_overview", {
    p_since: since,
  });
  const analytics = parseCreatorAnalyticsOverview(data);

  return (
    <ContentPageBackdrop pageKey="/dashboard/analytics">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-8">
        <header className="border-b border-[var(--border)] pb-6">
          <p className="text-sm font-semibold text-[var(--muted)]">
            <Link
              href="/dashboard"
              className="text-[var(--primary)] underline-offset-4 hover:underline"
            >
              {dictText(dict, "dashboard_title")}
            </Link>
            <span aria-hidden className="px-1.5">
              /
            </span>
            {dictText(dict, "creator_analytics_breadcrumb")}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)]">
            {dictText(dict, "creator_analytics_title")}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
            {dictText(dict, "creator_analytics_subtitle")}
          </p>
        </header>

        {error ? (
          <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--danger)]" role="alert">
            {error.message}
          </p>
        ) : !analytics ? (
          <p className="text-sm text-[var(--muted)]">
            {dictText(dict, "creator_analytics_unavailable")}
          </p>
        ) : analytics.locked ? (
          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
            <p className="text-base font-semibold text-[var(--text)]">
              {dictText(dict, "creator_analytics_locked_title")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {dictText(dict, "creator_analytics_locked_body")}
            </p>
            <div className="mt-5">
              <UpgradePitch currentPlan={analytics.planType} compact showLogo={false} />
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2">
              {statCard(
                dictText(dict, "creator_analytics_published"),
                analytics.publishedCount,
              )}
              {statCard(
                dictText(dict, "creator_analytics_total_views"),
                analytics.totalViews,
              )}
              {statCard(
                dictText(dict, "creator_analytics_30d_views"),
                analytics.viewsSince,
              )}
              {statCard(
                dictText(dict, "creator_analytics_saves"),
                analytics.savesTotal,
              )}
              {statCard(
                dictText(dict, "creator_analytics_affiliate_clicks"),
                analytics.affiliateClicksSince,
              )}
              {statCard(
                dictText(dict, "creator_analytics_cookbook_clicks"),
                analytics.cookbookClicksSince,
              )}
            </section>

            <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                {dictText(dict, "creator_analytics_trend_heading")}
              </h2>
              <TrendBars
                rows={analytics.viewsByDay}
                locale={locale}
                empty={dictText(dict, "creator_analytics_trend_empty")}
              />
            </section>

            <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                {dictText(dict, "creator_analytics_top_heading")}
              </h2>
              {analytics.topRecipes.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {dictText(dict, "creator_analytics_top_empty")}
                </p>
              ) : (
                <ol className="mt-4 divide-y divide-[var(--border)]">
                  {analytics.topRecipes.map((recipe) => (
                    <li
                      key={recipe.id}
                      className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="font-semibold text-[var(--text)] underline-offset-4 hover:text-[var(--primary)] hover:underline"
                      >
                        {recipe.title}
                      </Link>
                      <span className="text-[length:var(--text-caption)] text-[var(--muted)]">
                        {dictText(dict, "creator_analytics_top_recipe_stats", {
                          views: recipe.views,
                          saves: recipe.saves,
                        })}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </main>
    </ContentPageBackdrop>
  );
}
