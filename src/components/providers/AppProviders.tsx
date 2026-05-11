"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLayoutEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";
import type { AppLocale } from "@/lib/i18n/locale";

export function AppProviders({
  children,
  defaultLocale,
}: {
  children: React.ReactNode;
  defaultLocale: AppLocale;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false },
        },
      }),
  );

  useLayoutEffect(() => {
    if (defaultLocale && i18n.language?.split("-")[0] !== defaultLocale) {
      void i18n.changeLanguage(defaultLocale);
    }
  }, [defaultLocale]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
}
