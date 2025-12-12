import {createSupabase} from 'src/utils/supabase'
import {action} from '@solidjs/router'

export const signOutAction = action(async () => {
  'use server'

  const supabase = createSupabase()

  const {error, data} = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }

  return data
}, 'auth/sign-out')
