import {useMutation} from '@tanstack/solid-query'
import {createSupabase} from 'src/utils/supabase'

export const useSignIn = () => {
  const supabase = createSupabase()

  return useMutation(() => ({
    mutationFn: async ({email, password}: {email: string; password: string}) => {
      const {data, error} = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new Error(error.message)
      }

      return data
    },
  }))
}
