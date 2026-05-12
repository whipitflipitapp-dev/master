-- Favorites must survive when auth.users exists but public.profiles row is missing
-- (trigger skipped / legacy users). Previously INSERT failed FK → favorites.user_id → profiles(id).

ALTER TABLE public.favorites
  DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;

ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users (id)
  ON DELETE CASCADE;
