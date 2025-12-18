import {createServerClient, parseCookieHeader} from '@supabase/ssr'
import {getSupabaseClientKeys} from 'src/env/self'
import type {RequestEvent} from 'solid-js/web'
import {setCookie} from 'vinxi/http'

export const createSupabaseServer = (event: RequestEvent) => {
  const {key, url} = getSupabaseClientKeys()

  return createServerClient(url, key, {
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
        cookiesToSet.forEach(({name, value, options}) => {
          setCookie(event.nativeEvent, name, value, {
            path: '/',
            sameSite: 'lax',
            secure: import.meta.env.PROD,
            ...options,
          })
        })
      },
    },
  })
}
