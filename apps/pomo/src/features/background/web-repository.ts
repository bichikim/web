import {containsMedia, hashMedia} from './content'
import {prepareVideoBackground, removeVideoBackground} from '../video-background'
import Dexie, {liveQuery, type Table} from 'dexie'
import {
  type BackgroundMedia,
  type BackgroundPreferences,
  backgroundPreferencesSchema,
  type BackgroundRepository,
  DEFAULT_BACKGROUND,
} from './model'

interface StoredMedia extends BackgroundMedia {
  readonly blob: Blob
  readonly position?: number
}
interface WebDatabase extends Dexie {
  readonly media: Table<StoredMedia, number>
  readonly preferences: Table<BackgroundPreferences, string>
}

/** Stores media and preferences transactionally in the browser origin. */
export const createWebRepository = (): BackgroundRepository => {
  const database = new Dexie('pomo-background') as WebDatabase
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
        (await database.preferences.get('current')) ?? DEFAULT_BACKGROUND,
      ),
    }))
  return {
    async add(file, kind) {
      const contentHash = await hashMedia(file)
      const id = crypto.randomUUID()
      const added = await database.transaction('rw', database.media, async () => {
        const items = await database.media.toArray()
        const duplicate = await Dexie.waitFor(
          containsMedia({
            hash: contentHash,
            items,
            load: async (existingId) => items.find((item) => item.id === existingId)!.blob,
            size: file.size,
          }),
        )
        if (duplicate) {
          return false
        }
        await database.media.add({
          blob: file,
          contentHash,
          id,
          kind,
          name: file.name,
          size: file.size,
        })
        return true
      })
      if (added && kind === 'video') {
        prepareVideoBackground(id, file)
      }
    },
    async configure(patch) {
      await database.transaction('rw', database.preferences, async () => {
        const current = (await database.preferences.get('current')) ?? DEFAULT_BACKGROUND
        await database.preferences.put(
          backgroundPreferencesSchema.parse({...current, ...patch}),
          'current',
        )
      })
    },
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
      await removeVideoBackground(id)
    },
    subscribe(refresh, onError) {
      const subscription = liveQuery(read).subscribe({error: onError, next: refresh})
      return () => subscription.unsubscribe()
    },
  }
}
