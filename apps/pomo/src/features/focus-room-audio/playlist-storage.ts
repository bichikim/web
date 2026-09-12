import {z} from 'zod'

import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'
import {createLatestAsyncTask} from 'src/utils/create-latest-async-task'

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

/** Creates an independently coordinated playlist storage boundary. */
export const createPPlaylistStorage = (
  storage: PlaylistStorageAdapter = runtimeStorage,
  clock: PlaylistClock = systemClock,
  reportError: (error: unknown) => void = globalThis.reportError,
): PPlaylistStorage => {
  const writeLatestToss = createLatestAsyncTask(storage.writeToss)
  let writeRevision = 0

  return {
    async read() {
      const initialWriteRevision = writeRevision
      const webPlaylist = storage.readWeb()

      if (!storage.usesTossStorage()) {
        return webPlaylist?.trackIds ?? null
      }

      try {
        const tossPlaylist = await storage.readToss()

        if (writeRevision !== initialWriteRevision) {
          return storage.readWeb()?.trackIds ?? null
        }

        const latestPlaylist = selectLatestPlaylist(webPlaylist, tossPlaylist)

        if (latestPlaylist !== null) {
          storage.writeWeb(latestPlaylist)

          if (latestPlaylist === webPlaylist) {
            writeLatestToss(latestPlaylist).catch(reportError)
          }
        }

        return latestPlaylist?.trackIds ?? null
      } catch {
        return webPlaylist?.trackIds ?? null
      }
    },
    async write(trackIds) {
      writeRevision += 1
      const storedPlaylist = {
        savedAt: clock.now(),
        trackIds,
        version: 1,
      } satisfies StoredPlaylist
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
