import { NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { normalizeSupabaseProjectUrl } from "@/lib/supabase/project-url";
import { redeemComplimentaryGrantForUser } from "@/lib/billing/complimentary-grants";
import { getAccountAccessDenial } from "@/lib/moderation/session-enforcement";

export async function GET(request: Request) {
  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = urlRaw ? normalizeSupabaseProjectUrl(urlRaw) : "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    next = "/";
  }

  if (!url || !anonKey || !code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Could not sign you in.")}`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* ignore when cookies cannot be set in this context */
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Could not sign you in.")}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const denial = await getAccountAccessDenial(supabase, user);
    if (denial) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/banned`);
    }
    await redeemComplimentaryGrantForUser(user.id);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
