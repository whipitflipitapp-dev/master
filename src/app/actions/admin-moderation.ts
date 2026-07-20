"use server";

import { revalidatePath } from "next/cache";

import {
  AdminServiceUnavailableError,
  createAdminServiceRoleContext,
} from "@/lib/admin/service-role-for-admin";
import { normalizeEmailForBanList } from "@/lib/moderation/access-control";
import { parsePlanType, type PlanType } from "@/lib/plan";

export type AdminUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  plan_type: string;
  plan_billing_source: string;
  is_admin: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
};

export type AdminRecipeRow = {
  id: string;
  title: string;
  moderation_status: string;
  moderation_reason: string | null;
  created_by: string | null;
  creator_email: string | null;
  created_at: string;
};

export type BannedEmailRow = {
  id: string;
  email: string;
  reason: string | null;
  created_at: string;
};

type ActionResult = { ok: true } | { ok: false; error: string };

function actionError(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminServiceUnavailableError) {
    return { ok: false, error: err.message };
  }
  return {
    ok: false,
    error: err instanceof Error ? err.message : "Something went wrong.",
  };
}

export async function adminSearchUsers(
  query: string,
): Promise<{ ok: true; rows: AdminUserRow[] } | { ok: false; error: string }> {
  try {
    const { supabase } = await createAdminServiceRoleContext();
    const { data, error } = await supabase.rpc("admin_search_users", {
      p_query: query.trim(),
      p_limit: 40,
      p_offset: 0,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, rows: (data ?? []) as AdminUserRow[] };
  } catch (err) {
    return actionError(err);
  }
}

export async function adminSearchRecipes(
  query: string,
  status: string,
): Promise<{ ok: true; rows: AdminRecipeRow[] } | { ok: false; error: string }> {
  try {
    const { supabase } = await createAdminServiceRoleContext();
    const { data, error } = await supabase.rpc("admin_search_recipes", {
      p_query: query.trim(),
      p_status: status.trim() || null,
      p_limit: 40,
      p_offset: 0,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, rows: (data ?? []) as AdminRecipeRow[] };
  } catch (err) {
    return actionError(err);
  }
}

export async function adminListBannedEmails(): Promise<
  { ok: true; rows: BannedEmailRow[] } | { ok: false; error: string }
> {
  try {
    const { supabase } = await createAdminServiceRoleContext();
    const { data, error } = await supabase
      .from("banned_emails")
      .select("id,email,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, rows: (data ?? []) as BannedEmailRow[] };
  } catch (err) {
    return actionError(err);
  }
}

export async function adminSetUserPlan(input: {
  userId: string;
  planType: PlanType;
  complimentary: boolean;
}): Promise<ActionResult> {
  const plan = parsePlanType(input.planType);
  if (!plan) {
    return { ok: false, error: "Invalid plan." };
  }
  try {
    const { supabase } = await createAdminServiceRoleContext();
    const { error } = await supabase
      .from("profiles")
      .update({
        plan_type: plan,
        plan_billing_source: input.complimentary ? "complimentary" : "self",
        pending_plan_type: null,
        plan_change_effective_at: null,
      })
      .eq("id", input.userId);
    if (error) {
      return { ok: false, error: error.message };
    }
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function adminBanUser(input: {
  userId: string;
  reason: string;
}): Promise<ActionResult> {
  if (!input.userId.trim()) {
    return { ok: false, error: "Missing user." };
  }
  try {
    const { supabase, adminUserId } = await createAdminServiceRoleContext();
    const { error } = await supabase
      .from("profiles")
      .update({
        banned_at: new Date().toISOString(),
        ban_reason: input.reason.trim() || null,
        banned_by: adminUserId,
      })
      .eq("id", input.userId);
    if (error) {
      return { ok: false, error: error.message };
    }
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function adminUnbanUser(userId: string): Promise<ActionResult> {
  try {
    const { supabase } = await createAdminServiceRoleContext();
    const { error } = await supabase
      .from("profiles")
      .update({
        banned_at: null,
        ban_reason: null,
        banned_by: null,
      })
      .eq("id", userId);
    if (error) {
      return { ok: false, error: error.message };
    }
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function adminAddBannedEmail(input: {
  email: string;
  reason: string;
}): Promise<ActionResult> {
  const email = normalizeEmailForBanList(input.email);
  if (!email.includes("@")) {
    return { ok: false, error: "Enter a valid email." };
  }
  try {
    const { supabase, adminUserId } = await createAdminServiceRoleContext();
    const { error } = await supabase.from("banned_emails").insert({
      email,
      reason: input.reason.trim() || null,
      created_by: adminUserId,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function adminRemoveBannedEmail(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await createAdminServiceRoleContext();
    const { error } = await supabase.from("banned_emails").delete().eq("id", id);
    if (error) {
      return { ok: false, error: error.message };
    }
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export type RecipeModerationStatus =
  | "published"
  | "pending_review"
  | "hidden"
  | "removed";

export async function adminSetRecipeModeration(input: {
  recipeId: string;
  status: RecipeModerationStatus;
  reason: string;
}): Promise<ActionResult> {
  const status = input.status;
  if (!["published", "pending_review", "hidden", "removed"].includes(status)) {
    return { ok: false, error: "Invalid moderation status." };
  }
  try {
    const { supabase, adminUserId } = await createAdminServiceRoleContext();
    const { error } = await supabase
      .from("recipes")
      .update({
        moderation_status: status,
        moderation_reason: input.reason.trim() || null,
        moderated_at: new Date().toISOString(),
        moderated_by: adminUserId,
      })
      .eq("id", input.recipeId);
    if (error) {
      return { ok: false, error: error.message };
    }
    revalidatePath("/admin");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${input.recipeId}`);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
