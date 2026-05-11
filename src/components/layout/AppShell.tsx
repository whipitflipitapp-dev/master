"use client";

import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/layout/BottomNav";
import { MobileSiteMenu } from "@/components/layout/MobileSiteMenu";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav =
    pathname !== "/" &&
    pathname !== "/login" &&
    pathname !== "/signup" &&
    pathname !== "/onboarding";
  const hideMenu =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth/");

  return (
    <div
      className={`flex min-h-dvh flex-col ${showNav ? "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0" : ""}`}
    >
      {!hideMenu ? (
        <div className="flex shrink-0 items-center border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] pl-[max(0.5rem,env(safe-area-inset-left))] pr-3 pt-[max(0.25rem,env(safe-area-inset-top))] pb-1.5 backdrop-blur-md md:border-transparent md:bg-transparent md:backdrop-blur-none">
          <MobileSiteMenu />
          <div className="min-w-0 flex-1" aria-hidden />
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
