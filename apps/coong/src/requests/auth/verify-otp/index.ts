import {action} from '@solidjs/router'
import type {EmailOtpType} from '@supabase/supabase-js'
import {createSupabase} from 'src/utils/supabase'

export interface VerifyOtpPayload {
  token_hash: string
  type: EmailOtpType
}

export const fetchVerifyOtp = async ({token_hash, type}: VerifyOtpPayload) => {
  'use server'

  const supabase = createSupabase()

  const {data, error} = await supabase.auth.verifyOtp({token_hash, type})

  if (error) {
    throw new Error(error.message)
  }

  return data.user
}

export const verifyOtpAction = action(fetchVerifyOtp, 'auth/verify-otp')
