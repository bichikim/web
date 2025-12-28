import {createSupabase} from 'src/utils/supabase'
import {action} from '@solidjs/router'
import type {User} from '@supabase/supabase-js'

export const fetchChangePassword = async (newPassword: string): Promise<User | null> => {
  'use server'

  const supabase = createSupabase()

  const {data, error} = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data.user
}

export const changePasswordAction = action(fetchChangePassword, 'auth/change-password')
