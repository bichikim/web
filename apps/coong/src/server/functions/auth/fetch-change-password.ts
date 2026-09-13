'use server'

import {createSupabase} from 'src/utils/supabase'
import type {User} from '@supabase/supabase-js'

export const fetchChangePassword = async (newPassword: string): Promise<User | null> => {
  const supabase = createSupabase()

  const {data, error} = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data.user
}
