import {isTauri} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import {onCleanup, onMount} from 'solid-js'
import type {WallpaperLibraryController} from './index'

export const useWebsiteNavigation = (library: WallpaperLibraryController) => {
  let disposed = false
  let stop: (() => void) | null = null
  onMount(() => {
    if (!isTauri()) {
      return
    }
    listen<unknown>('website-visited', ({payload}) => {
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'monitorId' in payload &&
        typeof payload.monitorId === 'string' &&
        'url' in payload &&
        typeof payload.url === 'string'
      ) {
        library.visit(payload.monitorId, payload.url)
      }
    })
      .then((unsubscribe) => {
        if (disposed) {
          unsubscribe()
        } else {
          stop = unsubscribe
        }
      })
      .catch((cause: unknown) => console.error('Website visit listener failed', cause))
  })
  onCleanup(() => {
    disposed = true
    stop?.()
  })
}
