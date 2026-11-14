import {
  createSettingsRepository,
  type SettingsRepository,
} from '@winter-love/wallpaper/settings/repository'
import catalog from '../../../builtin-assets.json'

export interface BuiltinSettingsRepository extends Omit<SettingsRepository, 'loadPuppet'> {
  readonly loadPuppet: (id: string) => Promise<string | Blob>
}

/** Opens imported assets with the read-only bundled Poffo collection; the caller owns closing it. */
export const createBuiltinSettings = (databaseName: string): BuiltinSettingsRepository => {
  const repository = createSettingsRepository(databaseName)
  return {
    ...repository,
    async listPuppets() {
      return [
        ...catalog.puppets.map(({id, name}) => ({id, name})),
        ...(await repository.listPuppets()),
      ]
    },
    async loadPuppet(id) {
      const asset = catalog.puppets.find((item) => item.id === id)
      if (asset === undefined) {
        return repository.loadPuppet(id)
      }
      const response = await fetch(`/builtin/${asset.file}`)
      if (!response.ok) {
        throw new Error(`Bundled Poffo could not be loaded: ${response.status}`)
      }
      return response.blob()
    },
  }
}
