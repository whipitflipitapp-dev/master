-- Tighten hosted reel storage cap (50 MiB) for cost and faster downloads.

UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'recipe-videos';
