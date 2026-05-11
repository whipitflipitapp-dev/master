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
        <div className="pointer-events-none fixed left-0 top-0 z-[100] pl-[max(0.5rem,env(safe-area-inset-left))] pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto">
            <MobileSiteMenu />
          </div>
        </div>
      ) : null}
      {children}
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
