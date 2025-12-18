import {createSupabase} from 'src/utils/supabase'
import {query} from '@solidjs/router'

export const AUTH_QUERY_KEY = 'auth'

export const fetchUser = async () => {
  'use server'

  const supabase = createSupabase()

  const {
    data: {user},
  } = await supabase.auth.getUser()

  return user
}

export const userQuery = query(fetchUser, 'auth/user')
