import {
  createWebRepository,
  type WebBackgroundRepository,
} from '@winter-love/wallpaper/web-repository'
import type {BackgroundMedia} from '@winter-love/wallpaper/model'
import catalog from '../../../builtin-assets.json'

const media: readonly BackgroundMedia[] = catalog.media.map(({id, name, size, kind}) => ({
  id,
  kind: kind === 'video' ? 'video' : 'photo',
  name,
  size,
}))

/** Opens imported media with the read-only bundled wallpaper collection; the caller owns closing it. */
export const createBuiltinMedia = (databaseName: string): WebBackgroundRepository => {
  const repository = createWebRepository({databaseName})
  return {
    ...repository,
    async load(id) {
      const asset = catalog.media.find((item) => item.id === id)
      if (asset === undefined) {
        return repository.load(id)
      }
      const response = await fetch(`/builtin/${asset.file}`)
      if (!response.ok) {
        throw new Error(`Bundled wallpaper could not be loaded: ${response.status}`)
      }
      return response.blob()
    },
    async read() {
      const snapshot = await repository.read()
      return {...snapshot, items: [...media, ...snapshot.items]}
    },
  }
}
