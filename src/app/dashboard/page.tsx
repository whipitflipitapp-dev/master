import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  return {
    title: dictText(dict, "dashboard_meta_title", { brand: dict.brand }),
    description: dictText(dict, "dashboard_meta_desc"),
  };
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {dictText(dict, "dashboard_title")}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {dictText(dict, "dashboard_env_hint")}
        </p>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const [favCountRes, authoredRes] = await Promise.all([
    supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase.from("recipes").select("favorites_count").eq("created_by", user.id),
  ]);

  if (favCountRes.error) {
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {dictText(dict, "dashboard_title")}
        </h1>
        <p className="text-sm text-[var(--danger)]" role="alert">
          {favCountRes.error.message}
        </p>
      </main>
    );
  }

  if (authoredRes.error) {
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {dictText(dict, "dashboard_title")}
        </h1>
        <p className="text-sm text-[var(--danger)]" role="alert">
          {authoredRes.error.message}
        </p>
      </main>
    );
  }

  const savedCount =
    typeof favCountRes.count === "number" ? favCountRes.count : 0;
  const authored = authoredRes.data;

  let savesReceivedTotal = 0;
  const rows = authored ?? [];
  for (const row of rows as { favorites_count: number }[]) {
    savesReceivedTotal +=
      typeof row.favorites_count === "number" ? row.favorites_count : 0;
  }

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col gap-6 px-5 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {dictText(dict, "dashboard_title")}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          {dictText(dict, "dashboard_subtitle")}
        </p>
      </header>

      <dl className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
          <dt className="text-sm font-semibold text-[var(--text)]">
            {dictText(dict, "dashboard_stat_saved")}
          </dt>
          <dd className="text-lg font-bold tabular-nums text-[var(--primary)]">
            {savedCount}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-sm font-semibold text-[var(--text)]">
            {dictText(dict, "dashboard_stat_saves_on_yours")}
          </dt>
          <dd className="text-lg font-bold tabular-nums text-[var(--primary)]">
            {savesReceivedTotal}
          </dd>
        </div>
      </dl>

      <nav className="flex flex-wrap gap-3">
        <Link
          href="/saved"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
        >
          {dictText(dict, "dashboard_open_saved")}
        </Link>
        <Link
          href="/dashboard/cookbooks"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
        >
          {dictText(dict, "dashboard_cookbooks")}
        </Link>
        <Link
          href="/recipes"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
        >
          {dictText(dict, "dashboard_browse_recipes")}
        </Link>
      </nav>
    </main>
  );
}
