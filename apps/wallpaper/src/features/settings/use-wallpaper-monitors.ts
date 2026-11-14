import {batch, createEffect, createSignal, onCleanup} from 'solid-js'
import {listWallpaperMonitors, subscribeWallpaperMonitors, type WallpaperMonitor} from './monitors'

export interface WallpaperMonitors {
  readonly monitors: () => readonly WallpaperMonitor[]
  readonly selectedId: () => string | null
  readonly error: () => string | null
  readonly dismissError: () => void
  readonly selectMonitor: (id: string) => void
}

export const useWallpaperMonitors = (): WallpaperMonitors => {
  const [monitors, setMonitors] = createSignal<readonly WallpaperMonitor[]>([])
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [readError, setReadError] = createSignal<string | null>(null)
  const [subscriptionError, setSubscriptionError] = createSignal<string | null>(null)
  createEffect(() => {
    let disposed = false
    let revision = 0
    let unsubscribe: (() => void) | null = null
    const refresh = async () => {
      revision += 1
      const request = revision
      try {
        const available = await listWallpaperMonitors()
        if (!disposed && request === revision) {
          const current = selectedId()
          const selected = available.some((monitor) => monitor.id === current)
            ? current
            : (available[0]?.id ?? null)
          batch(() => {
            setMonitors(available)
            setSelectedId(selected)
            setReadError(null)
          })
        }
      } catch (cause) {
        if (!disposed && request === revision) {
          console.error('Wallpaper monitors unavailable', cause)
          setReadError('화면 목록을 불러오지 못했어요.')
        }
      }
    }
    const report = (cause: unknown) => {
      if (!disposed) {
        console.error('Wallpaper monitors unavailable', cause)
        setSubscriptionError('화면 목록을 불러오지 못했어요.')
      }
    }
    subscribeWallpaperMonitors(() => {
      refresh()
    })
      .then((stop) => {
        if (disposed) {
          stop()
          return
        }
        unsubscribe = stop
      })
      .catch(report)
      .finally(() => {
        if (!disposed) {
          refresh()
        }
      })
    onCleanup(() => {
      disposed = true
      unsubscribe?.()
    })
  })
  return {
    dismissError: () => {
      setReadError(null)
      setSubscriptionError(null)
    },
    error: () => subscriptionError() ?? readError(),
    monitors,
    selectedId,
    selectMonitor: (id) => {
      setSelectedId(id)
    },
  }
}
