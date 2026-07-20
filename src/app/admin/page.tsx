import Link from "next/link";
import type { Metadata } from "next";

import { AdminDailyLineChart } from "@/components/admin/AdminDailyLineChart";
import { AdminModerationPanel } from "@/components/admin/AdminModerationPanel";
import { AdminPlanMixChart } from "@/components/admin/AdminPlanMixChart";
import { AdminRevenueCharts } from "@/components/admin/AdminRevenueCharts";
import { AdminSignupsChart } from "@/components/admin/AdminSignupsChart";
import {
  adminMetricCardClass,
  adminSectionShellClass,
} from "@/components/admin/admin-section-styles";
import { formatUsdFromCents } from "@/lib/admin/format-usd";
import {
  parseAdminAffiliateLinkTypes,
  parseAdminMetricsOverview,
  parseAdminRecentEvents,
} from "@/lib/admin/metrics-types";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { fetchAdminStripeBusinessMetrics } from "@/lib/admin/stripe-metrics";
import { logServerError } from "@/lib/server-error";

export const metadata: Metadata = {
  title: "Business command center | Whip It Flip It",
  robots: { index: false, follow: false },
};

const EVENTS_PAGE_SIZE = 50;
const SUGGESTIONS_LIMIT = 25;

type AdminSuggestionRow = {
  id: string;
  user_id: string;
  suggestion: string;
  submitter_email: string;
  submitter_name: string | null;
  status: string;
  created_at: string;
};

function cardClass() {
  return adminMetricCardClass();
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ev?: string }>;
}) {
  const { supabase } = await requireAdminSession();
  const sp = await searchParams;
  const pageRaw = sp.ev ?? "1";
  const page =
    Number.isFinite(Number(pageRaw)) && Number(pageRaw) >= 1
      ? Math.floor(Number(pageRaw))
      : 1;
  const offset = (page - 1) * EVENTS_PAGE_SIZE;

  const sinceDate = new Date();
  sinceDate.setUTCDate(sinceDate.getUTCDate() - 7);
  const sinceIso = sinceDate.toISOString();

  const [overviewRes, eventsRes, affiliateLinkTypesRes, suggestionsRes, stripeMetrics] =
    await Promise.all([
      supabase.rpc("admin_metrics_overview", { p_since: sinceIso }),
      supabase.rpc("admin_recent_events", {
        p_limit: EVENTS_PAGE_SIZE,
        p_offset: offset,
      }),
      supabase.rpc("admin_affiliate_link_types_recent", { p_since: sinceIso }),
      supabase
        .from("suggestions")
        .select(
          "id,user_id,suggestion,submitter_email,submitter_name,status,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(SUGGESTIONS_LIMIT),
      fetchAdminStripeBusinessMetrics(supabase),
    ]);

  const metrics = parseAdminMetricsOverview(overviewRes.data);
  const recentEvents = parseAdminRecentEvents(eventsRes.data);
  const affiliateLinkTypes = parseAdminAffiliateLinkTypes(
    affiliateLinkTypesRes.data,
  );
  const overviewError = Boolean(overviewRes.error);
  const eventsError = Boolean(eventsRes.error);
  const affiliateLinkTypesError = Boolean(affiliateLinkTypesRes.error);
  const suggestionsError = Boolean(suggestionsRes.error);
  const suggestions = (suggestionsRes.data ?? []) as AdminSuggestionRow[];
  if (overviewRes.error) logServerError("admin.metrics_overview", overviewRes.error);
  if (eventsRes.error) logServerError("admin.recent_events", eventsRes.error);
  if (affiliateLinkTypesRes.error) {
    logServerError("admin.affiliate_link_types", affiliateLinkTypesRes.error);
  }
  if (suggestionsRes.error) {
    logServerError("admin.suggestions", suggestionsRes.error);
  }

  const exportSince = encodeURIComponent(sinceIso);
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = recentEvents.length === EVENTS_PAGE_SIZE ? page + 1 : null;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6">
      <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
        Revenue from Stripe (live API). Product metrics from admin-only database
        RPCs — last 7 days for activity cards unless noted. No service role keys in
        the browser.
      </p>

      <section id="revenue" className={`mt-8 ${adminSectionShellClass("revenue")}`}>
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Revenue & subscriptions
        </h2>
        {!stripeMetrics.configured ? (
          <p className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
            {stripeMetrics.error ??
              "Add STRIPE_SECRET_KEY on the server to load MRR, cash collected, and revenue-by-product charts."}
          </p>
        ) : stripeMetrics.error ? (
          <p className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-4 text-sm text-[var(--danger)]">
            Stripe metrics unavailable: {stripeMetrics.error}
          </p>
        ) : (
          <>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">MRR (estimated)</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
                  {formatUsdFromCents(stripeMetrics.mrrCents)}
                </p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">ARR (MRR × 12)</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
                  {formatUsdFromCents(stripeMetrics.arrCents)}
                </p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Net collected (30d)</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
                  {formatUsdFromCents(stripeMetrics.netCollected30dCents)}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Refunds 30d: {formatUsdFromCents(stripeMetrics.refunds30dCents)}
                </p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Cash collected (30d)</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
                  {formatUsdFromCents(stripeMetrics.grossCollected30dCents)}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  7d: {formatUsdFromCents(stripeMetrics.grossCollected7dCents)} · 90d:{" "}
                  {formatUsdFromCents(stripeMetrics.grossCollected90dCents)}
                </p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Active subscriptions</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
                  {stripeMetrics.activeSubscriptions}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Trialing {stripeMetrics.trialingSubscriptions} · Past due{" "}
                  {stripeMetrics.pastDueSubscriptions}
                </p>
              </li>
            </ul>

            <div className="mt-6 rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--bg)_90%,var(--card))] p-4 shadow-sm">
              <AdminRevenueCharts
                revenueByDay30d={stripeMetrics.revenueByDay30d}
                revenueByType={stripeMetrics.revenueByType}
              />
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--bg)_90%,var(--card))] shadow-sm">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="border-b border-[color-mix(in_srgb,var(--muted)_35%,transparent)] text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Revenue type</th>
                    <th className="px-4 py-2.5 font-semibold">30d collected</th>
                    <th className="px-4 py-2.5 font-semibold">MRR</th>
                    <th className="px-4 py-2.5 font-semibold">Active subs</th>
                  </tr>
                </thead>
                <tbody>
                  {stripeMetrics.revenueByType.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-[color-mix(in_srgb,var(--muted)_18%,transparent)] last:border-b-0"
                    >
                      <td className="px-4 py-2 text-[var(--text)]">{row.label}</td>
                      <td className="px-4 py-2 tabular-nums text-[var(--text)]">
                        {formatUsdFromCents(row.collected30dCents)}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-[var(--text)]">
                        {formatUsdFromCents(row.mrrCents)}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-[var(--muted)]">
                        {row.activeSubscriptions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {stripeMetrics.ledgerPowered ? (
                <>
                  Cash totals use the billing_events webhook ledger (
                  {stripeMetrics.ledgerEntryCount} entries). MRR still reads live
                  subscriptions from Stripe.
                </>
              ) : (
                <>
                  Ledger empty — cash totals fall back to Stripe invoice API. After{" "}
                  <code className="text-[10px]">db push</code>, enable webhook events{" "}
                  <code className="text-[10px]">invoice.paid</code>,{" "}
                  <code className="text-[10px]">refund.created</code>, and{" "}
                  <code className="text-[10px]">charge.refunded</code>.
                </>
              )}{" "}
              Affiliate commissions are not in these totals.
            </p>
          </>
        )}
      </section>

      {overviewError ? (
        <p className="mt-8 rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] p-4 text-sm text-[var(--text)]">
          Could not load product metrics. Apply latest Supabase migrations if this
          is a new environment.
        </p>
      ) : metrics ? (
        <>
          <section id="subscribers" className={`mt-8 ${adminSectionShellClass("subscribers")}`}>
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Subscribers & plan mix (database)
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Free</p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{metrics.plan_free_count}</p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Pro</p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{metrics.plan_pro_count}</p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">AI Chef</p>
                <p className="mt-2 text-2xl font-bold tabular-nums">
                  {metrics.plan_ai_chef_count}
                </p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Stripe customers</p>
                <p className="mt-2 text-2xl font-bold tabular-nums">
                  {metrics.stripe_customer_count}
                </p>
              </li>
            </ul>
            <div className="mt-4 max-w-md rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--bg)_90%,var(--card))] px-3 py-2 shadow-sm">
              <AdminPlanMixChart
                free={metrics.plan_free_count}
                pro={metrics.plan_pro_count}
                aiChef={metrics.plan_ai_chef_count}
              />
            </div>
          </section>

          <section id="growth" className={`mt-8 ${adminSectionShellClass("growth")}`}>
            <h2 className="text-lg font-semibold text-[var(--text)]">Product & growth</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Profiles (all time)</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{metrics.profile_count}</p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Recipes (all time)</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{metrics.recipe_count}</p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Recipes added (7d)</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {metrics.recipes_created_since}
                </p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Instagram Reel recipes</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {metrics.instagram_reel_recipe_count}
                </p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Favorites (all users)</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {metrics.favorites_total}
                </p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Checkouts started (7d)</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {metrics.checkout_started_since}
                </p>
              </li>
            </ul>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-base font-semibold text-[var(--text)]">
                  User signups (~30 days)
                </h3>
                <div className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--bg)_90%,var(--card))] px-3 py-2 shadow-sm">
                  <AdminSignupsChart data={metrics.user_signups_by_day} />
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text)]">
                  Recipes created (~30 days)
                </h3>
                <div className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--bg)_90%,var(--card))] px-3 py-2 shadow-sm">
                  <AdminDailyLineChart
                    data={metrics.recipes_created_by_day}
                    seriesName="Recipes"
                    emptyMessage="No new recipes in this window."
                    stroke="var(--accent)"
                  />
                </div>
              </div>
            </div>
          </section>

          <section id="engagement" className={`mt-8 ${adminSectionShellClass("engagement")}`}>
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Engagement & monetization adjacency
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Recipe views (7d)</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {metrics.recipe_views_since}
                </p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Telemetry events (7d)</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {metrics.events_since_count}
                </p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">Affiliate clicks (7d)</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {metrics.affiliate_clicks_since}
                </p>
              </li>
              <li className={cardClass()}>
                <p className="text-sm text-[var(--muted)]">AI tool uses (7d)</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {metrics.ai_events_since}
                </p>
              </li>
            </ul>

            <div className="mt-6">
              <h3 className="text-base font-semibold text-[var(--text)]">
                Recipe views (~30 days)
              </h3>
              <div className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--bg)_90%,var(--card))] px-3 py-2 shadow-sm">
                <AdminDailyLineChart
                  data={metrics.recipe_views_by_day}
                  seriesName="Views"
                  emptyMessage="No recipe views logged yet."
                />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
              <h3
                id="event-types-heading"
                className="text-base font-semibold text-[var(--text)]"
              >
                Event types (last 7 days)
              </h3>
              <Link
                href={`/api/admin/export/events?since=${exportSince}`}
                className="text-xs font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
              >
                Export events CSV ↓
              </Link>
            </div>
            {metrics.event_types_since.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                No events in this window.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[color-mix(in_srgb,var(--muted)_28%,transparent)] rounded-2xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-4 py-1 text-sm shadow-sm">
                {metrics.event_types_since.map((row) => (
                  <li
                    key={row.event_type}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <span className="truncate font-medium text-[var(--text)]">
                      {row.event_type}
                    </span>
                    <span className="tabular-nums text-[var(--muted)]">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <h3
              id="ai-event-types-heading"
              className="mt-8 text-base font-semibold text-[var(--text)]"
            >
              AI usage by tool (last 7 days)
            </h3>
            {metrics.ai_event_types_since.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No AI events in this window.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[color-mix(in_srgb,var(--muted)_28%,transparent)] rounded-2xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-4 py-1 text-sm shadow-sm">
                {metrics.ai_event_types_since.map((row) => (
                  <li
                    key={row.event_type}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <span className="truncate font-medium text-[var(--text)]">
                      {row.event_type}
                    </span>
                    <span className="tabular-nums text-[var(--muted)]">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="mt-8"
            aria-labelledby="affiliate-link-types-heading"
          >
            <h2
              id="affiliate-link-types-heading"
              className="text-base font-semibold text-[var(--text)]"
            >
              Top affiliate link types (last 7 days)
            </h2>
            {affiliateLinkTypesError ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Could not load affiliate link type metrics.
              </p>
            ) : affiliateLinkTypes.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                No affiliate clicks in this window.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[color-mix(in_srgb,var(--muted)_28%,transparent)] rounded-2xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-4 py-1 text-sm shadow-sm">
                {affiliateLinkTypes.map((row) => (
                  <li
                    key={row.link_type}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <span className="truncate font-medium text-[var(--text)]">
                      {row.link_type}
                    </span>
                    <span className="tabular-nums text-[var(--muted)]">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Metrics returned an unexpected shape. Check migrations and RPC
          definitions.
        </p>
      )}

      <section
        id="moderation"
        className={`mt-8 ${adminSectionShellClass("moderation")}`}
        aria-labelledby="moderation-heading"
      >
        <h2
          id="moderation-heading"
          className="text-lg font-semibold text-[var(--text)]"
        >
          Users, plans & moderation
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage accounts, complimentary chef access, email blocklist, and recipe
          takedowns. Requires{" "}
          <code className="text-[10px]">SUPABASE_SERVICE_ROLE_KEY</code> on the
          server (same as Stripe webhooks).
        </p>
        <div className="mt-5">
          <AdminModerationPanel />
        </div>
      </section>

      <section
        id="support"
        className={`mt-8 ${adminSectionShellClass("support")}`}
        aria-labelledby="suggestions-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="suggestions-heading"
              className="text-base font-semibold text-[var(--text)]"
            >
              Suggestion Box
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Latest user suggestions with submitter snapshots.
              {metrics ? (
                <>
                  {" "}
                  <span className="tabular-nums">
                    {metrics.suggestions_open_count} new · {metrics.suggestions_total_count}{" "}
                    total
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <span className="text-xs font-medium text-[var(--muted)]">
            Showing latest {SUGGESTIONS_LIMIT}
          </span>
        </div>
        {suggestionsError ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Could not load suggestions.
          </p>
        ) : suggestions.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No suggestions yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] shadow-sm">
            <table className="w-full min-w-[720px] border-collapse text-left text-[length:var(--text-caption)]">
              <thead className="border-b border-[color-mix(in_srgb,var(--muted)_35%,transparent)] text-[var(--muted)]">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                    Time
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                    Submitter
                  </th>
                  <th className="min-w-[18rem] px-4 py-2.5 font-semibold">
                    Suggestion
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[color-mix(in_srgb,var(--muted)_18%,transparent)] last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-[var(--text)]">
                      {new Date(item.created_at)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19)}
                    </td>
                    <td className="max-w-[14rem] px-4 py-2 text-[var(--text)]">
                      <span className="block truncate font-medium">
                        {item.submitter_name || "Unnamed user"}
                      </span>
                      <span className="block truncate text-[var(--muted)]">
                        {item.submitter_email || item.user_id}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[var(--text)]">
                      {item.suggestion}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-[var(--muted)]">
                      {item.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        id="events-log"
        className={`mt-8 ${adminSectionShellClass("events")}`}
        aria-labelledby="recent-events-heading"
      >
        <h2
          id="recent-events-heading"
          className="text-base font-semibold text-[var(--text)]"
        >
          Recent events
        </h2>
        {eventsError ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Could not load recent events.
          </p>
        ) : recentEvents.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No rows.</p>
        ) : (
          <>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] shadow-sm">
              <table className="w-full min-w-[640px] border-collapse text-left text-[length:var(--text-caption)]">
                <thead className="border-b border-[color-mix(in_srgb,var(--muted)_35%,transparent)] text-[var(--muted)]">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      Time
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      Type
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      User
                    </th>
                    <th className="min-w-[12rem] px-4 py-2.5 font-semibold">
                      Metadata
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((ev) => (
                    <tr
                      key={ev.id}
                      className="border-b border-[color-mix(in_srgb,var(--muted)_18%,transparent)] last:border-b-0"
                    >
                      <td className="whitespace-nowrap px-4 py-2 tabular-nums text-[var(--text)]">
                        {new Date(ev.created_at).toISOString().replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-[var(--text)]">
                        {ev.event_type}
                      </td>
                      <td className="max-w-[8rem] truncate px-4 py-2 text-[var(--muted)]">
                        {ev.user_id ?? "—"}
                      </td>
                      <td className="max-w-xs truncate px-4 py-2 text-[var(--muted)] font-mono text-[length:10px]">
                        {JSON.stringify(ev.metadata)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 text-sm">
              {prevPage ? (
                <Link
                  href={`/admin?ev=${prevPage}`}
                  className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
                >
                  ← Newer page
                </Link>
              ) : (
                <span />
              )}
              {nextPage ? (
                <Link
                  href={`/admin?ev=${nextPage}`}
                  className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
                >
                  Older page →
                </Link>
              ) : (
                <span />
              )}
            </div>
          </>
        )}
      </section>

      <p className="mt-10 text-xs text-[var(--muted)]">
        Service role keys must never be shipped to the client. Prefer these RPCs
        for cross-user aggregates.
      </p>
    </main>
  );
}
