-- Map Google/OAuth user_metadata.name into display_name when full_name is absent.
CREATE OR REPLACE FUNCTION public.handle_new_user ()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
