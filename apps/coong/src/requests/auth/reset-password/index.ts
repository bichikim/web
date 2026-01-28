import {createSupabase} from 'src/utils/supabase'
import {action} from '@solidjs/router'
import {getSelfUrl} from 'src/env/self'

export const fetchResetPassword = async (email: string): Promise<void> => {
  'use server'

  const supabase = createSupabase()
  const baseUrl = getSelfUrl()
  const redirectTo = `${baseUrl}/public/change-password`

  const {data, error} = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Send password reset email to user
 * @param email - User's email address
 */
export const resetPasswordAction = action(fetchResetPassword, 'auth/reset-password')
