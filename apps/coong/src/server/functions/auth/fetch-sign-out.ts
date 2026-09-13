'use server'

import {createSupabase} from 'src/utils/supabase'

export const fetchSignOut = async () => {
  const supabase = createSupabase()

  const {error} = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}
