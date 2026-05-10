-- Function in public schema to prevent specific user_metadata fields from being updated by non-admin users
-- Only protects user_metadata.metadata field (and other specified fields)
-- Allows updates if:
-- 1. Performed by service_role (admin API calls)
-- 2. Current user has '$admin' role in user_roles table
-- 3. Protected fields in user_metadata are not being changed (allows password reset, magic link, etc.)

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS prevent_user_metadata_update_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.prevent_user_metadata_update() CASCADE;

CREATE OR REPLACE FUNCTION public.prevent_user_metadata_update()
RETURNS TRIGGER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean;
  jwt_role text;
  old_value jsonb;
  new_value jsonb;
BEGIN
  -- Check JWT role (may be NULL for Supabase internal operations)
  BEGIN
    jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    jwt_role := NULL;
  END;

  -- Allow updates if performed by service_role (admin API or Supabase dashboard)
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- auth.users stores app/API "user metadata" in raw_user_meta_data (not user_metadata)
  old_value := COALESCE(OLD.raw_user_meta_data, '{}'::jsonb);
  new_value := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  -- If the metadata field is being changed, check permissions
  -- Use -> instead of ->> to compare JSONB objects properly
  -- IS DISTINCT FROM handles NULL correctly (field doesn't exist = NULL)
  IF (new_value->'metadata') IS DISTINCT FROM (old_value->'metadata') THEN
    -- Get current user ID from JWT
    BEGIN
      current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      current_user_id := NULL;
    END;

    -- If no user ID, deny the update
    IF current_user_id IS NULL THEN
      RAISE EXCEPTION 'Forbidden: Cannot update user_metadata.metadata. Only admins can update this field';
    END IF;

    -- Check if user has admin role
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.owner_id = current_user_id
      AND user_roles.role = '$admin'
    ) INTO is_admin;

    -- If user is not admin, prevent the update
    IF NOT is_admin THEN
      RAISE EXCEPTION 'Forbidden: Only admins can update user_metadata.metadata';
    END IF;
  END IF;

  -- If no protected fields were changed, allow the update
  -- This allows password reset, magic link, and other Supabase operations
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table (this may still require special permissions)
CREATE TRIGGER prevent_user_metadata_update_trigger
BEFORE UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_metadata_update();
