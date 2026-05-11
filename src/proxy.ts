import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  LOCALE_COOKIE,
  localeFromAcceptLanguageHeader,
} from "@/lib/i18n/locale";

const PROTECTED_PREFIXES = [
  "/add",
  "/saved",
  "/dashboard",
  "/profile",
  "/admin",
  "/api/admin",
  "/ai-chef",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
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

  const { pathname, search } = request.nextUrl;

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
