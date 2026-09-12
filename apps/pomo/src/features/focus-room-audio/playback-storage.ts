import {z} from 'zod'

import {createLatestAsyncTask} from 'src/utils/create-latest-async-task'

import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

const PLAYBACK_STORAGE_KEY = 'pomo:focus-room-playback:v1'
const storedPlaybackSchema = z.object({
  isPlaying: z.boolean().default(false),
  positionSeconds: z.number().finite().nonnegative(),
  savedAt: z.number().finite().nonnegative(),
  trackId: z.string().min(1),
})

export interface PPlaybackState {
  readonly isPlaying: boolean
  readonly positionSeconds: number
  readonly trackId: string
}

export interface StoredPlaybackState extends PPlaybackState {
  readonly savedAt: number
}

const parseStoredPlayback = (value: unknown): StoredPlaybackState | null => {
  const result = storedPlaybackSchema.safeParse(value)
  return result.success ? result.data : null
}

export interface PlaybackStorageAdapter {
  readonly readWeb: () => StoredPlaybackState | null
  readonly readToss: () => Promise<StoredPlaybackState | null>
  readonly usesTossStorage: () => boolean
  /** Returns null on success or the error value on failure. */
  readonly writeWeb: (state: StoredPlaybackState) => unknown | null
  readonly writeToss: (state: StoredPlaybackState) => Promise<void>
}

const runtimeStorage = {
  readToss: () => readTossStorageJson(PLAYBACK_STORAGE_KEY, parseStoredPlayback),
  readWeb: () => readWebStorageJson(PLAYBACK_STORAGE_KEY, parseStoredPlayback),
  usesTossStorage: hasNativeStorageBridge,
  writeToss: (state) => writeTossStorageJson(PLAYBACK_STORAGE_KEY, state),
  writeWeb: (state) => writeWebStorageJson(PLAYBACK_STORAGE_KEY, state),
} satisfies PlaybackStorageAdapter

const selectLatestPlayback = (
  webPlayback: StoredPlaybackState | null,
  nativePlayback: StoredPlaybackState | null,
) => {
  if (webPlayback === null) {
    return nativePlayback
  }

  if (nativePlayback === null || webPlayback.savedAt >= nativePlayback.savedAt) {
    return webPlayback
  }

  return nativePlayback
}

const toPlaybackState = (state: StoredPlaybackState | null): PPlaybackState | null => {
  if (state === null) {
    return null
  }

  const {isPlaying, positionSeconds, trackId} = state
  return {isPlaying, positionSeconds, trackId}
}

export interface PlaybackClock {
  readonly now: () => number
}

export interface PPlaybackStorage {
  readonly read: () => Promise<PPlaybackState | null>
  readonly stop: () => Promise<void>
  readonly write: (state: PPlaybackState) => Promise<void>
}

const systemClock: PlaybackClock = {now: Date.now}

/** Creates playback storage with its own coordination state and the supplied clock. */
export const createPPlaybackStorage = (
  clock: PlaybackClock = systemClock,
  storage: PlaybackStorageAdapter = runtimeStorage,
): PPlaybackStorage => {
  const writeLatestToss = createLatestAsyncTask(storage.writeToss)
  let playbackRevision = 0
  let playbackWriteRevision = 0
  let pendingStop: Promise<void> | null = null

  const readStoredPlayback = async (): Promise<PPlaybackState | null> => {
    const initialRevision = playbackWriteRevision
    const webPlayback = storage.readWeb()

    if (!storage.usesTossStorage()) {
      return toPlaybackState(webPlayback)
    }

    try {
      const nativePlayback = await storage.readToss()
      if (playbackWriteRevision !== initialRevision) {
        return toPlaybackState(storage.readWeb())
      }
      return toPlaybackState(selectLatestPlayback(webPlayback, nativePlayback))
    } catch {
      return toPlaybackState(storage.readWeb())
    }
  }

  /** Reads playback after pending stop requests have settled. */
  const read = (): Promise<PPlaybackState | null> => {
    const stopping = pendingStop
    return stopping === null ? readStoredPlayback() : stopping.then(readStoredPlayback)
  }

  /** Stops saved playback without changing its track or position. */
  const stop = (): Promise<void> => {
    const revision = (playbackRevision += 1)
    const stopping = (pendingStop ?? Promise.resolve()).then(async () => {
      const playback = await readStoredPlayback()
      if (playback !== null && revision === playbackRevision) {
        await write({...playback, isPlaying: false})
      }
    })
    const settled = stopping
      .catch(() => undefined)
      .then(() => {
        if (pendingStop === settled) {
          pendingStop = null
        }
      })
    pendingStop = settled
    return stopping
  }

  /** Persists playback until the host app or browser data is removed. */
  const write = async (state: PPlaybackState): Promise<void> => {
    playbackRevision += 1
    const storedState = {...state, savedAt: clock.now()} satisfies StoredPlaybackState
    if (storage.writeWeb(storedState) === null) {
      playbackWriteRevision += 1
    }

    if (!storage.usesTossStorage()) {
      return
    }

    await writeLatestToss(storedState).catch(() => undefined)
  }

  return {read, stop, write}
}

const runtimePlaybackStorage = createPPlaybackStorage()

/** Reads playback after pending stop requests have settled. */
export const readPPlayback = () => runtimePlaybackStorage.read()

/** Stops saved playback without changing its track or position. */
export const stopPPlayback = () => runtimePlaybackStorage.stop()

/** Persists playback until the host app or browser data is removed. */
export const writePPlayback = (state: PPlaybackState) => runtimePlaybackStorage.write(state)
