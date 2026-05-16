"use client";

import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/layout/BottomNav";
import { MobileSiteMenu } from "@/components/layout/MobileSiteMenu";
import { SiteFooter } from "@/components/layout/SiteFooter";

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

  /** Bottom inset: bottom nav when shown, plus FAB reserve when the floating menu trigger is visible. */
  const bottomShellPad = (() => {
    /** Splash paints FAB reserve itself so padding does not reveal body `--bg` (#faf8f5 strip). */
    if (pathname === "/") {
      return "";
    }
    if (hideMenu) {
      return showNav
        ? "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0"
        : "";
    }
    if (showNav) {
      return "pb-[calc(5rem+3.75rem+0.75rem+env(safe-area-inset-bottom))] md:pb-[calc(3.75rem+0.75rem+env(safe-area-inset-bottom))]";
    }
    return "pb-[calc(3.75rem+0.75rem+env(safe-area-inset-bottom))]";
  })();

  return (
    <div className={`flex min-h-dvh flex-col ${bottomShellPad}`}>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <SiteFooter />
      {!hideMenu ? <MobileSiteMenu showBottomNav={showNav} /> : null}
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
