import Dexie, {type Table} from 'dexie'

import {
  parsePictureDiaryEntries,
  parsePictureDiaryEntry,
  type PictureDiaryEntry,
  sortPictureDiaryEntries,
} from './schema'

const DATABASE_NAME = 'pomo-picture-diary'

interface PictureDiaryDatabase extends Dexie {
  readonly entries: Table<PictureDiaryEntry, string>
}

export interface PictureDiaryStorage {
  readonly delete: (id: string) => Promise<void>
  readonly readAll: () => Promise<unknown>
  readonly write: (entry: PictureDiaryEntry) => Promise<void>
}

export interface PictureDiaryRepository {
  readonly delete: (id: string) => Promise<void>
  readonly list: () => Promise<ReadonlyArray<PictureDiaryEntry>>
  readonly save: (entry: PictureDiaryEntry) => Promise<void>
}

let database: PictureDiaryDatabase | null = null

const getDatabase = (): PictureDiaryDatabase => {
  if (database === null) {
    database = new Dexie(DATABASE_NAME) as PictureDiaryDatabase
    database.version(1).stores({entries: 'id, date, updatedAt'})
  }

  return database
}

const browserStorage = {
  delete: (id) => getDatabase().entries.delete(id),
  readAll: () => getDatabase().entries.toArray(),
  write: async (entry) => {
    await getDatabase().entries.put(entry)
  },
} satisfies PictureDiaryStorage

/** Owns local picture-diary persistence behind a replaceable synchronization boundary. */
export const createPictureDiaryRepository = (
  storage: PictureDiaryStorage = browserStorage,
): PictureDiaryRepository => ({
  async delete(id) {
    try {
      await storage.delete(id)
    } catch (error: unknown) {
      throw new Error('Failed to delete a picture diary entry.', {cause: error})
    }
  },
  async list() {
    try {
      const entries = parsePictureDiaryEntries(await storage.readAll())

      if (entries === null) {
        throw new TypeError('Invalid picture diary snapshot.')
      }

      return sortPictureDiaryEntries(entries)
    } catch (error: unknown) {
      throw new Error('Failed to read picture diary entries.', {cause: error})
    }
  },
  async save(entry) {
    const parsedEntry = parsePictureDiaryEntry(entry)

    if (parsedEntry === null) {
      throw new TypeError('Invalid picture diary entry.')
    }

    try {
      await storage.write(parsedEntry)
    } catch (error: unknown) {
      throw new Error('Failed to save a picture diary entry.', {cause: error})
    }
  },
})
