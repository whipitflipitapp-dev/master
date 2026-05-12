"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation("common");

  const items = [
    { href: "/", key: "nav_home", icon: "🏠" },
    { href: "/recipes", key: "nav_search", icon: "🔍" },
    { href: "/add", key: "nav_add", icon: "➕" },
    { href: "/saved", key: "nav_saved", icon: "❤️" },
    { href: "/profile", key: "nav_profile", icon: "👤" },
  ] as const;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--bg)_58%,transparent)] shadow-[var(--shadow-nav)] backdrop-blur-lg backdrop-saturate-150 md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0 px-1 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2">
        {items.map(({ href, key, icon }) => (
          <NavLink
            key={href}
            href={href}
            label={t(key)}
            icon={icon}
            active={
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`)
            }
          />
        ))}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[13px] px-1 py-1 text-[10px] font-semibold leading-none tracking-tight transition-[color,background-color,box-shadow,transform] sm:text-[11px] ${
        active
          ? "bg-[var(--primary-muted)] text-[var(--primary)] ring-1 ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
          : "text-[var(--text)]/72 hover:bg-[color-mix(in_srgb,var(--card)_45%,transparent)] hover:text-[var(--text)] active:scale-[0.97]"
      }`}
    >
      <span
        className={`leading-none transition-transform ${active ? "text-[1.35rem] sm:text-[1.45rem]" : "text-[1.22rem] sm:text-[1.32rem]"}`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="max-w-full truncate text-center">{label}</span>
    </Link>
  );
}
