-- Recipe cover images — Supabase Storage bucket + policies (PNG/JPEG only at bucket MIME allowlist).
--
-- Dashboard note:
--   • bucket `recipe-images` is PUBLIC: objects get a stable
--     /storage/v1/object/public/recipe-images/... URL suitable for listing cards (Cookpad-style).
--   • For private buckets instead, omit public URLs and serve via signed URLs from a Route Handler;
--     you would tighten SELECT policies and use createSignedUrls server-side — not used here.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'recipe-images',
    'recipe-images',
    TRUE,
    5242880, -- 5 MiB server-side ceiling (still validate on client)
    ARRAY['image/png', 'image/jpeg']::text[]
  )
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Allow anyone (including anon) to read objects — required for open graph / recipe grids when using public URLs.
DROP POLICY IF EXISTS "recipe_images_public_read"
  ON storage.objects;

CREATE POLICY "recipe_images_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'recipe-images');

-- INSERT: authenticated users only; object path must start with `<auth.uid()>/<filename>` within this bucket.
DROP POLICY IF EXISTS "recipe_images_auth_insert_own_prefix"
  ON storage.objects;

CREATE POLICY "recipe_images_auth_insert_own_prefix"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recipe-images'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- UPDATE: same folder ownership (overwrite / upsert semantics from client libs).
DROP POLICY IF EXISTS "recipe_images_auth_update_own_prefix"
  ON storage.objects;

CREATE POLICY "recipe_images_auth_update_own_prefix"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'recipe-images'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- DELETE: optional cleanup — same prefix rule so users cannot delete others' uploads.
DROP POLICY IF EXISTS "recipe_images_auth_delete_own_prefix"
  ON storage.objects;

CREATE POLICY "recipe_images_auth_delete_own_prefix"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);
