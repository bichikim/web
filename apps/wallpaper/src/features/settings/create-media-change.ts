import type {MonitorWallpaper, WallpaperContent} from '@winter-love/wallpaper/settings/model'

interface CreateMediaChangeOptions {
  readonly content: WallpaperContent | undefined
  readonly id: string
}

/** Captures the next inclusion state so queued writes preserve the last checkbox intent. */
export const createMediaChange = (options: CreateMediaChangeOptions) => {
  const {content, id} = options
  const selected = content?.mode === 'album' && content.mediaIds.includes(id)
  return (previous: MonitorWallpaper): MonitorWallpaper => {
    if (previous.content.mode !== 'album') {
      return previous
    }
    const ids = previous.content.mediaIds
    return {
      ...previous,
      content: {
        ...previous.content,
        mediaIds: selected ? ids.filter((entry) => entry !== id) : [...new Set([...ids, id])],
      },
    }
  }
}
