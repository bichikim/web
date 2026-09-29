import {z} from 'zod'

import {
  CUSTOM_ALBUM_COVER_SOURCES,
  CUSTOM_ALBUM_ICONS,
  CustomAlbumError,
  isSupportedCustomAlbumCover,
} from './model'

const DATABASE_NAME = 'pomo-custom-albums'
const DATABASE_VERSION = 1

export const ALBUM_STORE_NAME = 'albums'
export const TRACK_STORE_NAME = 'tracks'

export const storedAlbumSchema = z.object({
  artist: z.string(),
  coverIcon: z.enum(CUSTOM_ALBUM_ICONS).default('disc'),
  coverImage: z
    .custom<Blob>(
      (value) =>
        typeof Blob !== 'undefined' && value instanceof Blob && isSupportedCustomAlbumCover(value),
    )
    .optional(),
  coverSource: z.enum(CUSTOM_ALBUM_COVER_SOURCES).optional(),
  createdAt: z.number(),
  id: z.string(),
  title: z.string(),
  trackIds: z.array(z.string()),
  updatedAt: z.number(),
})

export const storedTrackSchema = z.object({
  albumId: z.string(),
  artist: z.string(),
  audio: z.custom<Blob>((value) => typeof Blob !== 'undefined' && value instanceof Blob),
  durationSeconds: z.number().positive().finite(),
  fileName: z.string(),
  id: z.string(),
  title: z.string(),
})

export type StoredCustomAlbum = z.infer<typeof storedAlbumSchema>
export type StoredCustomTrack = z.infer<typeof storedTrackSchema>

let databasePromise: Promise<IDBDatabase> | null = null

const createDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof globalThis.indexedDB === 'undefined') {
      reject(new CustomAlbumError('database-unavailable'))
      return
    }

    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result

      database.createObjectStore(ALBUM_STORE_NAME, {keyPath: 'id'})
      const tracks = database.createObjectStore(TRACK_STORE_NAME, {keyPath: 'id'})
      tracks.createIndex('albumId', 'albumId', {unique: false})
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () =>
      reject(new CustomAlbumError('database-unavailable', {cause: request.error}))
  })

export const openCustomAlbumDatabase = (): Promise<IDBDatabase> => {
  if (databasePromise === null) {
    databasePromise = createDatabase().catch((error: unknown) => {
      databasePromise = null
      throw error
    })
  }

  return databasePromise
}

export const readRequest = <Value>(request: IDBRequest<Value>): Promise<Value> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })

export const waitForTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'))
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
  })

export const parseStoredAlbums = (value: unknown): readonly StoredCustomAlbum[] => {
  const result = z.array(storedAlbumSchema).safeParse(value)

  if (!result.success) {
    throw new CustomAlbumError('corrupt-data', {cause: result.error})
  }

  return result.data
}

export const parseStoredTracks = (value: unknown): readonly StoredCustomTrack[] => {
  const result = z.array(storedTrackSchema).safeParse(value)

  if (!result.success) {
    throw new CustomAlbumError('corrupt-data', {cause: result.error})
  }

  return result.data
}
