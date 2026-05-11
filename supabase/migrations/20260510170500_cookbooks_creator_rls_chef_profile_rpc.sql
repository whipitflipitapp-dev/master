-- Cookbooks: creator-only UPDATE/DELETE (public read unchanged).
-- Public chef header (display name + avatar) without opening profiles SELECT to anon.

DROP POLICY IF EXISTS "cookbooks_update_owner_or_admin" ON public.cookbooks;
DROP POLICY IF EXISTS "cookbooks_delete_owner_or_admin" ON public.cookbooks;

CREATE POLICY "cookbooks_update_owner" ON public.cookbooks
  FOR UPDATE
  USING (created_by = auth.uid ())
  WITH CHECK (created_by = auth.uid ());

CREATE POLICY "cookbooks_delete_owner" ON public.cookbooks
  FOR DELETE
  USING (created_by = auth.uid ());

CREATE OR REPLACE FUNCTION public.chef_public_profile (p_user_id uuid)
  RETURNS TABLE (
    display_name text,
    avatar_url text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    p.display_name,
    p.avatar_url
  FROM
    public.profiles p
  WHERE
    p.id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.chef_public_profile (uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chef_public_profile (uuid) TO anon, authenticated;
