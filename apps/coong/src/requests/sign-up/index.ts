import {action} from '@solidjs/router'
import {createSupabase} from 'src/utils/supabase'
import {getSelfUrl} from 'src/env/self'
import {joinURL} from 'ufo'
import {VERIFY_EMAIL_PATH} from 'src/utils/route-names'

export const fetchSignUp = async ({email, password}: {email: string; password: string}) => {
  'use server'

  const supabase = createSupabase()

  console.log(joinURL(getSelfUrl(), VERIFY_EMAIL_PATH))

  const {data, error} = await supabase.auth.signUp({
    email,
    options: {
      emailRedirectTo: joinURL(getSelfUrl(), VERIFY_EMAIL_PATH),
    },
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const signUpAction = action(fetchSignUp, 'auth/sign-up')
