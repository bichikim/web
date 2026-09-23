'use server'

import type {VerifyOtpPayload} from 'src/features/auth/types'
import {createSupabase} from 'src/utils/supabase'

export const fetchVerifyOtp = async ({tokenHash, type}: VerifyOtpPayload) => {
  const supabase = createSupabase()

  // Supabase `verifyOtp` expects snake_case property names.
  // oxlint-disable-next-line eslint-js/camelcase
  const {data, error} = await supabase.auth.verifyOtp({token_hash: tokenHash, type})

  if (error) {
    throw new Error(error.message)
  }

  return data.user
}
