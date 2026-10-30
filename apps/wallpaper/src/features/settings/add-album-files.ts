import type {MediaImportRepository} from '@winter-love/wallpaper/model'
import type {SettingsRepository} from '@winter-love/wallpaper/settings/repository'
import {createMonitorWallpaper} from '@winter-love/wallpaper/settings/model'
import {addMediaFiles} from './add-media-files'

interface AddAlbumFilesOptions {
  /** Stores media and returns the ID of either new or identical existing content. */
  readonly media: MediaImportRepository
  /** Owns persisted monitor album selection; the caller owns closing it. */
  readonly settings: SettingsRepository
  /** Selects imported IDs in this monitor's album; null imports into the library only. */
  readonly monitorId: string | null
  /** Photos and videos to import in selection order. */
  readonly files: readonly File[]
}

/** Imports media and selects new or reused files in the target monitor's current album. */
export const addAlbumFiles = async (options: AddAlbumFilesOptions): Promise<void> => {
  const imported = await addMediaFiles(options.media, options.files)
  if (options.monitorId === null) {
    return
  }
  const current =
    (await options.settings.read()).find((entry) => entry.monitorId === options.monitorId) ??
    createMonitorWallpaper(options.monitorId)
  if (current.content.mode !== 'album') {
    return
  }
  await options.settings.save({
    ...current,
    content: {
      ...current.content,
      mediaIds: [...new Set([...current.content.mediaIds, ...imported])],
    },
  })
}
