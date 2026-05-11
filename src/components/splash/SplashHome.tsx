"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTransition } from "react";
import { useTranslation } from "react-i18next";

import { setProfileLanguage } from "@/app/actions/profile";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "it", label: "IT" },
  { code: "fr", label: "FR" },
] as const;

export function SplashHome() {
  const { t, i18n } = useTranslation("common");
  const [localePending, startLocale] = useTransition();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `
            linear-gradient(
              180deg,
              rgba(255,255,255,0.75) 0%,
              rgba(250,248,245,0.92) 42%,
              var(--bg) 100%
            ),
            radial-gradient(120% 75% at 50% 12%, color-mix(in srgb, var(--primary) 24%, transparent), transparent 58%),
            linear-gradient(135deg, #fff7ed 0%, var(--bg) 48%, #fffbeb 100%)
          `,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex flex-col leading-none">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
            {t("brand")}
          </span>
        </div>
        <div className="flex gap-1 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)] p-1 text-xs font-semibold shadow-[var(--shadow-card)] backdrop-blur-sm">
          {LOCALES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              disabled={localePending}
              onClick={() =>
                startLocale(() => {
                  void (async () => {
                    await setProfileLanguage(code);
                    await i18n.changeLanguage(code);
                  })();
                })
              }
              className={`rounded-full px-2.5 py-1 transition-colors ${
                i18n.language.startsWith(code)
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              } disabled:opacity-60`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-auto flex flex-1 flex-col justify-end px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <p className="mb-3 text-center text-sm font-medium text-[var(--primary)]">
          {t("splash_kicker")}
        </p>
        <h1 className="text-center text-3xl font-bold leading-tight tracking-tight text-[var(--text)] sm:text-4xl">
          {t("splash_title")}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-base text-[var(--muted)]">
          {t("splash_sub")}
        </p>

        <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3">
          <Link
            href="/recipes"
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-base font-semibold text-white shadow-[var(--shadow-card-hover)] transition-[transform,background-color,box-shadow] duration-200 hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99]"
          >
            <span aria-hidden>🍳</span>
            {t("cta_start")}
          </Link>
          <Link
            href="/help-me-cook"
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-6 text-base font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] hover:bg-[color-mix(in_srgb,var(--card)_88%,var(--primary))] hover:shadow-[var(--shadow-card-hover)]"
          >
            <span aria-hidden>✨</span>
            {t("cta_help")}
          </Link>
          <Link
            href="/recipes"
            className="py-2 text-center text-sm font-semibold uppercase tracking-wide text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {t("cta_browse")} ›
          </Link>
        </div>
      </motion.main>
    </div>
  );
}
