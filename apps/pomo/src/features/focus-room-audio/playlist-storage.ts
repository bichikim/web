import {z} from 'zod'

import {createLatestAsyncTask} from 'src/utils/create-latest-async-task'

import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

const PLAYLIST_STORAGE_KEY = 'pomo:focus-room-playlist:v1'

const storedPlaylistSchema = z.object({
  savedAt: z.number().finite().nonnegative(),
  trackIds: z
    .array(z.string().min(1))
    .refine((trackIds) => new Set(trackIds).size === trackIds.length),
  version: z.literal(1),
})

export interface StoredPlaylist {
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
  readonly write: (trackIds: readonly string[]) => Promise<void>
}

const parseStoredPlaylist = (value: unknown): StoredPlaylist | null => {
  const result = storedPlaylistSchema.safeParse(value)
  return result.success ? result.data : null
}

const selectLatestPlaylist = (
  webPlaylist: StoredPlaylist | null,
  tossPlaylist: StoredPlaylist | null,
) => {
  if (webPlaylist === null) {
    return tossPlaylist
  }

  if (tossPlaylist === null || webPlaylist.savedAt >= tossPlaylist.savedAt) {
    return webPlaylist
  }

  return tossPlaylist
}

const runtimeStorage = {
  readToss: () => readTossStorageJson(PLAYLIST_STORAGE_KEY, parseStoredPlaylist),
  readWeb: () => readWebStorageJson(PLAYLIST_STORAGE_KEY, parseStoredPlaylist),
  usesTossStorage: hasNativeStorageBridge,
  writeToss: (playlist) => writeTossStorageJson(PLAYLIST_STORAGE_KEY, playlist),
  writeWeb: (playlist) => writeWebStorageJson(PLAYLIST_STORAGE_KEY, playlist),
} satisfies PlaylistStorageAdapter

const systemClock = {
  now: Date.now,
} satisfies PlaylistClock

/** Reads and writes playlists using their persisted timestamps. */
export const createPPlaylistStorage = (
  storage: PlaylistStorageAdapter = runtimeStorage,
  clock: PlaylistClock = systemClock,
  reportError: (error: unknown) => void = globalThis.reportError,
): PPlaylistStorage => {
  const writeLatestToss = createLatestAsyncTask(storage.writeToss)
  let playlistRevision = 0

  return {
    async read() {
      const initialPlaylistRevision = playlistRevision
      const webPlaylist = storage.readWeb()

      if (!storage.usesTossStorage()) {
        return webPlaylist?.trackIds ?? null
      }

      try {
        const tossPlaylist = await storage.readToss()

        if (playlistRevision !== initialPlaylistRevision) {
          return storage.readWeb()?.trackIds ?? null
        }

        const latestPlaylist = selectLatestPlaylist(webPlaylist, tossPlaylist)

        if (latestPlaylist !== null) {
          storage.writeWeb(latestPlaylist)

          if (latestPlaylist === webPlaylist) {
            await writeLatestToss(latestPlaylist).catch(reportError)
          }
        }

        if (playlistRevision !== initialPlaylistRevision) {
          return storage.readWeb()?.trackIds ?? null
        }

        return latestPlaylist?.trackIds ?? null
      } catch {
        if (playlistRevision !== initialPlaylistRevision) {
          return storage.readWeb()?.trackIds ?? null
        }

        return webPlaylist?.trackIds ?? null
      }
    },
    async write(trackIds) {
      const storedPlaylist = {
        savedAt: clock.now(),
        trackIds,
        version: 1,
      } satisfies StoredPlaylist
      playlistRevision += 1
      storage.writeWeb(storedPlaylist)

      if (!storage.usesTossStorage()) {
        return
      }

      await writeLatestToss(storedPlaylist).catch(() => undefined)
    },
  }
}

const runtimePlaylistStorage = createPPlaylistStorage()

/** Reads the latest user-edited playlist saved by either the app or browser runtime. */
export const readPPlaylist = () => runtimePlaylistStorage.read()

/** Persists the user-edited playlist until the host app or browser data is removed. */
export const writePPlaylist = (trackIds: readonly string[]) =>
  runtimePlaylistStorage.write(trackIds)

export interface PlaylistPreference {
  readonly trackIds: readonly string[] | null
}

const playlistPreferenceSchema = z.object({trackIds: z.array(z.string().min(1)).nullable()})

export const playlistPreference = {
  defaultValue: {trackIds: null} satisfies PlaylistPreference,
  key: PLAYLIST_STORAGE_KEY,
  parse: (value: unknown): PlaylistPreference | null => {
    const result = playlistPreferenceSchema.safeParse(value)
    return result.success ? result.data : null
  },
  storage: {
    read: async () => ({trackIds: await readPPlaylist()}),
    write: (_key: string, value: unknown) => {
      const result = playlistPreferenceSchema.safeParse(value)
      return result.success && result.data.trackIds !== null
        ? writePPlaylist(result.data.trackIds)
        : null
    },
  },
}
