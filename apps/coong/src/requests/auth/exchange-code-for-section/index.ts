import {action} from '@solidjs/router'
import {createSupabase} from 'src/utils/supabase'

export const fetchExchangeCodeForSection = async (code: string) => {
  'use server'

  const supabase = createSupabase()

  const {data, error} = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    throw new Error(error.message)
  }

  return data.user
}

export const exchangeCodeForSectionAction = action(
  fetchExchangeCodeForSection,
  'auth/exchange-code-for-section',
)
