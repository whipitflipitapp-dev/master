"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  isAmazonAffiliateProductUrl,
  isHttpsUrl,
} from "@/lib/amazon-affiliate-url";
import { COOKBOOK_PLAN_REQUIRED_ERROR } from "@/lib/cookbooks-plan-gate";
import { getCurrentProfile } from "@/lib/profile";
import { isProOrAbove } from "@/lib/plan";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TITLE_MAX = 200;
const NOTE_MAX = 2000;
const URL_MAX = 2048;

function trimOrNull(raw: FormDataEntryValue | null): string | null {
  if (raw == null) return null;
  const s = typeof raw === "string" ? raw.trim() : String(raw).trim();
  return s.length ? s : null;
}

function validateCookbookFields(input: {
  title: string;
  affiliateUrl: string;
  coverUrl: string | null;
  note: string | null;
}): string | null {
  if (!input.title) {
    return "Add a title.";
  }
  if (input.title.length > TITLE_MAX) {
    return `Title must be at most ${TITLE_MAX} characters.`;
  }
  if (!input.affiliateUrl) {
    return "Add an affiliate product link.";
  }
  if (input.affiliateUrl.length > URL_MAX) {
    return "Affiliate link is too long.";
  }
  if (!isAmazonAffiliateProductUrl(input.affiliateUrl)) {
    return "Affiliate link must be HTTPS and use an allowed Amazon or amzn host.";
  }
  if (input.coverUrl != null) {
    if (input.coverUrl.length > URL_MAX) {
      return "Cover image URL is too long.";
    }
    if (!isHttpsUrl(input.coverUrl)) {
      return "Cover image URL must use HTTPS.";
    }
  }
  if (input.note != null && input.note.length > NOTE_MAX) {
    return `Note must be at most ${NOTE_MAX} characters.`;
  }
  return null;
}

export async function createCookbook(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const ctx = await getCurrentProfile(supabase);
  if (!ctx) {
    redirect("/login?next=/dashboard/cookbooks");
  }
  if (!isProOrAbove(ctx.profile.plan_type)) {
    return { error: COOKBOOK_PLAN_REQUIRED_ERROR };
  }
  const user = ctx.user;

  const title = (trimOrNull(formData.get("title")) ?? "").slice(0, TITLE_MAX);
  const affiliateUrl = (
    trimOrNull(formData.get("affiliate_url")) ?? ""
  ).slice(0, URL_MAX);
  const coverRaw = trimOrNull(formData.get("cover_image_url"));
  const coverUrl =
    coverRaw != null && coverRaw.length > 0
      ? coverRaw.slice(0, URL_MAX)
      : null;
  const noteRaw = trimOrNull(formData.get("note"));
  const note =
    noteRaw != null && noteRaw.length > 0 ? noteRaw.slice(0, NOTE_MAX) : null;

  const err = validateCookbookFields({
    title,
    affiliateUrl,
    coverUrl,
    note,
  });
  if (err) {
    return { error: err };
  }

  const { error } = await supabase.from("cookbooks").insert({
    title,
    external_link: affiliateUrl,
    cover_image_url: coverUrl,
    description: note,
    created_by: user.id,
    price_cents: null,
    file_url: null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/cookbooks");
  revalidatePath("/dashboard");
  revalidatePath(`/chef/${user.id}`);
  return { error: null };
}

export async function updateCookbook(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const ctx = await getCurrentProfile(supabase);
  if (!ctx) {
    redirect("/login?next=/dashboard/cookbooks");
  }
  if (!isProOrAbove(ctx.profile.plan_type)) {
    return { error: COOKBOOK_PLAN_REQUIRED_ERROR };
  }
  const user = ctx.user;

  const idRaw = trimOrNull(formData.get("id"));
  const id = idRaw ?? "";
  if (!id) {
    return { error: "Missing cookbook." };
  }

  const title = (trimOrNull(formData.get("title")) ?? "").slice(0, TITLE_MAX);
  const affiliateUrl = (
    trimOrNull(formData.get("affiliate_url")) ?? ""
  ).slice(0, URL_MAX);
  const coverRaw = trimOrNull(formData.get("cover_image_url"));
  const coverUrl =
    coverRaw != null && coverRaw.length > 0
      ? coverRaw.slice(0, URL_MAX)
      : null;
  const noteRaw = trimOrNull(formData.get("note"));
  const note =
    noteRaw != null && noteRaw.length > 0 ? noteRaw.slice(0, NOTE_MAX) : null;

  const err = validateCookbookFields({
    title,
    affiliateUrl,
    coverUrl,
    note,
  });
  if (err) {
    return { error: err };
  }

  const { error, data } = await supabase
    .from("cookbooks")
    .update({
      title,
      external_link: affiliateUrl,
      cover_image_url: coverUrl,
      description: note,
    })
    .eq("id", id)
    .eq("created_by", user.id)
    .select("id");

  if (error) {
    return { error: error.message };
  }
  if (!data?.length) {
    return { error: "Could not update cookbook." };
  }

  revalidatePath("/dashboard/cookbooks");
  revalidatePath(`/chef/${user.id}`);
  return { error: null };
}

export async function deleteCookbook(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/dashboard/cookbooks");
  }

  const idRaw = trimOrNull(formData.get("id"));
  const id = idRaw ?? "";
  if (!id) {
    return;
  }

  await supabase
    .from("cookbooks")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  revalidatePath("/dashboard/cookbooks");
  revalidatePath("/dashboard");
  revalidatePath(`/chef/${user.id}`);
}
