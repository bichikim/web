import {z} from 'zod'

import {
  createLatestNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

const PLAYBACK_STORAGE_KEY = 'pomo:focus-room-playback:v1'
const nativeWriter = createLatestNativeStorageWriter(PLAYBACK_STORAGE_KEY)

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

interface StoredPlaybackState extends PPlaybackState {
  readonly savedAt: number
}

const parseStoredPlayback = (value: unknown): StoredPlaybackState | null => {
  const result = storedPlaybackSchema.safeParse(value)
  return result.success ? result.data : null
}

const readWebPlayback = () => {
  return readWebStorageJson(PLAYBACK_STORAGE_KEY, parseStoredPlayback)
}

const writeWebPlayback = (state: StoredPlaybackState) => {
  writeWebStorageJson(PLAYBACK_STORAGE_KEY, state)
}

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

/** Reads the latest playback position saved by either the app or browser runtime. */
export const readPPlayback = async (): Promise<PPlaybackState | null> => {
  const webPlayback = readWebPlayback()

  if (!hasNativeStorageBridge()) {
    return toPlaybackState(webPlayback)
  }

  try {
    const nativePlayback = await readNativeStorageJson(PLAYBACK_STORAGE_KEY, parseStoredPlayback)
    return toPlaybackState(selectLatestPlayback(webPlayback, nativePlayback))
  } catch {
    return toPlaybackState(webPlayback)
  }
}

/** Persists playback until the host app or browser data is removed. */
export const writePPlayback = async (state: PPlaybackState): Promise<void> => {
  const storedState = {...state, savedAt: Date.now()} satisfies StoredPlaybackState
  writeWebPlayback(storedState)

  if (!hasNativeStorageBridge()) {
    return
  }

  await nativeWriter.write(storedState)
}
