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
  readonly deleteDraftSession: () => void
  readonly deleteExpiredCovers: (options: DeleteExpiredCoversOptions) => Promise<void>
  readonly readCover: (id: string) => Promise<Blob | null>
  readonly readData: () => string | null
  readonly writeCover: (id: string, blob: Blob) => Promise<void>
  readonly writeData: (data: string) => void
  readonly writeDraftSession: (options: WriteDraftSessionOptions) => void
}

export interface DeleteExpiredCoversOptions {
  readonly expiresBefore: number
  readonly protectedId: string | null
  readonly sessionExpiresBefore: number
}

export interface DeleteExpiredAlbumDraftCoversOptions {
  readonly activeCoverDraftId: string | null
  readonly now?: () => number
  readonly storage?: AlbumDraftStorage
}

export interface WriteDraftSessionOptions {
  readonly coverDraftId: string | null
  readonly lastSeenAt: number
}

const ALBUM_DRAFT_KEY = 'pomo:admin-music:album-draft:v1'
const DRAFT_SESSION_KEY_PREFIX = 'pomo:admin-music:album-draft-session:v1:'
const DATABASE_NAME = 'pomo-admin-music-draft'
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MILLISECONDS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
const COVER_RETENTION_DAYS = 30
const COVER_RETENTION_MILLISECONDS = COVER_RETENTION_DAYS * MILLISECONDS_PER_DAY
const DRAFT_SESSION_RETENTION_MILLISECONDS = COVER_RETENTION_MILLISECONDS
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
const draftSessionSchema = z.object({
  coverDraftId: z.string().min(1).nullable(),
  lastSeenAt: z.number().finite(),
})
const draftSessionIds = new WeakMap<Storage, string>()

const getDraftSessionStorageKey = (): string => {
  const currentSessionStorage = sessionStorage
  let sessionId = draftSessionIds.get(currentSessionStorage)

  if (sessionId === undefined) {
    sessionId = crypto.randomUUID()
    draftSessionIds.set(currentSessionStorage, sessionId)
  }

  return `${DRAFT_SESSION_KEY_PREFIX}${sessionId}`
}

const getExistingDraftSessionStorageKey = (): string | null => {
  const sessionId = draftSessionIds.get(sessionStorage)
  return sessionId === undefined ? null : `${DRAFT_SESSION_KEY_PREFIX}${sessionId}`
}

const readDraftSession = (key: string): z.infer<typeof draftSessionSchema> | null => {
  const storedSession = localStorage.getItem(key)

  if (storedSession === null) {
    return null
  }

  try {
    const parsedSession = draftSessionSchema.safeParse(JSON.parse(storedSession))
    return parsedSession.success ? parsedSession.data : null
  } catch {
    return null
  }
}

const readActiveDraftCoverIds = (sessionExpiresBefore: number): Set<string> => {
  const activeCoverDraftIds = new Set<string>()
  const expiredSessionKeys: string[] = []

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)

    if (key !== null && key.startsWith(DRAFT_SESSION_KEY_PREFIX)) {
      const session = readDraftSession(key)

      if (session === null || session.lastSeenAt < sessionExpiresBefore) {
        expiredSessionKeys.push(key)
      } else if (session.coverDraftId !== null) {
        activeCoverDraftIds.add(session.coverDraftId)
      }
    }
  }

  for (const key of expiredSessionKeys) {
    localStorage.removeItem(key)
  }

  return activeCoverDraftIds
}

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
  deleteDraftSession: () => {
    const sessionKey = getExistingDraftSessionStorageKey()

    if (sessionKey !== null) {
      localStorage.removeItem(sessionKey)
    }
  },
  deleteExpiredCovers: async ({expiresBefore, protectedId, sessionExpiresBefore}) => {
    const database = getDatabase()
    const expiredIds = await database.covers.where('updatedAt').below(expiresBefore).primaryKeys()
    const protectedIds = readActiveDraftCoverIds(sessionExpiresBefore)

    if (protectedId !== null) {
      protectedIds.add(protectedId)
    }

    const deletableIds = expiredIds.filter((id) => !protectedIds.has(id))
    await database.covers.bulkDelete(deletableIds)
  },
  readCover: async (id) => (await getDatabase().covers.get(id))?.blob ?? null,
  readData: () => sessionStorage.getItem(ALBUM_DRAFT_KEY),
  writeCover: async (id, blob) => {
    await getDatabase().covers.put({blob, id, updatedAt: Date.now()})
  },
  writeData: (data) => sessionStorage.setItem(ALBUM_DRAFT_KEY, data),
  writeDraftSession: ({coverDraftId, lastSeenAt}) => {
    localStorage.setItem(getDraftSessionStorageKey(), JSON.stringify({coverDraftId, lastSeenAt}))
  },
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
    const currentTime = now()
    storage.writeDraftSession({coverDraftId: options.activeCoverDraftId, lastSeenAt: currentTime})
    await storage.deleteExpiredCovers({
      expiresBefore: currentTime - COVER_RETENTION_MILLISECONDS,
      protectedId: options.activeCoverDraftId,
      sessionExpiresBefore: currentTime - DRAFT_SESSION_RETENTION_MILLISECONDS,
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
    storage.writeDraftSession({coverDraftId: data.coverDraftId, lastSeenAt: Date.now()})
    return storageSuccess()
  } catch (error: unknown) {
    console.warn('Failed to save the admin album draft.', error)
    return storageFailure(error)
  }
}

/** Refreshes the current browser tab's draft cover reference. */
export const touchAlbumDraftSession = (
  coverDraftId: string | null,
  storage: AlbumDraftStorage = BROWSER_STORAGE,
): AlbumDraftStorageResult => {
  try {
    storage.writeDraftSession({coverDraftId, lastSeenAt: Date.now()})
    return storageSuccess()
  } catch (error: unknown) {
    console.warn('Failed to refresh the admin album draft session.', error)
    return storageFailure(error)
  }
}

/** Deletes the current browser tab's draft cover reference. */
export const deleteAlbumDraftSession = (
  storage: AlbumDraftStorage = BROWSER_STORAGE,
): AlbumDraftStorageResult => {
  try {
    storage.deleteDraftSession()
    return storageSuccess()
  } catch (error: unknown) {
    console.warn('Failed to delete the admin album draft session.', error)
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

  try {
    storage.deleteDraftSession()
  } catch (error: unknown) {
    console.warn('Failed to delete the admin album draft session.', error)
    if (deletionResult.success) {
      deletionResult = storageFailure(error)
    }
  }

  if (coverDraftId === null) {
    return deletionResult
  }

  const coverDeletionResult = await deleteAlbumDraftCover(coverDraftId, storage)
  return coverDeletionResult.success ? deletionResult : coverDeletionResult
}
