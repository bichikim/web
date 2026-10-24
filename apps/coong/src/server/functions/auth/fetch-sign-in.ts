'use server'

import type {SignInPayload} from 'src/features/auth/types'
import {createSupabase} from 'src/utils/supabase'

export const fetchSignIn = async ({email, password}: SignInPayload) => {
  const supabase = createSupabase()

  const {data, error} = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
