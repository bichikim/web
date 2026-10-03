import {createBoundTossWebStorageAdapter} from 'src/utils/runtime-storage'
import {createTimestampedDualRuntimeStorage} from 'src/utils/runtime-storage/create-timestamped-dual-runtime-storage'
import {z} from 'zod'

import {createLatestAsyncTask} from 'src/utils/create-latest-async-task'
import {hasValidPlaylistEntryIds} from './playlist-entry'

const PLAYLIST_STORAGE_KEY = 'pomo:focus-room-playlist:v1'

const storedPlaylistBaseSchema = z.object({
  savedAt: z.number().finite().nonnegative(),
  trackIds: z.array(z.string().min(1)),
  version: z.literal(1),
})
const storedPlaylistSchema = storedPlaylistBaseSchema.extend({
  entryIds: z.array(z.string().min(1)).optional(),
})

export interface StoredPlaylist {
  readonly entryIds?: readonly string[]
  readonly savedAt: number
  readonly trackIds: readonly string[]
  readonly version: 1
}

export interface PlaylistStorageAdapter {
  readonly readToss: () => Promise<StoredPlaylist | null>
  readonly readWeb: () => StoredPlaylist | null
  readonly usesTossStorage: () => boolean
  readonly writeToss: (playlist: StoredPlaylist) => Promise<void>
  readonly writeWeb: (playlist: StoredPlaylist) => unknown | null
}

export interface PlaylistClock {
  readonly now: () => number
}

export interface PPlaylistStorage {
  readonly read: () => Promise<readonly string[] | null>
  readonly readWithEntryIds: () => Promise<PersistedPlaylist | null>
  readonly write: (trackIds: readonly string[]) => Promise<void>
  readonly writeWithEntryIds: (
    trackIds: readonly string[],
    entryIds: readonly string[],
  ) => Promise<void>
}

export interface PersistedPlaylist {
  readonly entryIds?: readonly string[]
  readonly trackIds: readonly string[]
}

const parseStoredPlaylist = (value: unknown): StoredPlaylist | null => {
  const legacyResult = storedPlaylistBaseSchema.safeParse(value)
  if (!legacyResult.success) {
    return null
  }

  const result = storedPlaylistSchema.safeParse(value)
  return result.success && hasValidPlaylistEntryIds(result.data.trackIds, result.data.entryIds)
    ? result.data
    : legacyResult.data
}

const runtimeStorage = createBoundTossWebStorageAdapter({
  key: PLAYLIST_STORAGE_KEY,
  parse: parseStoredPlaylist,
}) satisfies PlaylistStorageAdapter

const systemClock = {
  now: Date.now,
} satisfies PlaylistClock

interface PlaylistTossWrite {
  readonly playlist: StoredPlaylist
  readonly write: PlaylistStorageAdapter['writeToss']
}

const writeLatestToss = createLatestAsyncTask<PlaylistTossWrite>(({playlist, write}) =>
  write(playlist),
)

/** Reads and writes playlists using their persisted timestamps. */
export const createPPlaylistStorage = (
  storage: PlaylistStorageAdapter = runtimeStorage,
  clock: PlaylistClock = systemClock,
  reportError: (error: unknown) => void = globalThis.reportError,
): PPlaylistStorage => {
  const coordinator = createTimestampedDualRuntimeStorage<StoredPlaylist>({now: () => clock.now()})
  const readStoredPlaylist = async (): Promise<StoredPlaylist | null> => {
    const initialPlaylistRevision = coordinator.revision()
    const webPlaylist = storage.readWeb()

    if (!storage.usesTossStorage()) {
      return webPlaylist
    }

    try {
      const tossPlaylist = await storage.readToss()

      if (coordinator.revision() !== initialPlaylistRevision) {
        return storage.readWeb()
      }

      const latestPlaylist = coordinator.selectLatest(webPlaylist, tossPlaylist)

      if (latestPlaylist !== null) {
        storage.writeWeb(latestPlaylist)

        if (latestPlaylist === webPlaylist) {
          await writeLatestToss({playlist: latestPlaylist, write: storage.writeToss}).catch(
            reportError,
          )
        }
      }

      return coordinator.revision() === initialPlaylistRevision ? latestPlaylist : storage.readWeb()
    } catch {
      return coordinator.revision() === initialPlaylistRevision ? webPlaylist : storage.readWeb()
    }
  }
  const writePlaylist = (trackIds: readonly string[], entryIds?: readonly string[]) =>
    coordinator.writeStored(
      (savedAt) => ({
        ...(hasValidPlaylistEntryIds(trackIds, entryIds) ? {entryIds} : {}),
        savedAt,
        trackIds,
        version: 1,
      }),
      async (storedPlaylist) => {
        storage.writeWeb(storedPlaylist)
        if (storage.usesTossStorage()) {
          await writeLatestToss({playlist: storedPlaylist, write: storage.writeToss}).catch(
            () => undefined,
          )
        }
      },
    )

  return {
    read: async () => (await readStoredPlaylist())?.trackIds ?? null,
    readWithEntryIds: async () => {
      const playlist = await readStoredPlaylist()
      if (playlist === null) {
        return null
      }
      return {
        ...(playlist.entryIds === undefined ? {} : {entryIds: playlist.entryIds}),
        trackIds: playlist.trackIds,
      }
    },
    write: (trackIds) => writePlaylist(trackIds),
    writeWithEntryIds: (trackIds, entryIds) => writePlaylist(trackIds, entryIds),
  }
}

const runtimePlaylistStorage = createPPlaylistStorage()

/** Reads the latest user-edited playlist saved by either the app or browser runtime. */
export const readPPlaylist = () => runtimePlaylistStorage.read()

/** Persists the user-edited playlist until the host app or browser data is removed. */
export const writePPlaylist = (trackIds: readonly string[]) =>
  runtimePlaylistStorage.write(trackIds)

/** Reads the saved playlist and any stable IDs assigned to its individual entries. */
export const readPPlaylistWithEntryIds = () => runtimePlaylistStorage.readWithEntryIds()

/** Persists ordered playlist tracks with their aligned stable entry IDs. */
export const writePPlaylistWithEntryIds = (
  trackIds: readonly string[],
  entryIds: readonly string[],
) => runtimePlaylistStorage.writeWithEntryIds(trackIds, entryIds)

export interface PlaylistPreference {
  readonly entryIds?: readonly string[]
  readonly trackIds: readonly string[] | null
}

const playlistPreferenceBaseSchema = z.object({trackIds: z.array(z.string().min(1)).nullable()})
const playlistPreferenceSchema = playlistPreferenceBaseSchema.extend({
  entryIds: z.array(z.string().min(1)).optional(),
})

const parsePlaylistPreference = (value: unknown): PlaylistPreference | null => {
  const legacyResult = playlistPreferenceBaseSchema.safeParse(value)
  if (!legacyResult.success) {
    return null
  }

  const result = playlistPreferenceSchema.safeParse(value)
  return result.success &&
    result.data.trackIds !== null &&
    hasValidPlaylistEntryIds(result.data.trackIds, result.data.entryIds)
    ? result.data
    : legacyResult.data
}

export const playlistPreference = {
  defaultValue: {trackIds: null} as PlaylistPreference,
  key: PLAYLIST_STORAGE_KEY,
  parse: parsePlaylistPreference,
  storage: {
    read: async () => (await readPPlaylistWithEntryIds()) ?? {trackIds: null},
    write: (_key: string, value: unknown) => {
      const result = parsePlaylistPreference(value)
      if (result === null || result.trackIds === null) {
        return null
      }
      return result.entryIds === undefined
        ? writePPlaylist(result.trackIds)
        : writePPlaylistWithEntryIds(result.trackIds, result.entryIds)
    },
  },
}
