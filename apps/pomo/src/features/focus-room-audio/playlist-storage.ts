import {z} from 'zod'

import {
  createLatestNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

const PLAYLIST_STORAGE_KEY = 'pomo:focus-room-playlist:v1'
const nativeWriter = createLatestNativeStorageWriter(PLAYLIST_STORAGE_KEY)
let playlistWriteRevision = 0

const storedPlaylistSchema = z.object({
  savedAt: z.number().finite().nonnegative(),
  trackIds: z
    .array(z.string().min(1))
    .refine((trackIds) => new Set(trackIds).size === trackIds.length),
  version: z.literal(1),
})

interface StoredPlaylist {
  readonly savedAt: number
  readonly trackIds: readonly string[]
  readonly version: 1
}

const parseStoredPlaylist = (value: unknown): StoredPlaylist | null => {
  const result = storedPlaylistSchema.safeParse(value)
  return result.success ? result.data : null
}

const readWebPlaylist = () => {
  return readWebStorageJson(PLAYLIST_STORAGE_KEY, parseStoredPlaylist)
}

const selectLatestPlaylist = (
  webPlaylist: StoredPlaylist | null,
  nativePlaylist: StoredPlaylist | null,
) => {
  if (webPlaylist === null) {
    return nativePlaylist
  }

  if (nativePlaylist === null || webPlaylist.savedAt >= nativePlaylist.savedAt) {
    return webPlaylist
  }

  return nativePlaylist
}

/** Reads the latest user-edited playlist saved by either the app or browser runtime. */
export const readPPlaylist = async (): Promise<readonly string[] | null> => {
  const initialWriteRevision = playlistWriteRevision
  const webPlaylist = readWebPlaylist()

  if (!hasNativeStorageBridge()) {
    return webPlaylist?.trackIds ?? null
  }

  try {
    const nativePlaylist = await readNativeStorageJson(PLAYLIST_STORAGE_KEY, parseStoredPlaylist)

    if (playlistWriteRevision !== initialWriteRevision) {
      return readWebPlaylist()?.trackIds ?? null
    }

    const latestPlaylist = selectLatestPlaylist(webPlaylist, nativePlaylist)

    if (latestPlaylist !== null) {
      writeWebStorageJson(PLAYLIST_STORAGE_KEY, latestPlaylist)

      if (latestPlaylist === webPlaylist) {
        nativeWriter.write(latestPlaylist).catch(globalThis.reportError)
      }
    }

    return latestPlaylist?.trackIds ?? null
  } catch {
    return webPlaylist?.trackIds ?? null
  }
}

/** Persists the user-edited playlist until the host app or browser data is removed. */
export const writePPlaylist = async (trackIds: readonly string[]): Promise<void> => {
  playlistWriteRevision += 1
  const storedPlaylist = {
    savedAt: Date.now(),
    trackIds,
    version: 1,
  } satisfies StoredPlaylist
  writeWebStorageJson(PLAYLIST_STORAGE_KEY, storedPlaylist)

  if (!hasNativeStorageBridge()) {
    return
  }

  await nativeWriter.write(storedPlaylist)
}
