import {useMutation} from '@tanstack/solid-query'
import {createSupabase} from 'src/utils/supabase'
import {action} from '@solidjs/router'

export const signInAction = action(async ({email, password}: {email: string; password: string}) => {
  'use server'

  const supabase = createSupabase()

  const {data, error} = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  console.log('data', data)

  return data
}, 'auth/sign-in')
