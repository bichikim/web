import Dexie, {type Table} from 'dexie'
import type {DictationPreferences} from './types'

export const DEFAULT_DICTATION_PREFERENCES: DictationPreferences = {
  model: 'buzzasr-korean-q8',
  vad: true,
}
interface PreferencesDatabase extends Dexie {
  readonly preferences: Table<DictationPreferences, string>
}

const normalize = (value: DictationPreferences | undefined): DictationPreferences => ({
  model: DEFAULT_DICTATION_PREFERENCES.model,
  vad: typeof value?.vad === 'boolean' ? value.vad : true,
})

/** Opens shared input settings in IndexedDB; callers own closing the connection. */
export const createDictationPreferences = (databaseName = 'wallpaper-dictation') => {
  const database = new Dexie(databaseName) as PreferencesDatabase
  database.version(1).stores({preferences: ''})
  database
    .version(2)
    .stores({preferences: ''})
    .upgrade(async (transaction) => {
      const preferences = transaction.table<DictationPreferences, string>('preferences')
      const value = await preferences.get('input')
      if (value !== undefined) {
        await preferences.put(normalize(value), 'input')
      }
    })
  const read = async (): Promise<DictationPreferences> =>
    normalize(await database.preferences.get('input'))
  return {
    close: () => database.close(),
    read,
    save: (patch: Partial<DictationPreferences>): Promise<DictationPreferences> =>
      database.transaction('rw', database.preferences, async () => {
        const value = normalize({...(await read()), ...patch})
        await database.preferences.put(value, 'input')
        return value
      }),
  }
}
