import {action} from '@solidjs/router'
import type {EmailOtpType} from '@supabase/supabase-js'
import {createSupabase} from 'src/utils/supabase'

export interface VerifyOtpPayload {
  tokenHash: string
  type: EmailOtpType
}

export const fetchVerifyOtp = async ({tokenHash, type}: VerifyOtpPayload) => {
  'use server'

  const supabase = createSupabase()

  // Supabase `verifyOtp` expects snake_case property names.
  // oxlint-disable-next-line eslint-js/camelcase
  const {data, error} = await supabase.auth.verifyOtp({token_hash: tokenHash, type})

  if (error) {
    throw new Error(error.message)
  }

  return data.user
}

export const verifyOtpAction = action(fetchVerifyOtp, 'auth/verify-otp')
