import Dexie, {type Table} from 'dexie'
import {z} from 'zod'

import type {AlbumDraftData} from './album-draft'

interface AlbumCoverRecord {
  readonly blob: Blob
  readonly id: string
  readonly updatedAt: number
}

export interface AlbumDraftReference {
  readonly coverDraftId: string | null
  readonly id: string
  readonly lastSeenAt: number
}

interface AlbumDraftDatabase extends Dexie {
  readonly covers: Table<AlbumCoverRecord, string>
  readonly draftReferences: Table<AlbumDraftReference, string>
}

export interface AlbumDraftStorage {
  readonly deleteCover: (options: DeleteCoverOptions) => Promise<void>
  readonly deleteData: () => void
  readonly deleteDraftReference: (id: string) => Promise<void>
  readonly deleteExpiredCovers: (options: DeleteExpiredCoversOptions) => Promise<void>
  readonly readCover: (id: string) => Promise<Blob | null>
  readonly readData: () => string | null
  readonly writeDraftReference: (reference: AlbumDraftReference) => Promise<void>
  readonly writeCover: (id: string, blob: Blob) => Promise<void>
  readonly writeData: (data: string) => void
}

export interface DeleteCoverOptions {
  readonly expiresBefore: number
  readonly id: string
}

export interface DeleteAlbumDraftOptions {
  readonly now?: () => number
  readonly storage?: AlbumDraftStorage
}

export interface DeleteExpiredCoversOptions {
  readonly expiresBefore: number
  readonly protectedId: string | null
}

export interface DeleteExpiredAlbumDraftCoversOptions {
  readonly activeCoverDraftId: string | null
  readonly now?: () => number
  readonly storage?: AlbumDraftStorage
}

export interface WriteAlbumDraftReferenceOptions {
  readonly coverDraftId: string | null
  readonly now?: () => number
  readonly referenceId: string
  readonly storage?: AlbumDraftStorage
}

const ALBUM_DRAFT_KEY = 'pomo:admin-music:album-draft:v1'
const LEGACY_REFERENCE_PREFIX = 'pomo:admin-music:album-draft-session:v1:'
const legacyReferenceSchema = z.object({
  coverDraftId: z.string().min(1).nullable(),
  lastSeenAt: z.number().finite(),
})
const DATABASE_NAME = 'pomo-admin-music-draft'
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MILLISECONDS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
const COVER_RETENTION_DAYS = 30
const COVER_RETENTION_MILLISECONDS = COVER_RETENTION_DAYS * MILLISECONDS_PER_DAY
const DATABASE_VERSION_WITH_REFERENCES = 3
const translationSchema = z.object({description: z.string(), title: z.string()})
const albumDraftSchema = z.object({
  albumId: z.string().uuid().optional(),
  coverDraftId: z.string().min(1).nullable().optional().default(null),
  coverFallback: z.enum(['lp', 'cd', 'music']),
  coverImageUrl: z.string(),
  hasCoverFile: z.boolean(),
  translations: z.object({
    en: translationSchema,
    ja: translationSchema,
    ko: translationSchema,
    'zh-Hans': translationSchema,
  }),
})

let database: AlbumDraftDatabase | null = null

const getDatabase = (): AlbumDraftDatabase => {
  if (database === null) {
    database = new Dexie(DATABASE_NAME) as AlbumDraftDatabase
    database.version(1).stores({covers: 'id'})
    database
      .version(2)
      .stores({covers: 'id, updatedAt'})
      .upgrade((transaction) =>
        transaction
          .table<AlbumCoverRecord>('covers')
          .toCollection()
          .modify({updatedAt: Date.now()}),
      )
    database.version(DATABASE_VERSION_WITH_REFERENCES).stores({
      covers: 'id, updatedAt',
      draftReferences: 'id, coverDraftId, lastSeenAt',
    })
  }

  return database
}

const refreshDraftCoverTimestamp = (data: string): void => {
  let parsedData: unknown

  try {
    parsedData = JSON.parse(data)
  } catch {
    return
  }

  const parsedDraft = albumDraftSchema.safeParse(parsedData)

  if (!parsedDraft.success || parsedDraft.data.coverDraftId === null) {
    return
  }

  getDatabase()
    .covers.update(parsedDraft.data.coverDraftId, {updatedAt: Date.now()})
    .catch((error: unknown) => {
      console.warn('Failed to refresh the admin album cover draft.', error)
    })
}

const readLegacyReferences = (expiresBefore: number): string[] => {
  const coverIds: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key !== null && key.startsWith(LEGACY_REFERENCE_PREFIX)) {
      const value = localStorage.getItem(key)
      if (value !== null) {
        let data: unknown
        try {
          data = JSON.parse(value)
        } catch {
          data = null
        }
        const reference = legacyReferenceSchema.safeParse(data)
        if (
          reference.success &&
          reference.data.lastSeenAt >= expiresBefore &&
          reference.data.coverDraftId !== null
        ) {
          coverIds.push(reference.data.coverDraftId)
        }
      }
    }
  }
  return coverIds
}

const BROWSER_STORAGE: AlbumDraftStorage = {
  deleteCover: async ({id, expiresBefore}) => {
    const database = getDatabase()
    await database.transaction('rw', database.covers, database.draftReferences, async () => {
      const activeReferences = await database.draftReferences
        .where('lastSeenAt')
        .aboveOrEqual(expiresBefore)
        .toArray()
      if (
        activeReferences.some((reference) => reference.coverDraftId === id) ||
        readLegacyReferences(expiresBefore).includes(id)
      ) {
        return
      }
      await database.covers.delete(id)
    })
  },
  deleteData: () => sessionStorage.removeItem(ALBUM_DRAFT_KEY),
  deleteDraftReference: (id) => getDatabase().draftReferences.delete(id),
  deleteExpiredCovers: async ({expiresBefore, protectedId}) => {
    const database = getDatabase()
    await database.transaction('rw', database.covers, database.draftReferences, async () => {
      const activeReferences = await database.draftReferences
        .where('lastSeenAt')
        .aboveOrEqual(expiresBefore)
        .toArray()
      const protectedIds = new Set(
        activeReferences.flatMap((reference) =>
          reference.coverDraftId === null ? [] : [reference.coverDraftId],
        ),
      )

      if (protectedId !== null) {
        protectedIds.add(protectedId)
      }

      for (const id of readLegacyReferences(expiresBefore)) {
        protectedIds.add(id)
      }

      const expiredIds = await database.covers.where('updatedAt').below(expiresBefore).primaryKeys()
      const deletableIds = expiredIds.filter((id) => !protectedIds.has(id))
      await database.covers.bulkDelete(deletableIds)
      await database.draftReferences.where('lastSeenAt').below(expiresBefore).delete()
    })
  },
  readCover: async (id) => (await getDatabase().covers.get(id))?.blob ?? null,
  readData: () => sessionStorage.getItem(ALBUM_DRAFT_KEY),
  writeCover: async (id, blob) => {
    await getDatabase().covers.put({blob, id, updatedAt: Date.now()})
  },
  writeData: (data) => {
    sessionStorage.setItem(ALBUM_DRAFT_KEY, data)
    refreshDraftCoverTimestamp(data)
  },
  writeDraftReference: async (reference) => {
    const database = getDatabase()
    await database.transaction('rw', database.covers, database.draftReferences, async () => {
      await database.draftReferences.put(reference)
      if (reference.coverDraftId !== null) {
        await database.covers.update(reference.coverDraftId, {updatedAt: reference.lastSeenAt})
      }
    })
  },
}

export type AlbumDraftStorageResult =
  | {readonly success: true}
  | {readonly error: unknown; readonly success: false}

export type AlbumDraftReadResult<T> =
  | {readonly data: T; readonly success: true}
  | {readonly error: unknown; readonly success: false}

const storageSuccess = (): AlbumDraftStorageResult => ({success: true})
const storageFailure = (error: unknown): AlbumDraftStorageResult => ({error, success: false})

const hasDifferentCoverDraftId = (data: string | null, coverDraftId: string): boolean => {
  if (data === null) {
    return false
  }

  let parsedData: unknown

  try {
    parsedData = JSON.parse(data)
  } catch {
    return false
  }

  const parsedDraft = albumDraftSchema.safeParse(parsedData)
  return parsedDraft.success && parsedDraft.data.coverDraftId !== coverDraftId
}

export const writeAlbumDraftReference = async (
  options: WriteAlbumDraftReferenceOptions,
): Promise<AlbumDraftStorageResult> => {
  const now = options.now ?? Date.now
  const storage = options.storage ?? BROWSER_STORAGE

  try {
    await storage.writeDraftReference({
      coverDraftId: options.coverDraftId,
      id: options.referenceId,
      lastSeenAt: now(),
    })
    return storageSuccess()
  } catch (error: unknown) {
    console.warn('Failed to update the admin album draft reference.', error)
    return storageFailure(error)
  }
}

export const deleteAlbumDraftReference = async (
  referenceId: string,
  storage: AlbumDraftStorage = BROWSER_STORAGE,
): Promise<AlbumDraftStorageResult> => {
  try {
    await storage.deleteDraftReference(referenceId)
    return storageSuccess()
  } catch (error: unknown) {
    console.warn('Failed to delete the admin album draft reference.', error)
    return storageFailure(error)
  }
}

/** Deletes unreferenced browser-local cover drafts after the retention period. */
export const deleteExpiredAlbumDraftCovers = async (
  options: DeleteExpiredAlbumDraftCoversOptions,
): Promise<AlbumDraftStorageResult> => {
  const now = options.now ?? Date.now
  const storage = options.storage ?? BROWSER_STORAGE

  try {
    await storage.deleteExpiredCovers({
      expiresBefore: now() - COVER_RETENTION_MILLISECONDS,
      protectedId: options.activeCoverDraftId,
    })
    return storageSuccess()
  } catch (error: unknown) {
    console.warn('Failed to delete expired admin album cover drafts.', error)
    return storageFailure(error)
  }
}

export const readAlbumDraftData = (
  storage: AlbumDraftStorage = BROWSER_STORAGE,
): AlbumDraftReadResult<AlbumDraftData | null> => {
  try {
    const storedDraft = storage.readData()
    return {
      data: storedDraft === null ? null : albumDraftSchema.parse(JSON.parse(storedDraft)),
      success: true,
    }
  } catch (error: unknown) {
    console.warn('Failed to read the admin album draft.', error)
    return {error, success: false}
  }
}

/** Returns null when the browser draft cannot be read. */
export const readAlbumDraftDataOrNull = (
  storage: AlbumDraftStorage = BROWSER_STORAGE,
): AlbumDraftData | null => {
  const result = readAlbumDraftData(storage)
  return result.success ? result.data : null
}

export const readAlbumDraftCover = async (
  id: string,
  storage: AlbumDraftStorage = BROWSER_STORAGE,
): Promise<AlbumDraftReadResult<File | null>> => {
  try {
    const blob = await storage.readCover(id)
    return {
      data: blob === null ? null : new File([blob], 'cover.webp', {type: blob.type}),
      success: true,
    }
  } catch (error: unknown) {
    console.warn('Failed to read the admin album cover draft.', error)
    return {error, success: false}
  }
}

/** Returns null when the browser cover cannot be read. */
export const readAlbumDraftCoverOrNull = async (
  id: string,
  storage: AlbumDraftStorage = BROWSER_STORAGE,
): Promise<File | null> => {
  const result = await readAlbumDraftCover(id, storage)
  return result.success ? result.data : null
}

export const writeAlbumDraftData = (
  data: AlbumDraftData,
  storage: AlbumDraftStorage = BROWSER_STORAGE,
): AlbumDraftStorageResult => {
  try {
    storage.writeData(JSON.stringify(data))
    return storageSuccess()
  } catch (error: unknown) {
    console.warn('Failed to save the admin album draft.', error)
    return storageFailure(error)
  }
}

export const writeAlbumDraftCover = async (
  id: string,
  file: File,
  storage: AlbumDraftStorage = BROWSER_STORAGE,
): Promise<AlbumDraftStorageResult> => {
  try {
    await storage.writeCover(id, file)
    return storageSuccess()
  } catch (error: unknown) {
    console.warn('Failed to save the admin album cover draft.', error)
    return storageFailure(error)
  }
}

export const deleteAlbumDraftCover = async (
  id: string,
  options: DeleteAlbumDraftOptions = {},
): Promise<AlbumDraftStorageResult> => {
  const storage = options.storage ?? BROWSER_STORAGE
  const now = options.now ?? Date.now
  try {
    await storage.deleteCover({expiresBefore: now() - COVER_RETENTION_MILLISECONDS, id})
    return storageSuccess()
  } catch (error: unknown) {
    console.warn('Failed to delete the admin album cover draft.', error)
    return storageFailure(error)
  }
}

const draftDataRetainsCover = (draftData: string | null, coverDraftId: string): boolean => {
  if (draftData === null) {
    return false
  }

  try {
    return albumDraftSchema.parse(JSON.parse(draftData)).coverDraftId === coverDraftId
  } catch {
    return false
  }
}

const clearMissingCoverReference = (coverDraftId: string, storage: AlbumDraftStorage): void => {
  const draftResult = readAlbumDraftData(storage)

  if (
    !draftResult.success ||
    draftResult.data === null ||
    draftResult.data.coverDraftId !== coverDraftId
  ) {
    return
  }

  const normalizedDraft = {...draftResult.data, coverDraftId: null, hasCoverFile: false}
  const writeResult = writeAlbumDraftData(normalizedDraft, storage)

  if (!writeResult.success) {
    console.warn('Failed to clear the missing admin album cover from the draft.', writeResult.error)
  }
}

const restoreCoverIfDraftRetainsIt = async (
  draftData: string | null,
  coverDraftId: string,
  cover: Blob | null,
  storage: AlbumDraftStorage,
): Promise<AlbumDraftStorageResult> => {
  if (cover === null || !draftDataRetainsCover(draftData, coverDraftId)) {
    return storageSuccess()
  }

  try {
    if ((await storage.readCover(coverDraftId)) !== null) {
      return storageSuccess()
    }

    await storage.writeCover(coverDraftId, cover)
    return storageSuccess()
  } catch (error: unknown) {
    clearMissingCoverReference(coverDraftId, storage)
    console.warn('Failed to restore the admin album cover after a concurrent update.', error)
    return storageFailure(error)
  }
}

export const deleteAlbumDraft = async (
  coverDraftId: string | null,
  options: DeleteAlbumDraftOptions = {},
): Promise<AlbumDraftStorageResult> => {
  const storage = options.storage ?? BROWSER_STORAGE

  if (coverDraftId !== null) {
    let draftData: string | null
    let cover: Blob | null

    try {
      draftData = storage.readData()
    } catch (error: unknown) {
      console.warn('Failed to read the admin album draft before deletion.', error)
      return storageFailure(error)
    }

    try {
      cover = await storage.readCover(coverDraftId)
    } catch (error: unknown) {
      console.warn('Failed to read the admin album cover before draft deletion.', error)
      return storageFailure(error)
    }

    const coverDeletionResult = await deleteAlbumDraftCover(coverDraftId, options)

    if (!coverDeletionResult.success) {
      return coverDeletionResult
    }

    let currentDraftData: string | null

    try {
      currentDraftData = storage.readData()
    } catch (error: unknown) {
      console.warn('Failed to confirm the admin album draft before deletion.', error)
      return storageFailure(error)
    }

    if (currentDraftData !== draftData) {
      return restoreCoverIfDraftRetainsIt(currentDraftData, coverDraftId, cover, storage)
    }

    if (hasDifferentCoverDraftId(currentDraftData, coverDraftId)) {
      return storageSuccess()
    }
  }

  try {
    storage.deleteData()
    return storageSuccess()
  } catch (error: unknown) {
    console.warn('Failed to delete the admin album draft.', error)
    return storageFailure(error)
  }
}
