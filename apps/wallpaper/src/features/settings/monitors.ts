import {invoke, isTauri} from '@tauri-apps/api/core'

export interface WallpaperMonitor {
  readonly id: string
  readonly name: string
  readonly x?: number
  readonly y?: number
  readonly scale?: number
  readonly width?: number
  readonly height?: number
}

/** Lists current display identities; identical display names are distinguished by their position. */
export const listWallpaperMonitors = async (): Promise<readonly WallpaperMonitor[]> => {
  if (!isTauri()) {
    return [{id: 'browser-preview', name: '미리보기 화면'}]
  }
  return invoke<readonly WallpaperMonitor[]>('list_wallpaper_monitors')
}
