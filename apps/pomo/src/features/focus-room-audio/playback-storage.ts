// web-bridge 2.4.1's app client entry imports bridge-core without a runtime dependency,
// so package.json must keep both packages pinned to the same version.
import {Storage} from '@apps-in-toss/web-bridge'
import {z} from 'zod'

const PLAYBACK_STORAGE_KEY = 'pomo:focus-room-playback:v1'
let latestNativePlayback: StoredPlaybackState | null = null

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

const parseStoredPlayback = (storedValue: string | null): StoredPlaybackState | null => {
  if (storedValue === null) {
    return null
  }

  try {
    const result = storedPlaybackSchema.safeParse(JSON.parse(storedValue) as unknown)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

const hasNativeBridge = () => 'ReactNativeWebView' in window

const readWebPlayback = () => {
  try {
    return parseStoredPlayback(localStorage.getItem(PLAYBACK_STORAGE_KEY))
  } catch {
    return null
  }
}

const writeWebPlayback = (state: StoredPlaybackState) => {
  try {
    localStorage.setItem(PLAYBACK_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Browser storage is best-effort; playback remains usable for this session.
  }
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

const setNativePlayback = async (state: StoredPlaybackState) => {
  try {
    await Storage.setItem(PLAYBACK_STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    // The synchronous web copy remains available when native storage is temporarily unavailable.
    return false
  }
}

const convergeNativePlayback = async (state: StoredPlaybackState): Promise<void> => {
  if (!(await setNativePlayback(state))) {
    return
  }

  const latestPlayback = latestNativePlayback
  if (latestPlayback !== state && latestPlayback !== null) {
    // An older request may finish last, so converge native storage back to the newest state.
    await convergeNativePlayback(latestPlayback)
  }
}

const writeNativePlayback = async (state: StoredPlaybackState) => {
  latestNativePlayback = state
  await convergeNativePlayback(state)
}

/** Reads the latest playback position saved by either the app or browser runtime. */
export const readPPlayback = async (): Promise<PPlaybackState | null> => {
  const webPlayback = readWebPlayback()

  if (!hasNativeBridge()) {
    return toPlaybackState(webPlayback)
  }

  try {
    const nativePlayback = parseStoredPlayback(await Storage.getItem(PLAYBACK_STORAGE_KEY))
    return toPlaybackState(selectLatestPlayback(webPlayback, nativePlayback))
  } catch {
    return toPlaybackState(webPlayback)
  }
}

/** Persists playback until the host app or browser data is removed. */
export const writePPlayback = async (state: PPlaybackState): Promise<void> => {
  const storedState = {...state, savedAt: Date.now()} satisfies StoredPlaybackState
  writeWebPlayback(storedState)

  if (!hasNativeBridge()) {
    return
  }

  await writeNativePlayback(storedState)
}
