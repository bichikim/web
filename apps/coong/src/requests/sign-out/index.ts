import {createSupabase} from 'src/utils/supabase'
import {action} from '@solidjs/router'

export const fetchSignOut = async () => {
  'use server'

  const supabase = createSupabase()

  const {error, data} = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const signOutAction = action(fetchSignOut, 'auth/sign-out')
