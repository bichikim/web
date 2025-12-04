-- Prevent users from updating their own user_metadata via client-side updateUser
-- This trigger will revert any changes to raw_user_meta_data made through client-side updateUser
-- Only server-side admin.updateUserById can change the metadata

-- Function to prevent all metadata changes via client updateUser
CREATE OR REPLACE FUNCTION prevent_all_metadata_update_via_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Revert all user_metadata changes
  NEW.raw_user_meta_data := OLD.raw_user_meta_data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
-- Note: This must be run in Supabase Dashboard SQL Editor with proper permissions
DROP TRIGGER IF EXISTS prevent_all_metadata_update_trigger ON auth.users;
CREATE TRIGGER prevent_all_metadata_update_trigger
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  )
  EXECUTE FUNCTION prevent_all_metadata_update_via_client();
