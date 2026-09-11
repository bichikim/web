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
  readonly deleteCover: (id: string) => Promise<void>
  readonly deleteData: () => void
  readonly deleteDraftReference: (id: string) => Promise<void>
  readonly deleteExpiredCovers: (options: DeleteExpiredCoversOptions) => Promise<void>
  readonly readCover: (id: string) => Promise<Blob | null>
  readonly readData: () => string | null
  readonly writeDraftReference: (reference: AlbumDraftReference) => Promise<void>
  readonly writeCover: (id: string, blob: Blob) => Promise<void>
  readonly writeData: (data: string) => void
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
  deleteCover: async (id) => {
    const database = getDatabase()
    const expiresBefore = Date.now() - COVER_RETENTION_MILLISECONDS
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

const storageSuccess = (): AlbumDraftStorageResult => ({success: true})
const storageFailure = (error: unknown): AlbumDraftStorageResult => ({error, success: false})

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
): AlbumDraftData | null => {
  try {
    const storedDraft = storage.readData()
    return storedDraft === null ? null : albumDraftSchema.parse(JSON.parse(storedDraft))
  } catch (error: unknown) {
    console.warn('Failed to read the admin album draft.', error)
    return null
  }
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

export const readAlbumDraftCover = async (
  id: string,
  storage: AlbumDraftStorage = BROWSER_STORAGE,
): Promise<File | null> => {
  try {
    const blob = await storage.readCover(id)
    return blob === null ? null : new File([blob], 'cover.webp', {type: blob.type})
  } catch (error: unknown) {
    console.warn('Failed to read the admin album cover draft.', error)
    return null
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
  storage: AlbumDraftStorage = BROWSER_STORAGE,
): Promise<AlbumDraftStorageResult> => {
  try {
    await storage.deleteCover(id)
    return storageSuccess()
  } catch (error: unknown) {
    console.warn('Failed to delete the admin album cover draft.', error)
    return storageFailure(error)
  }
}

export const deleteAlbumDraft = async (
  coverDraftId: string | null,
  storage: AlbumDraftStorage = BROWSER_STORAGE,
): Promise<AlbumDraftStorageResult> => {
  let deletionResult = storageSuccess()

  try {
    storage.deleteData()
  } catch (error: unknown) {
    console.warn('Failed to delete the admin album draft.', error)
    deletionResult = storageFailure(error)
  }

  if (coverDraftId === null) {
    return deletionResult
  }

  const coverDeletionResult = await deleteAlbumDraftCover(coverDraftId, storage)
  return coverDeletionResult.success ? deletionResult : coverDeletionResult
}
