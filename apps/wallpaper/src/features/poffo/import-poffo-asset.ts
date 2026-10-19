import {createSettingsRepository} from '@winter-love/wallpaper/settings/repository'
import {readPuppetFile} from '../settings/read-puppet-file'

/** Imports a shared Poffo asset without changing any monitor background. */
export const importPoffoAsset = async (file: File) => {
  const source = await readPuppetFile(file)
  const repository = createSettingsRepository('wallpaper-settings')
  try {
    return await repository.addPuppet(file.name, source)
  } finally {
    repository.close()
  }
}
