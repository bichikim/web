import {isTauri} from '@tauri-apps/api/core'
import {type Accessor, createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {listen} from '@tauri-apps/api/event'
import {createWallpaperRuntime} from '@winter-love/wallpaper/runtime/create-wallpaper-runtime'
import type {MonitorWallpaper} from '@winter-love/wallpaper/settings/model'
import type {WallpaperMonitor} from '../settings/monitors'
import {desktopSurfaces} from './desktop'

interface UseWallpaperRuntimeProps {
  readonly monitors: Accessor<readonly WallpaperMonitor[]>
  readonly settings: Accessor<readonly MonitorWallpaper[]>
}

export const useWallpaperRuntime = (props: UseWallpaperRuntimeProps) => {
  const [error, setError] = createSignal<string | null>(null)
  const [ready, setReady] = createSignal(false)
  const runtime = isTauri() ? createWallpaperRuntime(desktopSurfaces) : null
  let disposed = false
  let unsubscribe: (() => void) | null = null
  onMount(() => {
    if (runtime === null) {
      return
    }
    listen<unknown>('wallpaper-error', (event) => {
      const {payload} = event
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload &&
        typeof payload.message === 'string'
      ) {
        setError(payload.message)
      }
    })
      .then((stop) => {
        if (disposed) {
          stop()
          return
        }
        unsubscribe = stop
        setReady(true)
      })
      .catch((cause: unknown) => {
        console.error('Wallpaper listener failed', cause)
        if (!disposed) {
          setError('배경을 시작하지 못했어요.')
        }
      })
  })
  createEffect(() => {
    if (!ready()) {
      return
    }
    const snapshot = {
      connectedIds: props.monitors().map((monitor) => monitor.id),
      settings: props.settings(),
    }
    runtime
      ?.synchronize(snapshot)
      .then(() => {
        if (!disposed) {
          setError(null)
        }
      })
      .catch((cause: unknown) => {
        console.error('Wallpaper surface synchronization failed', cause)
        if (!disposed) {
          setError('배경을 적용하지 못했어요.')
        }
      })
  })
  onCleanup(() => {
    disposed = true
    unsubscribe?.()
    runtime?.dispose().catch((cause: unknown) => console.error('Wallpaper cleanup failed', cause))
  })
  return {dismissError: () => setError(null), error}
}
