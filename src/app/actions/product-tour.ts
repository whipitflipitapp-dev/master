"use server";

import { revalidatePath } from "next/cache";

import { logServerError } from "@/lib/server-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function dismissProductTour(): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sign in required." };
  }

  const { data: row } = await supabase
    .from("profiles")
    .select("product_tour_dismiss_count,product_tour_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (row?.product_tour_completed_at) {
    return { error: null };
  }

  const current =
    typeof row?.product_tour_dismiss_count === "number"
      ? row.product_tour_dismiss_count
      : 0;
  const next = Math.min(2, current + 1);

  const { error } = await supabase
    .from("profiles")
    .update({ product_tour_dismiss_count: next })
    .eq("id", user.id);

  if (error) {
    logServerError("product_tour.dismiss", error);
    return { error: "Could not save your preference." };
  }

  revalidatePath("/", "layout");
  return { error: null };
}

export async function completeProductTour(): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sign in required." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      product_tour_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    logServerError("product_tour.complete", error);
    return { error: "Could not save your progress." };
  }

  revalidatePath("/", "layout");
  return { error: null };
}
