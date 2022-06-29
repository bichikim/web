import {AuthChangeEvent, Session} from '@supabase/gotrue-js'
import {createClient} from '@supabase/supabase-js'
import {computed, ref} from 'vue'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_API)

const sessionRef = ref<null | Session>(null)
supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: null | Session) => {
  sessionRef.value = session
})

export const useSupabaseSession = () => {
  return computed(() => sessionRef.value)
}
