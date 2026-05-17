import Link from "next/link";
import type { Metadata } from "next";

import { AdminSignupsChart } from "@/components/admin/AdminSignupsChart";
import {
  parseAdminAffiliateLinkTypes,
  parseAdminMetricsOverview,
  parseAdminRecentEvents,
} from "@/lib/admin/metrics-types";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { logServerError } from "@/lib/server-error";

export const metadata: Metadata = {
  title: "Admin | Whip It Flip It",
  robots: { index: false, follow: false },
};

const EVENTS_PAGE_SIZE = 50;

function cardClass() {
  return "rounded-2xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] p-5 shadow-sm";
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

  const [overviewRes, eventsRes, affiliateLinkTypesRes] = await Promise.all([
    supabase.rpc("admin_metrics_overview", { p_since: sinceIso }),
    supabase.rpc("admin_recent_events", {
      p_limit: EVENTS_PAGE_SIZE,
      p_offset: offset,
    }),
    supabase.rpc("admin_affiliate_link_types_recent", { p_since: sinceIso }),
  ]);

  const metrics = parseAdminMetricsOverview(overviewRes.data);
  const recentEvents = parseAdminRecentEvents(eventsRes.data);
  const affiliateLinkTypes = parseAdminAffiliateLinkTypes(
    affiliateLinkTypesRes.data,
  );
  const overviewError = Boolean(overviewRes.error);
  const eventsError = Boolean(eventsRes.error);
  const affiliateLinkTypesError = Boolean(affiliateLinkTypesRes.error);
  if (overviewRes.error) logServerError("admin.metrics_overview", overviewRes.error);
  if (eventsRes.error) logServerError("admin.recent_events", eventsRes.error);
  if (affiliateLinkTypesRes.error) {
    logServerError("admin.affiliate_link_types", affiliateLinkTypesRes.error);
  }

  const exportSince = encodeURIComponent(sinceIso);
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = recentEvents.length === EVENTS_PAGE_SIZE ? page + 1 : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
      <p className="text-sm text-[var(--muted)]">
        Metrics use admin-only database functions (no service role in the
        browser). Events in cards are from the last 7 days (UTC window).
      </p>

      {overviewError ? (
        <p className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] p-4 text-sm text-[var(--text)]">
          Could not load metrics. Apply latest Supabase migrations if this is a
          new environment.
        </p>
      ) : metrics ? (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            <li className={cardClass()}>
              <p className="text-sm text-[var(--muted)]">Profiles</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text)]">
                {metrics.profile_count}
              </p>
            </li>
            <li className={cardClass()}>
              <p className="text-sm text-[var(--muted)]">Recipes</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text)]">
                {metrics.recipe_count}
              </p>
            </li>
            <li className={cardClass()}>
              <p className="text-sm text-[var(--muted)]">Favorites (all users)</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text)]">
                {metrics.favorites_total}
              </p>
            </li>
            <li className={cardClass()}>
              <p className="text-sm text-[var(--muted)]">
                Events (last 7 days)
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text)]">
                {metrics.events_since_count}
              </p>
            </li>
            <li className={cardClass()}>
              <p className="text-sm text-[var(--muted)]">
                Affiliate clicks (7 days)
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text)]">
                {metrics.affiliate_clicks_since}
              </p>
            </li>
          </ul>

          <section className="mt-8" aria-labelledby="event-types-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2
                id="event-types-heading"
                className="text-base font-semibold text-[var(--text)]"
              >
                Event types (last 7 days)
              </h2>
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

          <section className="mt-8" aria-labelledby="signups-heading">
            <h2
              id="signups-heading"
              className="text-base font-semibold text-[var(--text)]"
            >
              User signups (approx. last 30 days)
            </h2>
            <div className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-3 py-2 shadow-sm">
              <AdminSignupsChart data={metrics.user_signups_by_day} />
            </div>
          </section>
        </>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Metrics returned an unexpected shape. Check migrations and RPC
          definitions.
        </p>
      )}

      <section className="mt-10" aria-labelledby="recent-events-heading">
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
