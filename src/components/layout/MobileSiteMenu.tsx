"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { signOut } from "@/app/actions/auth";
import { parsePlanType, type PlanType } from "@/lib/plan";
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

/** 2×2 grid trigger (not a hamburger). */
function GridMenuIcon() {
  return (
    <span className="grid h-5 w-5 grid-cols-2 gap-0.5" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="block rounded-[2.5px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
        />
      ))}
    </span>
  );
}

type MobileSiteMenuProps = {
  /** When true, FAB sits above the fixed bottom nav; when false, FAB uses a home/splash-safe inset. */
  showBottomNav: boolean;
};

export function MobileSiteMenu({ showBottomNav }: MobileSiteMenuProps) {
  const pathname = usePathname();
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [planTier, setPlanTier] = useState<PlanType | null>(null);

  const hide =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth/");

  const loadProfileForMenu = useCallback(async (userId: string) => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("first_name,display_name,plan_type")
      .eq("id", userId)
      .maybeSingle();
    const fromFirst =
      typeof data?.first_name === "string" && data.first_name.trim()
        ? data.first_name.trim()
        : "";
    const fromDisplay =
      !fromFirst && typeof data?.display_name === "string"
        ? data.display_name.trim().split(/\s+/)[0] ?? ""
        : "";
    setFirstName(fromFirst || fromDisplay || null);
    const parsed = parsePlanType(data?.plan_type);
    setPlanTier(parsed ?? "free");
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      void Promise.resolve().then(() => {
        setUser(null);
        setFirstName(null);
        setPlanTier(null);
      });
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null;
      setUser(u);
      if (u) {
        void loadProfileForMenu(u.id);
      } else {
        setFirstName(null);
        setPlanTier(null);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        void loadProfileForMenu(u.id);
      } else {
        setFirstName(null);
        setPlanTier(null);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfileForMenu]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (hide) {
    return null;
  }

  const close = () => setOpen(false);

  const linkClass =
    "rounded-[var(--radius-card)] px-3 py-3 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]";

  const fabBottomClass = showBottomNav
    ? "max-md:bottom-[calc(5rem+0.75rem+env(safe-area-inset-bottom))] md:bottom-[max(1.25rem,env(safe-area-inset-bottom))]"
    : "bottom-[max(1rem,env(safe-area-inset-bottom))]";

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed right-[max(0.75rem,env(safe-area-inset-right))] ${fabBottomClass} z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-transparent backdrop-blur-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] md:h-[3.25rem] md:w-[3.25rem]`}
        aria-expanded={open}
        aria-controls="site-drawer"
        aria-label={t("menu_open")}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 520, damping: 28 }}
      >
        <GridMenuIcon />
      </motion.button>

      <AnimatePresence
        onExitComplete={() => {
          document.body.style.overflow = "";
        }}
      >
        {open ? (
          <motion.div
            key="site-menu-overlay"
            className="fixed inset-0 z-[200]"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
              aria-label={t("menu_close")}
              onClick={close}
            />
            <motion.div
              id="site-drawer"
              className="absolute right-0 top-0 flex h-full w-[min(100vw,20rem)] flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
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
                {user && planTier === "ai_chef" ? null : (
                  <Link href="/upgrade" className={linkClass} onClick={close}>
                    {t("menu_upgrade")}
                  </Link>
                )}
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
                    {firstName ? (
                      <p className="px-3 pb-1 pt-1 text-[length:var(--text-meta)] font-semibold text-[var(--text)]">
                        {t("menu_greeting", { firstName })}
                      </p>
                    ) : null}
                    <Link href="/profile" className={linkClass} onClick={close}>
                      {t("menu_profile")}
                    </Link>
                    <Link href="/dashboard" className={linkClass} onClick={close}>
                      {t("menu_dashboard")}
                    </Link>
                    <Link href="/dashboard/analytics" className={linkClass} onClick={close}>
                      {t("menu_creator_analytics")}
                    </Link>
                    <Link href="/saved" className={linkClass} onClick={close}>
                      {t("menu_saved")}
                    </Link>
                    <Link href="/grocery-list" className={linkClass} onClick={close}>
                      {t("menu_grocery_list")}
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

              <div className="shrink-0 border-t border-[var(--border)] p-3">
                <Link
                  href="/privacy"
                  className="block rounded-[var(--radius-card)] px-3 py-2 text-center text-[length:var(--text-meta)] font-medium text-[var(--muted)] underline-offset-4 hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:text-[var(--text)] hover:underline"
                  onClick={close}
                >
                  {t("footer_privacy")}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
