"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { signOut } from "@/app/actions/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span className="flex h-5 w-6 flex-col justify-center gap-1.5" aria-hidden>
      <span
        className={`block h-0.5 rounded-full bg-white transition-transform ${
          open ? "translate-y-2 rotate-45" : ""
        }`}
      />
      <span
        className={`block h-0.5 rounded-full bg-white transition-opacity ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`block h-0.5 rounded-full bg-white transition-transform ${
          open ? "-translate-y-2 -rotate-45" : ""
        }`}
      />
    </span>
  );
}

export function MobileSiteMenu() {
  const pathname = usePathname();
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const hide =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth/");

  const refreshUser = useCallback(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setUser(null);
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });
  }, []);

  useEffect(() => {
    refreshUser();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (hide) {
    return null;
  }

  const close = () => setOpen(false);

  const linkClass =
    "rounded-[var(--radius-card)] px-3 py-3 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/45 shadow-lg backdrop-blur-md transition-colors hover:bg-black/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        aria-expanded={open}
        aria-controls="site-drawer"
        aria-label={t("menu_open")}
      >
        <HamburgerIcon open={false} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-label={t("menu_close")}
            onClick={close}
          />
          <div
            id="site-drawer"
            className="absolute right-0 top-0 flex h-full w-[min(100vw,20rem)] flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-sm font-bold text-[var(--text)]">{t("brand")}</span>
              <button
                type="button"
                onClick={close}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-[var(--text)]"
                aria-label={t("menu_close")}
              >
                <HamburgerIcon open />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
              <Link href="/" className={linkClass} onClick={close}>
                {t("menu_home")}
              </Link>
              <Link href="/recipes" className={linkClass} onClick={close}>
                {t("menu_recipes")}
              </Link>
              <Link href="/help-me-cook" className={linkClass} onClick={close}>
                {t("menu_help_cook")}
              </Link>
              <Link href="/upgrade" className={linkClass} onClick={close}>
                {t("menu_upgrade")}
              </Link>
              <Link href="/learn/allergies" className={linkClass} onClick={close}>
                {t("menu_learn_safety")}
              </Link>
              <Link href="/ai-chef" className={linkClass} onClick={close}>
                {t("menu_ai_chef")}
              </Link>

              <div className="my-2 border-t border-[var(--border)]" />

              {user === undefined ? (
                <p className="px-3 py-2 text-xs text-[var(--muted)]">…</p>
              ) : user ? (
                <>
                  <Link href="/profile" className={linkClass} onClick={close}>
                    {t("menu_profile")}
                  </Link>
                  <Link href="/dashboard" className={linkClass} onClick={close}>
                    {t("menu_dashboard")}
                  </Link>
                  <Link href="/saved" className={linkClass} onClick={close}>
                    {t("menu_saved")}
                  </Link>
                  <div className="mt-2 px-1">
                    <button
                      type="button"
                      className="w-full rounded-[var(--radius-card)] px-3 py-3 text-left text-sm font-semibold text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
                      onClick={() => {
                        close();
                        void signOut();
                      }}
                    >
                      {t("menu_sign_out")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login?next=/profile"
                    className={linkClass}
                    onClick={close}
                  >
                    {t("menu_sign_in")}
                  </Link>
                  <Link href="/signup" className={linkClass} onClick={close}>
                    {t("menu_sign_up")}
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
