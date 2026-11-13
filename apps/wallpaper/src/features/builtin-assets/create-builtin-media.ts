import Dexie, {liveQuery, type Table} from 'dexie'
import {
  createWebRepository,
  type WebBackgroundRepository,
} from '@winter-love/wallpaper/web-repository'
import type {BackgroundMedia, BackgroundSnapshot} from '@winter-love/wallpaper/model'
import catalog from '../../../builtin-assets.json'

interface HiddenMedia {
  readonly id: string
}
interface VisibilityDatabase extends Dexie {
  readonly hidden: Table<HiddenMedia, string>
}
export interface BuiltinMediaSnapshot extends BackgroundSnapshot {
  readonly hiddenCount: number
}
export interface BuiltinMediaRepository extends WebBackgroundRepository {
  readonly read: () => Promise<BuiltinMediaSnapshot>
  readonly restoreBuiltins: () => Promise<void>
}

export const isBuiltinMedia = (id: string): boolean => catalog.media.some((item) => item.id === id)

const media: readonly BackgroundMedia[] = catalog.media.map(({id, name, size, kind}) => ({
  id,
  kind: kind === 'video' ? 'video' : 'photo',
  name,
  size,
}))

/** Opens imported media and bundled wallpapers with persistent visibility; the caller owns closing it. */
export const createBuiltinMedia = (databaseName: string): BuiltinMediaRepository => {
  const repository = createWebRepository({databaseName})
  const visibility = new Dexie(`${databaseName}-builtin`) as VisibilityDatabase
  visibility.version(1).stores({hidden: '&id'})
  return {
    ...repository,
    close() {
      repository.close()
      visibility.close()
    },
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
      const [snapshot, hidden] = await Promise.all([repository.read(), visibility.hidden.toArray()])
      const ids = new Set(hidden.map((item) => item.id))
      return {
        ...snapshot,
        hiddenCount: media.filter((item) => ids.has(item.id)).length,
        items: [...media.filter((item) => !ids.has(item.id)), ...snapshot.items],
      }
    },
    async remove(id) {
      if (isBuiltinMedia(id)) {
        await visibility.hidden.put({id})
      } else {
        await repository.remove(id)
      }
    },
    restoreBuiltins: () => visibility.hidden.clear(),
    subscribe(refresh, onError) {
      const stop = repository.subscribe(refresh, onError)
      const subscription = liveQuery(() => visibility.hidden.toArray()).subscribe({
        error: onError,
        next: refresh,
      })
      return () => {
        stop()
        subscription.unsubscribe()
      }
    },
  }
}
