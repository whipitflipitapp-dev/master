-- Pro-tier hosted recipe reels (one MP4/WebM per recipe, in-app playback).

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS hosted_reel_url text;

COMMENT ON COLUMN public.recipes.hosted_reel_url IS
  'Public Supabase Storage URL for an uploaded reel (recipe-videos bucket). Pro+ only at app layer.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'recipe-videos',
    'recipe-videos',
    TRUE,
    52428800, -- 50 MiB (max 3 min reels)
    ARRAY['video/mp4', 'video/quicktime', 'video/webm']::text[]
  )
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "recipe_videos_public_read" ON storage.objects;

CREATE POLICY "recipe_videos_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'recipe-videos');

DROP POLICY IF EXISTS "recipe_videos_auth_insert_own_prefix" ON storage.objects;

CREATE POLICY "recipe_videos_auth_insert_own_prefix"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recipe-videos'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "recipe_videos_auth_update_own_prefix" ON storage.objects;

CREATE POLICY "recipe_videos_auth_update_own_prefix"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recipe-videos'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'recipe-videos'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "recipe_videos_auth_delete_own_prefix" ON storage.objects;

CREATE POLICY "recipe_videos_auth_delete_own_prefix"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'recipe-videos'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);
