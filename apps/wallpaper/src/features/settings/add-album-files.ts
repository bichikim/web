import type {BackgroundRepository} from '@winter-love/wallpaper/model'
import type {SettingsRepository} from '@winter-love/wallpaper/settings/repository'
import {createMonitorWallpaper} from '@winter-love/wallpaper/settings/model'
import {addMediaFiles} from './add-media-files'

interface AddAlbumFilesOptions {
  readonly media: BackgroundRepository
  readonly settings: SettingsRepository
  readonly monitorId: string | null
  readonly files: readonly File[]
}

/** Imports media and selects newly stored files in the target monitor's current album. */
export const addAlbumFiles = async (options: AddAlbumFilesOptions): Promise<void> => {
  const before = await options.media.read()
  await addMediaFiles(options.media, options.files)
  if (options.monitorId === null) {
    return
  }
  const after = await options.media.read()
  const current =
    (await options.settings.read()).find((entry) => entry.monitorId === options.monitorId) ??
    createMonitorWallpaper(options.monitorId)
  if (current.content.mode !== 'album') {
    return
  }
  const additions = after.items
    .filter((item) => !before.items.some((previous) => previous.id === item.id))
    .map((item) => item.id)
  await options.settings.save({
    ...current,
    content: {...current.content, mediaIds: [...current.content.mediaIds, ...additions]},
  })
}
