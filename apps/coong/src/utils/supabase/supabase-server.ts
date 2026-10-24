import {createServerClient, parseCookieHeader, serializeCookieHeader} from '@supabase/ssr'
import type {Database, SupabaseClient} from '@supabase/supabase-js'
import {getSupabaseClientKeys} from 'src/env'
import type {RequestEvent} from 'solid-js/web'

export const createSupabaseServer = (event: RequestEvent): SupabaseClient<Database> => {
  const {key, url} = getSupabaseClientKeys()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        const cookieHeader = event.request.headers.get('Cookie')
        const cookies = parseCookieHeader(cookieHeader ?? '')

        return cookies.map((cookie) => ({
          name: cookie.name,
          value: cookie.value ?? '',
        }))
      },
      setAll(cookiesToSet) {
        for (const {name, value, options} of cookiesToSet) {
          try {
            event.response.headers.append('Set-Cookie', serializeCookieHeader(name, value, options))
          } catch {
            // ignore — headers may already be sent
          }
        }
      },
    },
  })
}
