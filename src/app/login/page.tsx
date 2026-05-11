import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/LoginForm";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  return {
    title: dictText(dict, "login_meta_title", { brand: dict.brand }),
    description: dictText(dict, "login_meta_desc"),
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; sent?: string }>;
}) {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const params = await searchParams;
  const initialError = params.error ? decodeURIComponent(params.error) : null;
  const defaultNext =
    params.next && params.next.startsWith("/") ? params.next : "/profile";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-10">
      <header className="pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          {dictText(dict, "login_title")}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          {dictText(dict, "login_subtitle")}
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-[var(--muted)]">
            {dictText(dict, "login_loading")}
          </p>
        }
      >
        <LoginForm defaultNext={defaultNext} initialError={initialError} />
      </Suspense>
    </main>
  );
}
