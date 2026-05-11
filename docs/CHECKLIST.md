# PRD vs codebase checklist

Comparison of the **current repo** to the consolidated PRD (Parts 1–21): tiers **Free / Pro / AI Chef**; pricing **Pro $3.99/mo · $36/yr**, **AI Chef $5.99/mo · $49/yr**; **Cookpad-inspired** mobile-first UI.

**Evidence** points to primary files or routes. Status: **Done** | **Partial** | **Not started**.

---

## Summary table

| Theme | Status | Evidence |
| --- | --- | --- |
| Product tiers & pricing constants | **Done** | `src/lib/pricing.ts` (`STRIPE_CENTS`, `PRICING`), `src/lib/plan.ts`; `.env.example` documents `STRIPE_PRICE_*` keys |
| Cookpad-inspired UI (tokens, cards, nav) | **Done** | `src/app/globals.css` (warm bg, orange primary `#ea580c`, borders/shadows/nav tokens), `RecipeListCard.tsx`, `BottomNav.tsx`, splash CTAs |
| Auth (Supabase) | **Partial** | `src/lib/supabase/server.ts`, `src/proxy.ts` (session refresh); **no** login/sign-up UI (`profile/page.tsx`, `add/page.tsx` TODOs) |
| Profiles & plan field | **Partial** | `supabase/migrations/20260510150000_profiles_plan_type.sql` + initial schema (`profiles.plan_type`), `src/lib/profile.ts`, `src/lib/plan.ts`, `profile/page.tsx` (badges + `updateDisplayName`) |
| Recipes browse & detail | **Partial** | `src/app/recipes/page.tsx`, `src/app/recipes/[id]/page.tsx` |
| Recipe create (upload flow) | **Partial** | `src/app/add/page.tsx`, `src/app/actions/recipes.ts` (`createRecipe`); no rich upload/media pipeline; `updateRecipeStub` returns “not implemented” |
| Help Me Cook + pantry matching | **Done** | `user_pantry` migration + `src/app/actions/pantry.ts`, pantry UI on `/help-me-cook`, `PANTRY_MATCH_MIN_PERCENT` gate in `matchRecipesForPantry` |
| Allergies (user + recipe + filter) | **Done** | `profiles.allergy_mode`, `saveUserAllergies` + `ProfileAllergiesForm`; `recipe_allergens` on create; strict/warn in `matchRecipesForPantry`, `/help-me-cook` badges, `/recipes?safe=*`, detail banners in `recipes/[id]/page.tsx`; keyword hints `src/lib/allergen-detect.ts` on `/add` |
| Allergy education pages | **Not started** | No dedicated routes under `src/app/**` |
| Favorites & counts | **Done** | DB triggers on `favorites` → `recipes.favorites_count` (`20260510120000_initial_schema.sql`); `toggleFavorite` + `RecipeFavoriteButton`; `/saved` list (auth + empty state); `revalidatePath` for `/saved`, `/recipes`, detail, dashboard |
| Wine pairings (Pro gate) | **Done** | `src/app/recipes/[id]/page.tsx` (`isProOrAbove`, blur + `/upgrade` CTA); data from `wine_pairings` |
| Cookbooks (product / creator) | **Partial** | Table `cookbooks` + creator RLS (`20260510170500_*`); `/dashboard/cookbooks`, `/chef/[id]`; Amazon URL allowlist `src/lib/amazon-affiliate-url.ts`; **`price_cents` / direct sale** not wired |
| Stripe subscriptions | **Done** | `src/lib/stripe.ts` + `src/lib/supabase/service.ts`; routes `src/app/api/checkout/route.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/app/api/billing-portal/route.ts`; server actions `src/app/actions/billing.ts`; live `/upgrade` form via `CheckoutTierForm.tsx`; migration `20260510180000_profiles_stripe_columns.sql` adds `profiles.stripe_customer_id` / `stripe_subscription_id` and gates writes to service role only |
| AI Chef features | **Done** | `isAiChef` + `POST /api/ai/recipe-generate`, `/api/ai/substitutions`, `/api/ai/vision-ingredients` (`src/app/api/ai/`); gated UI `/ai-chef`, Help Me Cook CTA + `OPENAI_API_KEY` in `.env.example` |
| Admin & analytics | **Partial** | `src/app/admin/layout.tsx`, `src/lib/admin/require-admin-session.ts`, `src/app/admin/page.tsx` (RPC metrics, event-type breakdown, top affiliate link types, signups chart via `recharts`, paginated events); `GET /api/admin/export/events`; migrations `20260510185000_admin_metrics_rpcs.sql` (`admin_metrics_overview`, `admin_recent_events`), `20260510210000_admin_affiliate_link_types_rpc.sql` (`admin_affiliate_link_types_recent`) — all gated by `is_request_user_admin` |
| Events / telemetry | **Done** | `src/lib/telemetry.ts` (`logEvent`, `sanitizeEventMetadata`) + AI via `logEventForVerifiedUser`; `src/app/actions/telemetry.ts` (`trackClientEvent` allow-list, `recordAffiliateClick`, `logAffiliateClick` wrapper); recipe create/view/favorites, Help Me Cook search, `checkout_started`, signed-in `upgrade_page_view`, signed-in `affiliate_click` duplicate (link_type + recipe_id metadata); migration `20260510191000_events_affiliate_rls_wine_purchase_url.sql` tightens `events`/`affiliate_clicks` INSERT RLS |
| Affiliate tracking | **Done** | `AffiliateOutboundLink` on `/chef/[id]` cookbooks + optional wine buy (`wine_pairings.purchase_url`, allowlisted HTTPS); clicks via `recordAffiliateClick({ linkType, recipeId })` (positional `logAffiliateClick` wrapper retained for existing call sites); admin top-link-types panel (`admin_affiliate_link_types_recent` RPC) |
| i18n | **Partial** | `src/i18n/config.ts`, `src/lib/i18n/server.ts` (`getDictionary`, `resolveAppLocale`, `dictText`), `src/lib/i18n/locale.ts` (`NEXT_LOCALE`, `localeFromAcceptLanguageHeader`); splash + nav + key routes via `common.json` (en/it/fr); `setProfileLanguage`; `proxy` seeds locale cookie from `Accept-Language`; root `layout` sets `lang` from cookie/profile. Remaining: deep components (forms, checkout copy), `/chef/*`, admin. |
| YouTube video | **Done** | `src/lib/youtube.ts`, embed on `recipes/[id]/page.tsx`; optional URL on `add/page.tsx` |
| Middleware / proxy | **Done** | `src/proxy.ts` only (Next.js 16 forbids `middleware.ts` alongside `proxy.ts`); Supabase cookie session refresh + `/admin` and `/api/admin/**` gate |

---

## PRD themes (detail)

### Authentication & sessions

- **Partial** — Server/client Supabase wiring and session refresh exist (`src/proxy.ts`, `src/lib/supabase/server.ts`). End-user **sign-in / sign-up UI is missing** (called out in `profile/page.tsx`, `add/page.tsx`).

### Recipes & upload / creator tools

- **Partial** — Create recipe via server action with ingredients, tags, allergens, optional YouTube URL (`src/app/actions/recipes.ts`, `src/app/add/page.tsx`). Recipe editing, images, and Stripe-gated creator tools are **not** implemented (`updateRecipeStub`, comments in `add/page.tsx`).

### Help Me Cook (matching) & allergies

- **Partial** — Ingredient overlap scoring, missing list, and signed-in allergen exclusion (`src/app/help-me-cook/page.tsx`, `matchRecipesForPantry`). **Persisted pantry** (beyond one-shot textarea) not present.

### Favorites & social counts

- **Done** — `favorites_count` via triggers; save toggle on recipe detail; `/saved` lists favorited recipes; dashboard shows saved count vs saves on authored recipes (`src/app/dashboard/page.tsx`).

### Wine (Pro gating)

- **Done** — Pro and AI Chef unlock wine section via `winePairingsUnlockedForPlan` / `getCurrentUserPlanType` (`src/app/recipes/[id]/page.tsx`, `src/lib/plan.ts`, `src/lib/profile.ts`).

### Cookbooks

- **Partial** — Creator CRUD dashboard (`/dashboard/cookbooks`), public chef grid (`/chef/[id]`) with affiliate disclosure + `rel="sponsored noopener noreferrer"`. Schema unchanged from initial migration (no Stripe file sale in this slice). **`chef_public_profile` RPC** for safe public header without broad `profiles` SELECT.

### Stripe (Pro / AI Chef)

- **Done** — `stripe@^22` SDK; Checkout (`POST /api/checkout` + `createCheckoutSession` server action), Customer Portal (`POST /api/billing-portal` + `openBillingPortal` server action), and signed webhook (`POST /api/webhooks/stripe`) handling `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Webhook uses the service-role Supabase client (`src/lib/supabase/service.ts`) to update `profiles.plan_type` and persist `stripe_customer_id` / `stripe_subscription_id`; the privileged-column trigger blocks any non-service-role write to those columns (`supabase/migrations/20260510180000_profiles_stripe_columns.sql`). `/upgrade` now ships a working monthly/yearly form per tier (`src/components/billing/CheckoutTierForm.tsx`).

### AI Chef

- **Done** — Server routes call OpenAI with `OPENAI_API_KEY`; `requireAiChef` + `getCurrentUserPlanType`; `/ai-chef` + Help Me Cook link card; usage rows in `events`.

### Admin, analytics, events

- **Partial** — Admin gated by `profiles.is_admin` (`src/app/admin/layout.tsx`, `src/lib/admin/require-admin-session.ts`, `src/proxy.ts` for `/admin` and `/api/admin/**`). Cross-user metrics use **SECURITY DEFINER** RPCs (`admin_metrics_overview`, `admin_recent_events`, `admin_affiliate_link_types_recent`) wrapping `is_request_user_admin()` — anon server client + user JWT only (no service role in the browser). Dashboard cards (profiles, recipes, favorites total, events and affiliate clicks in the last 7 days), event-type breakdown, **top affiliate link types (7 days)**, **recharts** signup series (~30 days), paginated recent events, and **CSV export** (`GET /api/admin/export/events?since=`). Profile → “Admin dashboard” link for admins. **`events` rows** — product flows (recipes, favorites, Help Me Cook, checkout, upgrade view, `affiliate_click`) plus AI usage (`ai_*` via `logAiUsageEvent`); deeper funnels / warehouse analytics still optional.

### i18n

- **Partial** — react-i18next on the client; server pages use `getDictionary` + `dictText` (`src/lib/i18n/server.ts`) for browse, recipe detail UI + localized metadata titles, Help Me Cook, profile, upgrade, login, dashboard, add, saved, `/learn/allergies`, and AI Chef workbench. **`NEXT_LOCALE`** cookie (set on splash via **`setProfileLanguage`**, synced to **`profiles.language`** when signed in) plus optional first-visit **`Accept-Language`** hint in **`proxy.ts`**. **`AppProviders`**/`useLayoutEffect` align i18next with server-chosen locale. Not done: locale-segment URLs, full coverage of every sub-form and secondary routes.

### Video (YouTube)

- **Done** — Parse + embed (`src/lib/youtube.ts`, recipe detail).

### Allergy education

- **Not started** — No dedicated education routes/components found.

### Affiliate links

- **Done** — Cookbook Amazon links on `/chef/[id]` and optional wine `purchase_url` on recipe detail (Pro / AI Chef) route through `AffiliateOutboundLink` → `recordAffiliateClick({ linkType, recipeId })`. The new server action inserts the canonical `affiliate_clicks` row (anon → `user_id` null; signed-in → `user_id = auth.uid()`) and additionally writes a duplicate `affiliate_click` row to `events` with sanitized `{ link_type, recipe_id }` metadata for signed-in users (RLS enforces ownership). Existing positional `logAffiliateClick(recipeId, linkType)` is kept as a thin wrapper so already-wired UI components are untouched. Admin dashboard surfaces a top-link-types panel via `admin_affiliate_link_types_recent` (SECURITY DEFINER, `is_request_user_admin` gated) — no service role in the browser.

### Pantry

- **Partial** — “Pantry” behavior is **Help Me Cook** text input only; no `pantry` table or saved inventory.

---

## Recommended build order (part by part)

Work in dependency order; adjust if PRD prioritizes revenue or AI differently.

1. **Auth UI** — Email/OAuth flows so profiles, allergies, and recipe create are reachable without manual session setup (`profile/page.tsx`, `add/page.tsx` blockers).
2. **Favorites** — Insert/delete `favorites`, wire `/saved`, optional heart on `RecipeListCard` / detail; validates RLS and counts end-to-end.
3. **Stripe** — Install Stripe, Checkout + Customer Portal routes, webhook to update `profiles.plan_type` (service role server-side only); enable `upgrade/page.tsx`.
4. **Subscription ↔ feature gates** — Keep wine as Pro+; add any Pro-only analytics/dashboard pieces after billing works (`dashboard/page.tsx` currently stub).
5. **Creator / recipe polish** — Image upload, recipe edit, moderation hooks; align with PRD upload story.
6. **Cookbooks** — CRUD + discovery UI on top of existing `cookbooks` table.
7. **Events & admin analytics** — ~~Server-side event inserts~~ **`logEvent` + keyed flows shipped**; extend admin dashboards via `events` + **`is_request_user_admin` RPCs** (preferred for cross-user aggregates); reserve service role for webhooks/backend jobs only (`src/app/api/admin/*` uses cookie session + anon server client).
8. **Affiliate** — ~~Link components + `affiliate_clicks` inserts~~ **`AffiliateOutboundLink` + `logAffiliateClick` shipped**; richer admin reporting still optional.
9. **AI Chef** — Shipped (`src/app/api/ai/*`, `/ai-chef`, `OPENAI_API_KEY`). Extend UX or analytics as PRD evolves.
10. **i18n pass** — Namespace strings for main routes or Next.js i18n routing if PRD requires locale URLs.
11. **Allergy education & pantry persistence** — Static/dynamic education pages; optional pantry table + sync with Help Me Cook.

---

## Quick reference: key paths

| Area | Paths |
| --- | --- |
| App routes | `src/app/**` |
| UI components | `src/components/**` |
| Lib / tiers / pricing / telemetry | `src/lib/plan.ts`, `src/lib/pricing.ts`, `src/lib/youtube.ts`, `src/lib/ingredients.ts`, `src/lib/telemetry.ts` |
| Server actions | `src/app/actions/recipes.ts`, `src/app/actions/profile.ts`, `src/app/actions/telemetry.ts` |
| Supabase | `src/lib/supabase/*`, `supabase/migrations/20260510120000_initial_schema.sql`, `supabase/migrations/20260510191000_events_affiliate_rls_wine_purchase_url.sql`, `supabase/migrations/20260510210000_admin_affiliate_link_types_rpc.sql` |
| Middleware / proxy | `src/proxy.ts` (not `middleware.ts`; Next 16 proxy-only) |
| Env template | `.env.example` |

---

*Generated from repository scan; update this file as features ship.*
