import {createSupabase} from 'src/utils/supabase'
import {action} from '@solidjs/router'

export const fetchSignOut = async () => {
  'use server'

  const supabase = createSupabase()

  const {error} = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

export const signOutAction = action(fetchSignOut, 'auth/sign-out')
