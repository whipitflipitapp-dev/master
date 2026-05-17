-- Allow privacy-safe anonymous recipe view events for creator analytics.
-- Anonymous rows may only be recipe_viewed events with user_id NULL and a
-- single recipe_id metadata field; authenticated event inserts remain own-user.

DROP POLICY IF EXISTS "events_insert_authenticated_own_user" ON public.events;
DROP POLICY IF EXISTS "events_insert_authenticated_own_or_anonymous_recipe_view" ON public.events;

CREATE POLICY "events_insert_authenticated_own_or_anonymous_recipe_view" ON public.events
  FOR INSERT
  WITH CHECK (
    (
      auth.uid () IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      auth.uid () IS NULL
      AND user_id IS NULL
      AND event_type = 'recipe_viewed'
      AND jsonb_typeof(metadata) = 'object'
      AND metadata ? 'recipe_id'
      AND (metadata - 'recipe_id') = '{}'::jsonb
      AND jsonb_typeof(metadata -> 'recipe_id') = 'string'
      AND (metadata ->> 'recipe_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
  );

COMMENT ON POLICY "events_insert_authenticated_own_or_anonymous_recipe_view" ON public.events IS 'Authenticated inserts must use the JWT subject; anonymous inserts are limited to recipe_viewed rows with user_id NULL and recipe_id-only metadata.';
