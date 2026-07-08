import {createSupabase} from 'src/utils/supabase'
import {action} from '@solidjs/router'
import {getSelfUrl} from 'src/env'
import {buildPasswordRecoveryRedirectUrl} from './redirect-url'

export {
  buildPasswordRecoveryRedirectUrl,
  CHANGE_PASSWORD_PATH,
  PASSWORD_RECOVERY_VERIFY_PATH,
} from './redirect-url'

export const fetchResetPassword = async (email: string): Promise<void> => {
  'use server'

  const supabase = createSupabase()
  const baseUrl = getSelfUrl()
  const redirectTo = buildPasswordRecoveryRedirectUrl(baseUrl)

  const {error} = await supabase.auth.resetPasswordForEmail(email, {
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
