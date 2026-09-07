"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProductTourOverlay } from "@/components/product-tour/ProductTourOverlay";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const HIDE_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/banned",
  "/onboarding",
];

function shouldHideTour(pathname: string): boolean {
  return HIDE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function ProductTourHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [persistDismiss, setPersistDismiss] = useState(true);

  const closeTour = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (shouldHideTour(pathname)) {
      setOpen(false);
      setChecked(true);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setChecked(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        if (!cancelled) {
          setOpen(false);
          setChecked(true);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("product_tour_completed_at,product_tour_dismiss_count")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      const completed = Boolean(
        (profile as { product_tour_completed_at?: string | null } | null)
          ?.product_tour_completed_at,
      );
      const dismissCount =
        typeof (profile as { product_tour_dismiss_count?: number } | null)
          ?.product_tour_dismiss_count === "number"
          ? (profile as { product_tour_dismiss_count: number })
              .product_tour_dismiss_count
          : 0;

      const tourRequested = searchParams.get("tour") === "1";
      const sessionKey = `wif_product_tour_session_${dismissCount}`;

      if (tourRequested) {
        setPersistDismiss(!completed && dismissCount < 2);
        setOpen(true);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("tour");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        setChecked(true);
        return;
      }

      if (completed || dismissCount >= 2) {
        setOpen(false);
        setChecked(true);
        return;
      }

      let sessionSeen = false;
      try {
        sessionSeen = sessionStorage.getItem(sessionKey) === "1";
      } catch {
        sessionSeen = false;
      }

      if (!sessionSeen) {
        setPersistDismiss(true);
        setOpen(true);
        try {
          sessionStorage.setItem(sessionKey, "1");
        } catch {
          /* ignore */
        }
      } else {
        setOpen(false);
      }

      setChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams]);

  if (!checked) {
    return null;
  }

  return (
    <ProductTourOverlay
      open={open}
      onClose={closeTour}
      persistDismiss={persistDismiss}
    />
  );
}
