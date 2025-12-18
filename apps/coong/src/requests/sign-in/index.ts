import {useMutation} from '@tanstack/solid-query'
import {createSupabase} from 'src/utils/supabase'
import {action} from '@solidjs/router'

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
