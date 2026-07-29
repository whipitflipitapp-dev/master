"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

const INSTAGRAM_URL = "https://www.instagram.com/whipitflipitapp";

export function SiteFooter() {
  const pathname = usePathname();
  const { t } = useTranslation("common");

  const hide =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth/");

  if (hide) {
    return null;
  }

  return (
    <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--bg)] px-5 py-4 text-center">
      <nav
        aria-label="Footer"
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
      >
        <Link
          href="/privacy"
          className="text-[length:var(--text-meta)] font-medium text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
        >
          {t("footer_privacy")}
        </Link>
        <span className="text-[var(--border)]" aria-hidden>
          ·
        </span>
        <Link
          href="/terms"
          className="text-[length:var(--text-meta)] font-medium text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
        >
          {t("footer_terms")}
        </Link>
        <span className="text-[var(--border)]" aria-hidden>
          ·
        </span>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[length:var(--text-meta)] font-medium text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
        >
          {t("footer_instagram")}
        </a>
      </nav>
    </footer>
  );
}
