import {action} from '@solidjs/router'
import {createSupabase} from 'src/utils/supabase'

export const signUpAction = action(async ({email, password}: {email: string; password: string}) => {
  'use server'

  const supabase = createSupabase()

  const {data, error} = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}, 'auth/sign-up')
