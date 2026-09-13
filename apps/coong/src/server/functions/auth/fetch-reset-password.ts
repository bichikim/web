'use server'

import {createSupabase} from 'src/utils/supabase'
import {getSelfUrl} from 'src/env'
import {buildPasswordRecoveryRedirectUrl} from 'src/features/auth/redirect-url'

export const fetchResetPassword = async (email: string): Promise<void> => {
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
