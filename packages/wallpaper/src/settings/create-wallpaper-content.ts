import type {WallpaperContent} from './model'

const DEFAULT_PHOTO_SECONDS = 10

/** Creates an empty content selection for the requested background mode. */
export const createWallpaperContent = (mode: WallpaperContent['mode']): WallpaperContent => {
  switch (mode) {
    case 'album':
      return {
        mediaIds: [],
        mode,
        order: 'sequential',
        photoSeconds: DEFAULT_PHOTO_SECONDS,
        transition: 'fade',
        videoMode: 'end',
      }
    case 'website':
      return {mode, url: null}
    case 'puppet':
      return {assetId: null, mode}
    default: {
      const unsupported: never = mode
      return unsupported
    }
  }
}
