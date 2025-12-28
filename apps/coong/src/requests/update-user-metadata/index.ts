import {createSupabase} from 'src/utils/supabase'
import {action} from '@solidjs/router'

export const fetchUpdateUserMetadata = async (metadata: Record<string, unknown>) => {
  'use server'

  const supabase = createSupabase()

  // Get current user
  const {
    data: {user},
    error: getUserError,
  } = await supabase.auth.getUser()

  if (getUserError || !user) {
    throw new Error('Unauthorized')
  }

  // Attempt to update user_metadata
  // This should be blocked by the SQL trigger if user is not admin
  const {data, error} = await supabase.auth.updateUser({
    data: metadata,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const updateUserMetadataAction = action(fetchUpdateUserMetadata, 'auth/update-user-metadata')
