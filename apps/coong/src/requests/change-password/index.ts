import {createSupabase} from 'src/utils/supabase'
import {action} from '@solidjs/router'

export const changePasswordAction = action(async (newPassword: string) => {
  'use server'

  const supabase = createSupabase()

  const {data, error} = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}, 'auth/change-password')
