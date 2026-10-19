import {type Accessor, createEffect, createMemo, onCleanup} from 'solid-js'
import {createMediaCache, type MediaCache} from './create-media-cache'

/** Owns a viewer's media cache and clears it when its session changes or the viewer closes. */
export const useMediaCache = (session: Accessor<string | null>): MediaCache => {
  const cache = createMediaCache()
  const current = createMemo(session)
  createEffect(() => {
    current()
    cache.clear()
  })
  onCleanup(cache.clear)
  return cache
}
