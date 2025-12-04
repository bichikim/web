import {useMutation} from '@tanstack/solid-query'
import {createSupabase} from 'src/utils/supabase'

export const useSignOut = () => {
  const supabase = createSupabase()

  return useMutation(() => ({
    mutationFn: async () => {
      const {error, data} = await supabase.auth.signOut()

      if (error) {
        throw new Error(error.message)
      }

      return data
    },
  }))
}
