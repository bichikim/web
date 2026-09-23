'use server'

import type {SignUpPayload} from 'src/features/auth/types'
import {createSupabase} from 'src/utils/supabase'
import {getSelfUrl} from 'src/env'
import {joinURL} from 'ufo'

export const fetchSignUp = async ({email, password, redirectTo}: SignUpPayload) => {
  const supabase = createSupabase()

  const {data, error} = await supabase.auth.signUp({
    email,
    options: {
      emailRedirectTo: joinURL(getSelfUrl(), redirectTo),
    },
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
