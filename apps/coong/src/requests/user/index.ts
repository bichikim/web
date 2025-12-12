import {useQuery} from '@tanstack/solid-query'
import {useSupabase} from 'src/use/supabase'
import {createSupabase} from 'src/utils/supabase'
import {query} from '@solidjs/router'

export const AUTH_QUERY_KEY = 'auth'

export const userQuery = query(async () => {
  const supabase = createSupabase()

  const {
    data: {user},
  } = await supabase.auth.getUser()

  return user
}, 'auth/user')
