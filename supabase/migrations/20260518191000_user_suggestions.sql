-- User suggestion box with submitter snapshots for admin review.

CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  suggestion text NOT NULL CHECK (char_length(trim(suggestion)) BETWEEN 1 AND 300),
  submitter_email text NOT NULL,
  submitter_name text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'dismissed')),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX suggestions_created_at_idx ON public.suggestions (created_at DESC);
CREATE INDEX suggestions_user_id_idx ON public.suggestions (user_id);
CREATE INDEX suggestions_status_idx ON public.suggestions (status);

CREATE OR REPLACE FUNCTION public.populate_suggestion_submitter_snapshot ()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  actor_id uuid := auth.uid ();
  actor_email text;
  actor_name text;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authenticated user required' USING ERRCODE = '28000';
  END IF;

  SELECT
    u.email,
    COALESCE(
      NULLIF(trim(p.display_name), ''),
      NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
      NULLIF(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(split_part(u.email, '@', 1), '')
    )
  INTO actor_email, actor_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = actor_id;

  NEW.user_id := actor_id;
  NEW.suggestion := trim(NEW.suggestion);
  NEW.submitter_email := COALESCE(actor_email, '');
  NEW.submitter_name := actor_name;
  NEW.status := 'new';
  NEW.reviewed_at := NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER suggestions_populate_submitter_snapshot
  BEFORE INSERT ON public.suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_suggestion_submitter_snapshot ();

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suggestions_select_own_or_admin" ON public.suggestions
  FOR SELECT
  USING (user_id = auth.uid () OR public.is_request_user_admin ());

CREATE POLICY "suggestions_insert_authenticated_owner" ON public.suggestions
  FOR INSERT
  WITH CHECK (auth.uid () IS NOT NULL AND user_id = auth.uid ());

CREATE POLICY "suggestions_update_admin" ON public.suggestions
  FOR UPDATE
  USING (public.is_request_user_admin ())
  WITH CHECK (public.is_request_user_admin ());

CREATE POLICY "suggestions_delete_admin" ON public.suggestions
  FOR DELETE
  USING (public.is_request_user_admin ());
