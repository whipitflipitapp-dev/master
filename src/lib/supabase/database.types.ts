/**
 * Minimal Database typing for Supabase client; extend via CLI codegen later.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          plan_type: "free" | "pro" | "ai_chef";
          pending_plan_type: "free" | "pro" | "ai_chef" | null;
          plan_change_effective_at: string | null;
          language: string;
          is_admin: boolean;
          created_at: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          onboarding_completed_at: string | null;
          first_name: string | null;
          last_name: string | null;
          birthdate: string | null;
          feature_interests: string[];
          foods_loved: string[];
          foods_loved_other: string | null;
          cooks_per_week: number | null;
          allergy_other: string | null;
          referral_source: string | null;
          banned_at: string | null;
          ban_reason: string | null;
          banned_by: string | null;
          plan_billing_source: "self" | "complimentary";
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          plan_type?: "free" | "pro" | "ai_chef";
          pending_plan_type?: "free" | "pro" | "ai_chef" | null;
          plan_change_effective_at?: string | null;
          language?: string;
          is_admin?: boolean;
          created_at?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          onboarding_completed_at?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          birthdate?: string | null;
          feature_interests?: string[];
          foods_loved?: string[];
          foods_loved_other?: string | null;
          cooks_per_week?: number | null;
          allergy_other?: string | null;
          referral_source?: string | null;
          banned_at?: string | null;
          ban_reason?: string | null;
          banned_by?: string | null;
          plan_billing_source?: "self" | "complimentary";
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          plan_type?: "free" | "pro" | "ai_chef";
          pending_plan_type?: "free" | "pro" | "ai_chef" | null;
          plan_change_effective_at?: string | null;
          language?: string;
          is_admin?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          onboarding_completed_at?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          birthdate?: string | null;
          feature_interests?: string[];
          foods_loved?: string[];
          foods_loved_other?: string | null;
          cooks_per_week?: number | null;
          allergy_other?: string | null;
          referral_source?: string | null;
          banned_at?: string | null;
          ban_reason?: string | null;
          banned_by?: string | null;
          plan_billing_source?: "self" | "complimentary";
        };
      };
      banned_emails: {
        Row: {
          id: string;
          email: string;
          reason: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          reason?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          email?: string;
          reason?: string | null;
          created_by?: string | null;
        };
      };
      complimentary_email_grants: {
        Row: {
          id: string;
          email: string;
          plan_type: "free" | "pro" | "ai_chef";
          note: string | null;
          created_at: string;
          created_by: string | null;
          redeemed_at: string | null;
          redeemed_by: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          plan_type?: "free" | "pro" | "ai_chef";
          note?: string | null;
          created_at?: string;
          created_by?: string | null;
          redeemed_at?: string | null;
          redeemed_by?: string | null;
        };
        Update: {
          email?: string;
          plan_type?: "free" | "pro" | "ai_chef";
          note?: string | null;
          created_by?: string | null;
          redeemed_at?: string | null;
          redeemed_by?: string | null;
        };
      };
      recipes: {
        Row: {
          id: string;
          title: string;
          instructions: string;
          image_url: string | null;
          video_url: string | null;
          hosted_reel_url: string | null;
          favorites_count: number;
          created_by: string | null;
          difficulty: string | null;
          cook_time_minutes: number | null;
          created_at: string;
          moderation_status:
            | "published"
            | "pending_review"
            | "hidden"
            | "removed";
          moderation_reason: string | null;
          moderated_at: string | null;
          moderated_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          instructions?: string;
          image_url?: string | null;
          video_url?: string | null;
          hosted_reel_url?: string | null;
          favorites_count?: number;
          created_by?: string | null;
          difficulty?: string | null;
          cook_time_minutes?: number | null;
          created_at?: string;
          moderation_status?:
            | "published"
            | "pending_review"
            | "hidden"
            | "removed";
          moderation_reason?: string | null;
          moderated_at?: string | null;
          moderated_by?: string | null;
        };
        Update: {
          title?: string;
          instructions?: string;
          image_url?: string | null;
          video_url?: string | null;
          hosted_reel_url?: string | null;
          difficulty?: string | null;
          cook_time_minutes?: number | null;
          moderation_status?:
            | "published"
            | "pending_review"
            | "hidden"
            | "removed";
          moderation_reason?: string | null;
          moderated_at?: string | null;
          moderated_by?: string | null;
        };
      };
      ingredients: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { name?: string };
      };
      recipe_ingredients: {
        Row: {
          recipe_id: string;
          ingredient_id: string;
          quantity: string | null;
          sort_order: number;
        };
        Insert: {
          recipe_id: string;
          ingredient_id: string;
          quantity?: string | null;
          sort_order?: number;
        };
        Update: {
          quantity?: string | null;
          sort_order?: number;
        };
      };
      favorites: {
        Row: {
          user_id: string;
          recipe_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          recipe_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      recipe_images: {
        Row: {
          id: string;
          recipe_id: string;
          image_url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          image_url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          image_url?: string;
          sort_order?: number;
        };
      };
      billing_events: {
        Row: {
          id: string;
          stripe_event_id: string;
          kind: "invoice_paid" | "refund_created";
          amount_cents: number;
          currency: string;
          revenue_type: string;
          stripe_price_id: string | null;
          stripe_customer_id: string | null;
          stripe_invoice_id: string | null;
          stripe_charge_id: string | null;
          stripe_refund_id: string | null;
          user_id: string | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          stripe_event_id: string;
          kind: "invoice_paid" | "refund_created";
          amount_cents: number;
          currency?: string;
          revenue_type?: string;
          stripe_price_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_invoice_id?: string | null;
          stripe_charge_id?: string | null;
          stripe_refund_id?: string | null;
          user_id?: string | null;
          occurred_at: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      user_excluded_recipes: {
        Row: {
          user_id: string;
          recipe_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          recipe_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      user_recipe_experiences: {
        Row: {
          user_id: string;
          recipe_id: string;
          made_recipe: boolean;
          rating: number | null;
          spent_cents: number | null;
          created_at: string;
          updated_at: string;
          review_text: string | null;
          review_moderation_status: "published" | "pending_review" | "hidden";
        };
        Insert: {
          user_id: string;
          recipe_id: string;
          made_recipe?: boolean;
          rating?: number | null;
          spent_cents?: number | null;
          created_at?: string;
          updated_at?: string;
          review_text?: string | null;
          review_moderation_status?: "published" | "pending_review" | "hidden";
        };
        Update: {
          made_recipe?: boolean;
          rating?: number | null;
          spent_cents?: number | null;
          updated_at?: string;
          review_text?: string | null;
          review_moderation_status?: "published" | "pending_review" | "hidden";
        };
      };
      allergens: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { name?: string };
      };
      user_allergies: {
        Row: { user_id: string; allergen_id: string };
        Insert: { user_id: string; allergen_id: string };
        Update: Record<string, never>;
      };
      recipe_allergens: {
        Row: { recipe_id: string; allergen_id: string };
        Insert: { recipe_id: string; allergen_id: string };
        Update: Record<string, never>;
      };
      tags: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { name?: string };
      };
      recipe_tags: {
        Row: { recipe_id: string; tag_id: string };
        Insert: { recipe_id: string; tag_id: string };
        Update: Record<string, never>;
      };
      wine_pairings: {
        Row: {
          id: string;
          recipe_id: string;
          wine_type: string;
          wine_name: string | null;
          notes: string | null;
          description: string | null;
          purchase_url: string | null;
          source: "ai" | "user";
          user_id: string | null;
          created_at: string;
          wine_type_slug: string | null;
          why_blurb: string | null;
          moderation_status: "published" | "pending_review" | "hidden";
        };
        Insert: {
          id?: string;
          recipe_id: string;
          wine_type: string;
          wine_name?: string | null;
          notes?: string | null;
          description?: string | null;
          purchase_url?: string | null;
          source?: "ai" | "user";
          user_id?: string | null;
          created_at?: string;
          wine_type_slug?: string | null;
          why_blurb?: string | null;
          moderation_status?: "published" | "pending_review" | "hidden";
        };
        Update: {
          wine_type?: string;
          wine_name?: string | null;
          notes?: string | null;
          description?: string | null;
          purchase_url?: string | null;
          source?: "ai" | "user";
          user_id?: string | null;
          created_at?: string;
          wine_type_slug?: string | null;
          why_blurb?: string | null;
          moderation_status?: "published" | "pending_review" | "hidden";
        };
      };
      cookbooks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          price_cents: number | null;
          cover_image_url: string | null;
          file_url: string | null;
          external_link: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          price_cents?: number | null;
          cover_image_url?: string | null;
          file_url?: string | null;
          external_link?: string | null;
          created_by?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          price_cents?: number | null;
          cover_image_url?: string | null;
          file_url?: string | null;
          external_link?: string | null;
        };
      };
      suggestions: {
        Row: {
          id: string;
          user_id: string;
          suggestion: string;
          submitter_email: string;
          submitter_name: string | null;
          status: "new" | "reviewed" | "dismissed";
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          suggestion: string;
          submitter_email?: string;
          submitter_name?: string | null;
          status?: "new" | "reviewed" | "dismissed";
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          suggestion?: string;
          submitter_email?: string;
          submitter_name?: string | null;
          status?: "new" | "reviewed" | "dismissed";
          reviewed_at?: string | null;
        };
      };
      events: {
        Row: {
          id: string;
          user_id: string | null;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          event_type?: string;
          metadata?: Json;
        };
      };
      affiliate_clicks: {
        Row: {
          id: string;
          user_id: string | null;
          recipe_id: string | null;
          link_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          recipe_id?: string | null;
          link_type: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
    };
    Enums: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      is_request_user_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_metrics_overview: {
        Args: { p_since?: string };
        Returns: Json;
      };
      admin_recent_events: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: Json;
      };
      admin_affiliate_link_types_recent: {
        Args: { p_since?: string };
        Returns: Json;
      };
      admin_billing_ledger_summary: {
        Args: { p_since?: string };
        Returns: Json;
      };
      admin_search_users: {
        Args: { p_query?: string; p_limit?: number; p_offset?: number };
        Returns: {
          id: string;
          email: string;
          display_name: string | null;
          plan_type: string;
          plan_billing_source: string;
          is_admin: boolean;
          banned_at: string | null;
          ban_reason: string | null;
          created_at: string;
        }[];
      };
      admin_search_recipes: {
        Args: {
          p_query?: string;
          p_status?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          title: string;
          moderation_status: string;
          moderation_reason: string | null;
          created_by: string | null;
          creator_email: string | null;
          created_at: string;
        }[];
      };
      try_redeem_complimentary_grant_for_user: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      auth_user_id_for_email: {
        Args: { p_email: string };
        Returns: string | null;
      };
      is_email_banned: {
        Args: { p_email: string };
        Returns: boolean;
      };
      chef_public_profile: {
        Args: { p_user_id: string };
        Returns: { display_name: string | null; avatar_url: string | null }[];
      };
      list_recipes_for_browse: {
        Args: {
          p_limit: number;
          p_title_search: string | null;
          p_exclude_allergen_ids: string[] | null;
          p_tag_names?: string[] | null;
        };
        Returns: {
          id: string;
          title: string;
          image_url: string | null;
          video_url: string | null;
          hosted_reel_url: string | null;
          favorites_count: number;
          difficulty: string | null;
          cook_time_minutes: number | null;
          created_at: string;
        }[];
      };
      create_recipe_atomic: {
        Args: {
          p_title: string;
          p_instructions: string;
          p_image_url?: string | null;
          p_video_url?: string | null;
          p_difficulty?: string | null;
          p_cook_time_minutes?: number | null;
          p_ingredients?: Json;
          p_allergen_ids?: string[];
          p_tag_names?: string[];
        };
        Returns: string;
      };
      recipe_whip_flip_count: {
        Args: { p_recipe_id: string };
        Returns: number;
      };
      creator_analytics_overview: {
        Args: { p_since?: string };
        Returns: Json;
      };
    };
  };
}
