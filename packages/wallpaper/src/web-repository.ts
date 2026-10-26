import {findMedia, hashMedia} from './media/content'
import Dexie, {liveQuery, type Table} from 'dexie'
import {
  type BackgroundMedia,
  type BackgroundPreferences,
  backgroundPreferencesSchema,
  DEFAULT_BACKGROUND,
  type MediaImportRepository,
} from './model'

interface StoredMedia extends BackgroundMedia {
  readonly blob: Blob
  readonly position?: number
}
interface WebDatabase extends Dexie {
  readonly media: Table<StoredMedia, number>
  readonly preferences: Table<BackgroundPreferences, string>
}

export interface CreateWebRepositoryOptions {
  readonly databaseName: string
  readonly initialPreferences?: BackgroundPreferences
  readonly onVideoAdded?: (id: string, file: File) => void
  readonly onMediaRemoved?: (id: string) => Promise<void>
}
export interface WebBackgroundRepository extends MediaImportRepository {
  readonly close: () => void
}

/** Stores media and preferences transactionally; the caller owns closing the repository. */
export const createWebRepository = (
  options: CreateWebRepositoryOptions,
): WebBackgroundRepository => {
  const database = new Dexie(options.databaseName) as WebDatabase
  database.version(1).stores({media: '++position, &id', preferences: ''})
  const read = async () =>
    database.transaction('r', database.media, database.preferences, async () => ({
      items: (await database.media.orderBy('position').toArray()).map(({id, name, kind, size}) => ({
        id,
        kind,
        name,
        size,
      })),
      preferences: backgroundPreferencesSchema.parse(
        (await database.preferences.get('current')) ??
          options.initialPreferences ??
          DEFAULT_BACKGROUND,
      ),
    }))
  const importMedia: MediaImportRepository['importMedia'] = async (file, kind) => {
    const contentHash = await hashMedia(file)
    const id = crypto.randomUUID()
    const stored = await database.transaction('rw', database.media, async () => {
      const items = await database.media.toArray()
      const duplicate = await Dexie.waitFor(
        findMedia({
          hash: contentHash,
          items,
          load: async (existingId) => items.find((item) => item.id === existingId)!.blob,
          size: file.size,
        }),
      )
      if (duplicate !== undefined) {
        return {added: false, id: duplicate.id}
      }
      await database.media.add({
        blob: file,
        contentHash,
        id,
        kind,
        name: file.name,
        size: file.size,
      })
      return {added: true, id}
    })
    if (stored.added && kind === 'video') {
      options.onVideoAdded?.(id, file)
    }
    return stored.id
  }
  return {
    async add(file, kind) {
      await importMedia(file, kind)
    },
    close: () => database.close(),
    async configure(patch) {
      await database.transaction('rw', database.preferences, async () => {
        const current =
          (await database.preferences.get('current')) ??
          options.initialPreferences ??
          DEFAULT_BACKGROUND
        await database.preferences.put(
          backgroundPreferencesSchema.parse({...current, ...patch}),
          'current',
        )
      })
    },
    importMedia,
    async load(id) {
      const item = await database.media.where('id').equals(id).first()
      if (item === undefined) {
        throw new Error('Background media is missing.')
      }
      return item.blob
    },
    read,
    async remove(id) {
      await database.media.where('id').equals(id).delete()
      await options.onMediaRemoved?.(id)
    },
    subscribe(refresh, onError) {
      const subscription = liveQuery(read).subscribe({error: onError, next: refresh})
      return () => subscription.unsubscribe()
    },
  }
}
