-- PostgreSQL keeps the 3-arg overload when p_tag_names was added; PostgREST may call it and ignore category filter.
DROP FUNCTION IF EXISTS public.list_recipes_for_browse (integer, text, uuid[]);
