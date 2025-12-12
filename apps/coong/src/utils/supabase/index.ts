import {createBrowserClient} from '@supabase/ssr'
import {createSupabaseServer} from './supabase-server'
import {isServer, getRequestEvent} from 'solid-js/web'
import {getSupabaseClientKeys} from 'src/env/self'

export const createSupabase = () => {
  const {key, url} = getSupabaseClientKeys()

  if (isServer) {
    const event = getRequestEvent()

    if (!event) {
      throw new Error('No event found')
    }

    if (event.locals?.supabase) {
      return event.locals.supabase
    }

    return createSupabaseServer(event)
  }

  return createBrowserClient(url, key)
}

export * from './supabase-server'
