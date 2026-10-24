import {invoke} from '@tauri-apps/api/core'
import {
  navigateBackgroundSurface,
  restoreBackgroundContent,
  restoreSurface,
  setBackgroundInteraction,
  setBackgroundSurface,
} from '@winter-love/desktop-surface'
import type {WallpaperSurfacePort} from '@winter-love/wallpaper/runtime/create-wallpaper-runtime'

export const desktopSurfaces: WallpaperSurfacePort = {
  async close(monitorId, label) {
    await restoreSurface({label})
    await invoke('close_background', {monitorId})
  },
  navigate: (label, url) => navigateBackgroundSurface({label, url}),
  async open(monitorId) {
    return (
      (await invoke<string | null>('find_background', {monitorId})) ??
      invoke<string>('open_background', {monitorId})
    )
  },
  restore: (label) => restoreBackgroundContent({label}),
  setInteraction: (label, interaction) => setBackgroundInteraction({interaction, label}),
  setSurface: (label, interaction) => setBackgroundSurface({interaction, label}),
}
