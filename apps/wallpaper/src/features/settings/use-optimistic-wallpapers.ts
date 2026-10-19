import {batch, createMemo, createSignal, onCleanup} from 'solid-js'
import {
  createMonitorWallpaper,
  type MonitorWallpaper,
  monitorWallpaperSchema,
} from '@winter-love/wallpaper/settings/model'
import {applyWallpaperChange, type WallpaperChange} from './apply-wallpaper-change'

interface UseOptimisticWallpapersProps {
  readonly read: () => Promise<readonly MonitorWallpaper[]>
  readonly save: (wallpaper: MonitorWallpaper) => Promise<void>
  readonly enqueue: (operation: () => Promise<void>) => Promise<void>
}

/** Shows queued edits immediately and settles each against its persisted result. */
export const useOptimisticWallpapers = (props: UseOptimisticWallpapersProps) => {
  const [saved, setSaved] = createSignal<readonly MonitorWallpaper[]>([])
  const [changes, setChanges] = createSignal<readonly WallpaperChange[]>([])
  const wallpapers = createMemo(() => changes().reduce(applyWallpaperChange, saved()))
  let revision = 0
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const refresh = async () => {
    revision += 1
    const request = revision
    const stored = await props.read()
    if (!disposed && request === revision && changes().length === 0) {
      setSaved(stored)
    }
  }
  const settle = (change: WallpaperChange, next?: MonitorWallpaper) => {
    if (disposed) {
      return
    }
    revision += 1
    batch(() => {
      if (next !== undefined) {
        setSaved((stored) =>
          applyWallpaperChange(stored, {apply: () => next, monitorId: change.monitorId}),
        )
      }
      setChanges((pending) => pending.filter((entry) => entry !== change))
    })
  }
  const update = (change: WallpaperChange) => {
    if (disposed) {
      return Promise.resolve()
    }
    const previous = wallpapers().find((entry) => entry.monitorId === change.monitorId)
    const preview = monitorWallpaperSchema.safeParse(
      change.apply(previous ?? createMonitorWallpaper(change.monitorId)),
    )
    if (!preview.success) {
      return props.enqueue(async () => {
        throw preview.error
      })
    }
    revision += 1
    setChanges((pending) => [...pending, change])
    return props.enqueue(async () => {
      let committed: MonitorWallpaper | undefined
      try {
        const stored = await props.read()
        const previous = stored.find((entry) => entry.monitorId === change.monitorId)
        const next = change.apply(previous ?? createMonitorWallpaper(change.monitorId))
        await props.save(next)
        committed = next
      } finally {
        settle(change, committed)
      }
    })
  }
  return {refresh, update, wallpapers}
}
