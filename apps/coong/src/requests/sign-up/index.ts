import {action} from '@solidjs/router'
import {createSupabase} from 'src/utils/supabase'
import {getSelfUrl} from 'src/env/self'
import {joinURL} from 'ufo'

export interface SignUpPayload {
  email: string
  password: string
  redirectTo: string
}

export const fetchSignUp = async ({email, password, redirectTo}: SignUpPayload) => {
  'use server'

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

export const signUpAction = action(fetchSignUp, 'auth/sign-up')
