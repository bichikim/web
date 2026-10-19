import {createMonitorWallpaper, type MonitorWallpaper} from '@winter-love/wallpaper/settings/model'

export interface WallpaperChange {
  readonly monitorId: string
  readonly apply: (previous: MonitorWallpaper) => MonitorWallpaper
}

/** Applies a change to one monitor, creating its settings when absent. */
export const applyWallpaperChange = (
  wallpapers: readonly MonitorWallpaper[],
  change: WallpaperChange,
): readonly MonitorWallpaper[] => {
  const previous = wallpapers.find((entry) => entry.monitorId === change.monitorId)
  const next = change.apply(previous ?? createMonitorWallpaper(change.monitorId))
  return previous === undefined
    ? [...wallpapers, next]
    : wallpapers.map((entry) => (entry.monitorId === change.monitorId ? next : entry))
}
