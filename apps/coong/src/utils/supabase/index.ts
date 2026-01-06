import {createBrowserClient} from '@supabase/ssr'
import type {SupabaseClient} from '@supabase/supabase-js'
import {createSupabaseServer} from './supabase-server'
import {getRequestEvent} from 'solid-js/web'
import {getSupabaseClientKeys} from 'src/env/self'
import {isServer} from 'solid-js/web'

export const createSupabase = (): SupabaseClient<Database> => {
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

  return createBrowserClient<Database>(url, key)
}

export * from './supabase-server'
