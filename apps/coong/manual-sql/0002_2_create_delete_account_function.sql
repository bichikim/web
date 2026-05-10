-- Self-deletion RPC for the currently authenticated user.
-- Runs as SECURITY DEFINER so it can DELETE from auth.users while
-- only allowing the caller to delete their own row (auth.uid() check).
-- Cascades on auth.users.id (e.g. profiles.id) automatically remove
-- application-level data.

DROP FUNCTION IF EXISTS public.delete_account() CASCADE;

CREATE OR REPLACE FUNCTION public.delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid;
BEGIN
  caller_id := auth.uid();

  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Forbidden: not authenticated';
  END IF;

  DELETE FROM auth.users WHERE id = caller_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_account() TO authenticated;
