import type {SettingsRepository} from '@winter-love/wallpaper/settings/repository'
import {createMonitorWallpaper} from '@winter-love/wallpaper/settings/model'
import {readPuppetFile} from './read-puppet-file'

interface AddPuppetFileOptions {
  readonly file: File
  readonly monitorId: string | null
  readonly settings: SettingsRepository
}

/** Imports a validated Puppet source and selects it for the target monitor. */
export const addPuppetFile = async (options: AddPuppetFileOptions): Promise<void> => {
  const source = await readPuppetFile(options.file)
  const asset = await options.settings.addPuppet(options.file.name, source)
  if (options.monitorId === null) {
    return
  }
  const previous =
    (await options.settings.read()).find((entry) => entry.monitorId === options.monitorId) ??
    createMonitorWallpaper(options.monitorId)
  await options.settings.save({...previous, content: {assetId: asset.id, mode: 'puppet'}})
}
