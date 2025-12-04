import {useQuery} from '@tanstack/solid-query'
import {useSupabase} from 'src/use/supabase'

export const AUTH_QUERY_KEY = 'auth'

export const useUser = () => {
  const supabase = useSupabase()

  const query = useQuery(() => ({
    queryFn: async () => {
      const {
        data: {user},
      } = await supabase.auth.getUser()

      return user
    },
    queryKey: [AUTH_QUERY_KEY],
  }))

  return query
}
