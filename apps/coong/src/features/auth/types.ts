import type {createSupabase} from 'src/utils/supabase'
import type {EmailOtpType} from '@supabase/supabase-js'

export type Supabase = ReturnType<typeof createSupabase>
export type SignInWithPasswordReturnType = Awaited<
  ReturnType<Supabase['auth']['signInWithPassword']>
>
type NeverNullable<T> = T extends null | undefined ? never : T
export type Session = NeverNullable<NonNullable<SignInWithPasswordReturnType['data']>['session']>

export interface SignInPayload {
  email: string
  password: string
}

export interface SignUpPayload {
  email: string
  password: string
  redirectTo: string
}

export interface VerifyOtpPayload {
  tokenHash: string
  type: EmailOtpType
}
