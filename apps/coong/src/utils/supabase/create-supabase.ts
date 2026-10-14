import {createBrowserClient} from '@supabase/ssr'
import type {Database, SupabaseClient} from '@supabase/supabase-js'
import {createSupabaseServer} from './supabase-server'
import {getRequestEvent, isServer} from 'solid-js/web'
import {getSupabaseClientKeys} from 'src/env'

/** 서버에서는 요청에 연결된 클라이언트를 재사용하거나 만들고, 브라우저에서는 공개 키로 클라이언트를 만든다. */
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
