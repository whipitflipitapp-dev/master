import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { AppShell } from "@/components/layout/AppShell";
import { resolveAppLocale } from "@/lib/i18n/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Whip It Flip It",
  description:
    "Cook anything from what you have — AI-powered recipe matching and creator tools.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await resolveAppLocale();
  return (
    <html lang={locale} className={`${inter.variable} h-full max-w-full overflow-x-clip antialiased`}>
      <body className="min-h-dvh max-w-full min-w-0 overflow-x-clip bg-[var(--bg)] text-[var(--text)]">
        <AppProviders defaultLocale={locale}>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
