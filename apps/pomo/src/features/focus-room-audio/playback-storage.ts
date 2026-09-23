import {selectMaximumBy} from 'src/utils/select-maximum-by'
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
  trackIndex: z.number().int().nonnegative().optional(),
})

export interface PPlaybackState {
  readonly isPlaying: boolean
  readonly positionSeconds: number
  readonly trackId: string
  readonly trackIndex?: number
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

interface PlaybackNativeWriteRequest {
  readonly state: StoredPlaybackState
  readonly write: (state: StoredPlaybackState) => Promise<void>
}

let activeNativeWriteCount = 0
let latestNativeWrite: PlaybackNativeWriteRequest | null = null

const writeNativePlayback = async (
  storage: PlaybackStorageAdapter,
  state: StoredPlaybackState,
): Promise<void> => {
  const request = {state, write: storage.writeToss} satisfies PlaybackNativeWriteRequest
  const currentLatestWrite = latestNativeWrite
  if (currentLatestWrite === null || state.savedAt >= currentLatestWrite.state.savedAt) {
    latestNativeWrite = request
  }
  activeNativeWriteCount += 1

  try {
    await request.write(request.state)
    let completedRequest = request
    while (latestNativeWrite !== completedRequest) {
      const latestRequest = latestNativeWrite
      if (latestRequest === null) {
        return
      }
      // Reconcile again after each write because a newer instance may submit while it is pending.
      // eslint-disable-next-line no-await-in-loop
      await latestRequest.write(latestRequest.state)
      completedRequest = latestRequest
    }
  } finally {
    activeNativeWriteCount -= 1
    if (activeNativeWriteCount === 0) {
      latestNativeWrite = null
    }
  }
}

const runtimeStorage = {
  readToss: () => readTossStorageJson(PLAYBACK_STORAGE_KEY, parseStoredPlayback),
  readWeb: () => readWebStorageJson(PLAYBACK_STORAGE_KEY, parseStoredPlayback),
  usesTossStorage: hasNativeStorageBridge,
  writeToss: (state) => writeTossStorageJson(PLAYBACK_STORAGE_KEY, state),
  writeWeb: (state) => writeWebStorageJson(PLAYBACK_STORAGE_KEY, state),
} satisfies PlaybackStorageAdapter

const toPlaybackState = (state: StoredPlaybackState | null): PPlaybackState | null => {
  if (state === null) {
    return null
  }

  const {isPlaying, positionSeconds, trackId, trackIndex} = state
  return trackIndex === undefined
    ? {isPlaying, positionSeconds, trackId}
    : {isPlaying, positionSeconds, trackId, trackIndex}
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

/** Creates playback storage with the supplied clock and storage dependencies. */
export const createPPlaybackStorage = (
  clock: PlaybackClock = systemClock,
  storage: PlaybackStorageAdapter = runtimeStorage,
  reportError: (error: unknown) => void = globalThis.reportError,
): PPlaybackStorage => {
  const writeLatestToss = createLatestAsyncTask(async (state: StoredPlaybackState) => {
    try {
      await writeNativePlayback(storage, state)
    } catch (error: unknown) {
      reportError(error)
    }
  })
  let latestWebWrite: StoredPlaybackState | null = null
  let playbackRevision = 0
  let pendingNativeWrites = 0
  let pendingStop: Promise<void> | null = null

  const readStoredPlayback = async (): Promise<PPlaybackState | null> => {
    const initialWebWrite = latestWebWrite
    const initialPlaybackRevision = playbackRevision
    const hadPendingWrite = pendingNativeWrites > 0
    const webPlayback = storage.readWeb()

    if (!storage.usesTossStorage()) {
      return toPlaybackState(webPlayback)
    }

    try {
      const nativePlayback = await storage.readToss()
      if (latestWebWrite !== initialWebWrite) {
        return toPlaybackState(storage.readWeb())
      }
      const latestPlayback = selectMaximumBy(webPlayback, nativePlayback, (value) => value.savedAt)
      if (
        latestPlayback !== null &&
        latestPlayback === webPlayback &&
        !hadPendingWrite &&
        playbackRevision === initialPlaybackRevision
      ) {
        writeLatestToss(latestPlayback)
      }
      return toPlaybackState(latestPlayback)
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
      latestWebWrite = storedState
    }

    if (!storage.usesTossStorage()) {
      return
    }

    pendingNativeWrites += 1
    try {
      await writeLatestToss(storedState)
    } finally {
      pendingNativeWrites -= 1
    }
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
