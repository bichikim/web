/**
 * Prevent all user_metadata updates from client-side updateUser
 * This trigger will revert any changes to raw_user_meta_data made via client-side updateUser
 * Only server-side admin.updateUserById can change user_metadata
 *
 * Note: Drizzle doesn't auto-generate triggers, so this SQL needs to be manually added to migration.
 * After running `pnpm db:generate`, add this SQL to the generated migration file.
 */
export const preventUserMetadataUpdateSQL = `
-- Create function to prevent all metadata updates via client
CREATE OR REPLACE FUNCTION prevent_all_metadata_update_via_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Revert all user_metadata changes made via client-side updateUser
  NEW.raw_user_meta_data := OLD.raw_user_meta_data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_all_metadata_update_trigger ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER prevent_all_metadata_update_trigger
BEFORE UPDATE ON auth.users
FOR EACH ROW
WHEN (
  (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
)
EXECUTE FUNCTION prevent_all_metadata_update_via_client();
`
