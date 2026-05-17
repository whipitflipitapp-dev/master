-- Profile avatars — public bucket, user-scoped paths `{auth.uid()}/...` (PNG/JPEG).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'avatars',
    'avatars',
    TRUE,
    2097152, -- 2 MiB
    ARRAY['image/png', 'image/jpeg']::text[]
  )
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;

CREATE POLICY "avatars_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_insert_own_prefix" ON storage.objects;

CREATE POLICY "avatars_auth_insert_own_prefix"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_auth_update_own_prefix" ON storage.objects;

CREATE POLICY "avatars_auth_update_own_prefix"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_auth_delete_own_prefix" ON storage.objects;

CREATE POLICY "avatars_auth_delete_own_prefix"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);
