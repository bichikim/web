/** @vitest-environment jsdom */

import {createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {PPlaybackState, PTrack} from '../features/focus-room-audio'
import {usePlaylistRestoration} from '../components/media-player/use-playlist-restoration'

const TRACK = {
  artist: 'Artist',
  durationSeconds: 120,
  id: 'track-1',
  source: '/track-1.mp3',
  title: 'Track 1',
} as const satisfies PTrack

const STORED_PLAYBACK = {
  isPlaying: false,
  positionSeconds: 8,
  trackId: TRACK.id,
  trackIndex: 0,
} as const satisfies PPlaybackState

const readPPlayback = vi.fn<() => Promise<PPlaybackState | null>>()

vi.mock('../features/focus-room-audio', async () => {
  const actual = await vi.importActual<typeof import('../features/focus-room-audio')>(
    '../features/focus-room-audio',
  )

  return {
    ...actual,
    readPPlayback: () => readPPlayback(),
  }
})

const mountRestoration = (initialTracks: readonly PTrack[] = []) => {
  const [tracks, setTracks] = createSignal<readonly PTrack[]>(initialTracks)
  const onRestore = vi.fn()
  let dispose: () => void = () => undefined

  createRoot((disposeRoot) => {
    dispose = disposeRoot
    usePlaylistRestoration({
      isQueueControlled: () => true,
      onError: vi.fn(),
      onLoad: () => [],
      onLoadSettled: vi.fn(),
      onRestore,
      playbackRevision: () => 0,
      queueRevision: () => 0,
      savedPlaylist: () => null,
      tracks,
    })
  })

  return {onRestore, setTracks, dispose}
}

beforeEach(() => {
  readPPlayback.mockReset()
  readPPlayback.mockResolvedValue(STORED_PLAYBACK)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('bug-hunt: controlled playlist restore before tracks arrive', () => {
  it('should restore saved playback after controlled tracks populate from an empty queue', async () => {
    const {onRestore, setTracks, dispose} = mountRestoration([])

    await Promise.resolve()
    await Promise.resolve()

    setTracks([TRACK])
    await Promise.resolve()
    await Promise.resolve()

    expect(onRestore).toHaveBeenCalledWith([TRACK], STORED_PLAYBACK)

    dispose()
  })
})
