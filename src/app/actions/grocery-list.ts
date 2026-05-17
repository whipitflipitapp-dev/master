"use server";

import { redirect } from "next/navigation";

import {
  buildGroceryItems,
  buildGroceryListEmailHtml,
  buildGroceryListText,
  groceryListLogoUrl,
  loadSavedGroceryListRecipes,
  selectedRecipeIdSet,
  GROCERY_LIST_TITLE,
} from "@/lib/grocery-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_SELECTED_RECIPES = 50;

export type SendGroceryListEmailState = {
  error: string | null;
  success: string | null;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function sendGroceryListEmail(
  _prev: SendGroceryListEmailState,
  formData: FormData,
): Promise<SendGroceryListEmailState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured.", success: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/grocery-list");
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email) || email.length > 254) {
    return { error: "Enter a valid email address.", success: null };
  }

  const selectedRecipeIds = formData
    .getAll("recipe_ids")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, MAX_SELECTED_RECIPES);

  if (selectedRecipeIds.length === 0) {
    return { error: "Choose at least one saved recipe.", success: null };
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!resendApiKey || !resendFromEmail) {
    return {
      error: "Email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.",
      success: null,
    };
  }

  const { recipes, error } = await loadSavedGroceryListRecipes(supabase, user.id);
  if (error) {
    return { error, success: null };
  }

  const selected = selectedRecipeIdSet(selectedRecipeIds, recipes);
  if (selected.size === 0) {
    return { error: "Choose at least one saved recipe.", success: null };
  }

  const items = buildGroceryItems(recipes, selected);
  if (items.length === 0) {
    return {
      error: "The selected saved recipes do not have ingredients yet.",
      success: null,
    };
  }

  const html = buildGroceryListEmailHtml({
    recipes,
    selectedRecipeIds: selected,
    items,
    logoUrl: groceryListLogoUrl(),
  });
  const text = buildGroceryListText(recipes, selected, items);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [email],
      subject: GROCERY_LIST_TITLE,
      html,
      text,
    }),
  });

  if (!response.ok) {
    let message = "Could not send the grocery list email.";
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Keep the generic message when Resend returns a non-JSON error body.
    }
    return { error: message, success: null };
  }

  return { error: null, success: `Grocery list sent to ${email}.` };
}
