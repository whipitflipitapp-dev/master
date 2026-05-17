import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { winePairingsUnlockedForPlan, type PlanType } from "@/lib/plan";
import { getCurrentUserPlanType } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { consumeAiRateLimit } from "./rate-limit";

export type ProWineAuthedContext = {
  supabase: SupabaseClient;
  userId: string;
  plan: PlanType;
};

/**
 * Supabase session + Pro or AI Chef tier + rate limit for wine pairing generation.
 */
export async function requireProWineRequest(): Promise<
  ProWineAuthedContext | { error: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      error: NextResponse.json(
        { error: "Service unavailable." },
        { status: 503 },
      ),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      error: NextResponse.json({ error: "Sign in required." }, { status: 401 }),
    };
  }

  const plan = await getCurrentUserPlanType(supabase);
  if (!plan || !winePairingsUnlockedForPlan(plan)) {
    return {
      error: NextResponse.json(
        { error: "Pro or AI Chef subscription required." },
        { status: 403 },
      ),
    };
  }

  if (!consumeAiRateLimit(user.id)) {
    return {
      error: NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        { status: 429 },
      ),
    };
  }

  return { supabase, userId: user.id, plan };
}
