import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  LOCALE_COOKIE,
  localeFromAcceptLanguageHeader,
} from "@/lib/i18n/locale";
import { normalizeSupabaseProjectUrl } from "@/lib/supabase/project-url";

const PROTECTED_PREFIXES = [
  "/add",
  "/saved",
  "/dashboard",
  "/profile",
  "/admin",
  "/api/admin",
  "/ai-chef",
  "/onboarding",
];

function isOnboardingExempt(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/upgrade") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/_next")
  );
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/upgrade" && request.method === "POST") {
    return NextResponse.json(
      {
        error:
          "Checkout must use POST /api/checkout. Refresh this page and try again.",
      },
      { status: 405 },
    );
  }

  let response = NextResponse.next({ request });

  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = urlRaw ? normalizeSupabaseProjectUrl(urlRaw) : "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { search } = request.nextUrl;

  if (user && !isOnboardingExempt(pathname)) {
    const bannedExempt =
      pathname === "/banned" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup");
    if (!bannedExempt) {
      const { data: banProfile } = await supabase
        .from("profiles")
        .select("banned_at")
        .eq("id", user.id)
        .maybeSingle();
      if (banProfile?.banned_at) {
        return NextResponse.redirect(new URL("/banned", request.url));
      }
      const email = user.email?.trim().toLowerCase() ?? "";
      if (email) {
        const { data: emailBanned } = await supabase.rpc("is_email_banned", {
          p_email: email,
        });
        if (emailBanned) {
          return NextResponse.redirect(new URL("/banned", request.url));
        }
      }
    }

    const { data: ob, error: obErr } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!obErr && ob?.onboarding_completed_at == null) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  if (isProtectedPath(pathname)) {
    if (!user) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(login);
    }

    if (
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname === "/api/admin" ||
      pathname.startsWith("/api/admin/")
    ) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  if (!request.cookies.get(LOCALE_COOKIE)?.value) {
    const picked = localeFromAcceptLanguageHeader(
      request.headers.get("accept-language"),
    );
    if (picked) {
      response.cookies.set(LOCALE_COOKIE, picked, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
