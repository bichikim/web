'use server'

import {createSupabase} from 'src/utils/supabase'

export const fetchDeleteAccount = async () => {
  const supabase = createSupabase()

  const {error: deleteError} = await supabase.rpc('delete_account')

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  const {error: signOutError} = await supabase.auth.signOut()

  if (signOutError) {
    throw new Error(signOutError.message)
  }

  return {success: true}
}
