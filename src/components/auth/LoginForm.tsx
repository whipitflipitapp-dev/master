"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function resolveBrowserSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

type LoginFormProps = {
  defaultNext: string;
  initialError: string | null;
  mode?: "signin" | "signup";
};

export function LoginForm({
  defaultNext,
  initialError,
  mode = "signin",
}: LoginFormProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(initialError);

  const nextPath = useMemo(() => {
    const q = searchParams.get("next");
    if (q && q.startsWith("/")) {
      return q;
    }
    return defaultNext;
  }, [defaultNext, searchParams]);

  const authCallbackUrl = useMemo(() => {
    const site = resolveBrowserSiteUrl();
    return `${site}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }, [nextPath]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setInlineError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setInlineError("Enter your email address.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setInlineError("Supabase is not configured. Check environment variables.");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: authCallbackUrl,
        },
      });
      if (error) {
        setInlineError(error.message);
        return;
      }
      router.push(`/login?sent=1&next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    });
  }

  async function signInWithGoogle() {
    setInlineError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setInlineError("Supabase is not configured. Check environment variables.");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authCallbackUrl,
        },
      });
      if (error) {
        setInlineError(error.message);
      }
    });
  }

  const sent = searchParams.get("sent") === "1";

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
        <p className="text-sm font-semibold text-[var(--text)]">
          {mode === "signup"
            ? t("login_title_signup")
            : t("login_title_signin")}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {mode === "signup"
            ? t("login_email_blurb_signup")
            : t("login_email_blurb_signin")}
        </p>

        {sent ? (
          <p
            className="mt-4 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-3 py-2 text-sm text-[var(--text)]"
            role="status"
          >
            Check your inbox for the sign-in link. You can close this tab.
          </p>
        ) : null}

        <form className="mt-4 flex flex-col gap-3" onSubmit={sendMagicLink}>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--text)]">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="min-h-[48px] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[color-mix(in_srgb,var(--primary)_45%,transparent)] transition-[border-color,box-shadow] focus:border-[color-mix(in_srgb,var(--primary)_55%,var(--border))] focus:ring-2"
              placeholder="you@example.com"
            />
          </label>

          {inlineError ? (
            <p
              className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--danger)]"
              role="alert"
            >
              {inlineError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="min-h-[48px] rounded-[var(--radius-card)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99] disabled:opacity-60"
          >
            {pending
              ? "Sending…"
              : mode === "signup"
                ? t("login_magic_cta_signup")
                : t("login_magic_cta_signin")}
          </button>
        </form>
      </div>

      <div className="relative flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--border)]" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-light)]">
          or
        </span>
        <span className="h-px flex-1 bg-[var(--border)]" aria-hidden />
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
        <button
          type="button"
          disabled={pending}
          onClick={() => void signInWithGoogle()}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-[background-color,border-color,transform] duration-200 hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_srgb,var(--card)_92%,var(--primary))] active:scale-[0.99] disabled:opacity-60"
        >
          <span aria-hidden className="text-lg">
            G
          </span>
          {t("login_google_cta")}
        </button>
        <p className="mt-3 text-xs text-[var(--muted)]">
          {t("login_google_hint")}
        </p>
      </div>

      <div className="flex flex-col gap-2 text-center">
        {mode === "signin" ? (
          <Link
            href={`/signup?next=${encodeURIComponent(nextPath)}`}
            className="text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {t("login_link_signup")}
          </Link>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {t("signup_link_login")}
          </Link>
        )}
        <Link
          href="/"
          className="text-sm font-medium text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
