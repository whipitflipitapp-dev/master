"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname !== "/" && pathname !== "/login";

  return (
    <div
      className={`flex min-h-dvh flex-col ${showNav ? "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0" : ""}`}
    >
      {children}
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
