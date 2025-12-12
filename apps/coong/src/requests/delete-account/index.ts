import {createSupabase} from 'src/utils/supabase'
import {action} from '@solidjs/router'
import {db} from 'src/server/db'
import {profiles} from 'src/server/db/schema/profiles'
import {eq} from 'drizzle-orm'

export const deleteAccountAction = action(async () => {
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

  // Update deleted_at instead of deleting the user
  await db
    .update(profiles)
    .set({
      deletedAt: new Date(),
    })
    .where(eq(profiles.id, user.id))

  // Sign out the user after marking account as deleted
  const {error: signOutError} = await supabase.auth.signOut()

  if (signOutError) {
    throw new Error(signOutError.message)
  }

  return {success: true}
}, 'auth/delete-account')
