import {createSupabase} from 'src/utils/supabase'
import {action} from '@solidjs/router'

export type Supabase = ReturnType<typeof createSupabase>
export type SignInWithPasswordReturnType = Awaited<ReturnType<Supabase['auth']['signInWithPassword']>>
type NeverNullable<T> = T extends null | undefined ? never : T
export type Session = NeverNullable<NonNullable<SignInWithPasswordReturnType['data']>['session']>

export const fetchSignIn = async ({email, password}: {email: string; password: string}) => {
  'use server'

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

export const signInAction = action(fetchSignIn, 'auth/sign-in')
