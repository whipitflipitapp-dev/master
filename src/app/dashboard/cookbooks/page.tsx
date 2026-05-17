import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CookbooksDashboardManager } from "@/components/cookbooks/CookbooksDashboardManager";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { getCurrentProfile } from "@/lib/profile";
import { GENERIC_LOAD_ERROR, logServerError } from "@/lib/server-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Cookbooks | Dashboard | Whip It Flip It",
  description: "Manage Amazon and Kindle affiliate cookbook links on your chef profile.",
};

export const dynamic = "force-dynamic";

export default async function DashboardCookbooksPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <ContentPageBackdrop pageKey="/dashboard/cookbooks">
      <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Cookbooks</h1>
        <p className="text-sm text-[var(--muted)]">
          Configure Supabase environment variables to manage cookbook links.
        </p>
      </main>
      </ContentPageBackdrop>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/cookbooks");
  }

  const profileCtx = await getCurrentProfile(supabase);
  const planType = profileCtx?.profile.plan_type ?? "free";

  const { data: rows, error } = await supabase
    .from("cookbooks")
    .select("id,title,description,cover_image_url,external_link")
    .eq("created_by", user.id)
    .order("title", { ascending: true });

  if (error) {
    logServerError("dashboard_cookbooks.list", error);
    return (
      <ContentPageBackdrop pageKey="/dashboard/cookbooks">
      <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Cookbooks</h1>
        <p className="text-sm text-[var(--danger)]" role="alert">
          {GENERIC_LOAD_ERROR}
        </p>
      </main>
      </ContentPageBackdrop>
    );
  }

  return (
    <ContentPageBackdrop pageKey="/dashboard/cookbooks">
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 py-8">
      <header>
        <p className="text-sm font-semibold text-[var(--muted)]">
          <Link
            href="/dashboard"
            className="text-[var(--primary)] underline-offset-4 hover:underline"
          >
            Dashboard
          </Link>
          <span aria-hidden className="px-1.5">
            /
          </span>
          Cookbooks
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)]">
          Cookbooks
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Links shown on your{" "}
          <Link
            href={`/chef/${user.id}`}
            className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            chef profile
          </Link>
          . Use HTTPS Amazon or shortened amzn URLs only.
        </p>
      </header>

      <CookbooksDashboardManager cookbooks={rows ?? []} planType={planType} />
    </main>
    </ContentPageBackdrop>
  );
}
