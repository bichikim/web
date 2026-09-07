import Dexie, {type Table} from 'dexie'
import {z} from 'zod'

import type {AlbumDraftData} from './album-draft'

interface AlbumCoverRecord {
  readonly blob: Blob
  readonly id: string
  readonly updatedAt: number
}

interface AlbumDraftDatabase extends Dexie {
  readonly covers: Table<AlbumCoverRecord, string>
}

export interface AlbumDraftStorage {
  readonly deleteCover: (id: string) => Promise<void>
  readonly deleteData: () => void
  readonly deleteExpiredCovers: (options: DeleteExpiredCoversOptions) => Promise<void>
  readonly readCover: (id: string) => Promise<Blob | null>
  readonly readData: () => string | null
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

const ALBUM_DRAFT_KEY = 'pomo:admin-music:album-draft:v1'
const DATABASE_NAME = 'pomo-admin-music-draft'
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MILLISECONDS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
const COVER_RETENTION_DAYS = 30
const COVER_RETENTION_MILLISECONDS = COVER_RETENTION_DAYS * MILLISECONDS_PER_DAY
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
  }

  return database
}

const BROWSER_STORAGE: AlbumDraftStorage = {
  deleteCover: (id) => getDatabase().covers.delete(id),
  deleteData: () => sessionStorage.removeItem(ALBUM_DRAFT_KEY),
  deleteExpiredCovers: async ({expiresBefore, protectedId}) => {
    const database = getDatabase()
    const expiredIds = await database.covers.where('updatedAt').below(expiresBefore).primaryKeys()
    const deletableIds =
      protectedId === null ? expiredIds : expiredIds.filter((id) => id !== protectedId)
    await database.covers.bulkDelete(deletableIds)
  },
  readCover: async (id) => (await getDatabase().covers.get(id))?.blob ?? null,
  readData: () => sessionStorage.getItem(ALBUM_DRAFT_KEY),
  writeCover: async (id, blob) => {
    await getDatabase().covers.put({blob, id, updatedAt: Date.now()})
  },
  writeData: (data) => sessionStorage.setItem(ALBUM_DRAFT_KEY, data),
}

export type AlbumDraftStorageResult =
  | {readonly success: true}
  | {readonly error: unknown; readonly success: false}

const storageSuccess = (): AlbumDraftStorageResult => ({success: true})
const storageFailure = (error: unknown): AlbumDraftStorageResult => ({error, success: false})

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
