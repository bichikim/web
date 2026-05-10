import {createBrowserClient} from '@supabase/ssr'
import {getRequestEvent, isServer} from 'solid-js/web'
import {getSupabaseClientKeys} from 'src/env'
import {createSupabaseServer} from 'src/utils/supabase'

export const useSupabase = () => {
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
