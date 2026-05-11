"use client";

import Link from "next/link";
import Image from "next/image";
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
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-neutral-950">
      {/* Full-bleed hero (mobile-first); asset lives at /public/splash-hero.png */}
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/splash-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* Readability: dark bottom wash + subtle top fade — softer on mobile so more hero shows */}
      <div
        className="absolute inset-0 sm:hidden"
        style={{
          background: `
            linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.02) 30%, rgba(0,0,0,0.18) 52%, rgba(0,0,0,0.58) 100%),
            radial-gradient(90% 55% at 50% 0%, rgba(0,0,0,0.18), transparent 58%)
          `,
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 hidden sm:block"
        style={{
          background: `
            linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 28%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.88) 100%),
            radial-gradient(90% 60% at 50% 0%, rgba(0,0,0,0.35), transparent 55%)
          `,
        }}
        aria-hidden
      />

      {/* Hero art includes baked-in headline/tagline; lighter bottom band on mobile only (desktop/tablet unchanged). */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] block bg-gradient-to-t from-neutral-950/70 from-[48%] via-neutral-950/45 via-[72%] to-transparent sm:hidden"
        aria-hidden
      />

      <header className="relative z-10 flex items-start justify-between max-sm:justify-end px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="max-sm:hidden ml-12 flex flex-col gap-1 leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] sm:ml-14">
          <span className="text-2xl" aria-hidden>
            👨‍🍳
          </span>
          <div className="flex flex-col">
            <span className="text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
              Whip It
            </span>
            <span className="text-xl font-black uppercase tracking-tight text-[#ea580c] sm:text-2xl">
              Flip It
            </span>
            <span className="mt-1 h-1 w-16 rounded-full bg-[#ea580c]" aria-hidden />
          </div>
        </div>
        <div className="flex gap-1 rounded-full border border-white/20 bg-black/35 p-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
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
                  ? "bg-[#ea580c] text-white shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
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
        <p className="mb-2 max-sm:hidden text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/90 drop-shadow-md sm:block">
          {t("splash_kicker")}
        </p>
        <h1 className="max-sm:hidden text-center text-3xl font-extrabold uppercase leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)] sm:block sm:text-4xl">
          {t("splash_title")}
        </h1>
        <p className="mx-auto mt-2 max-sm:hidden max-w-md text-center font-serif text-lg italic text-[#fb923c] drop-shadow-md sm:block sm:text-xl">
          {t("splash_tagline_script")}
        </p>
        <p className="mx-auto mt-3 max-w-md max-sm:-translate-y-[30px] text-center text-sm leading-relaxed text-white/85 drop-shadow">
          {t("splash_sub")}
        </p>

        <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3">
          <Link
            href="/recipes"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#ea580c] px-6 text-base font-bold uppercase tracking-wide text-white shadow-[0_12px_40px_rgba(234,88,12,0.35)] transition-[transform,background-color,box-shadow] duration-200 hover:bg-[#c2410c] active:scale-[0.99]"
          >
            <span aria-hidden>👨‍🍳</span>
            {t("cta_start")}
          </Link>
          <Link
            href="/help-me-cook"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 border-[#ea580c] bg-black/45 px-6 text-base font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur-sm transition-[transform,background-color,border-color] duration-200 hover:bg-black/55 active:scale-[0.99]"
          >
            <span aria-hidden>✨</span>
            {t("cta_help")}
          </Link>
          <Link
            href="/recipes"
            className="py-2 text-center text-sm font-semibold uppercase tracking-wide text-white underline-offset-4 hover:underline"
          >
            {t("cta_browse")} ›
          </Link>
        </div>
      </motion.main>
    </div>
  );
}
