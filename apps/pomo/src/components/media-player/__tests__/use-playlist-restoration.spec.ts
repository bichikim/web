/** @vitest-environment jsdom */

import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import type {PPlaybackState, PTrack} from '../../../features/focus-room-audio'
import {usePlaylistRestoration} from '../use-playlist-restoration'

const audioMocks = vi.hoisted(() => ({
  loadPTrackQueueSource: vi.fn(),
  readPPlayback: vi.fn(),
}))

vi.mock('../../../features/focus-room-audio', () => audioMocks)

const TRACK = {
  artist: 'Artist',
  durationSeconds: 120,
  id: 'track-1',
  source: '/track-1.mp3',
  title: 'Track 1',
} as const satisfies PTrack

const PLAYBACK = {
  isPlaying: false,
  positionSeconds: 8,
  trackId: TRACK.id,
} as const satisfies PPlaybackState

afterEach(() => {
  vi.restoreAllMocks()
})

it('should restore controlled playback after a revision changes while tracks are pending', async () => {
  const playback = Promise.withResolvers<PPlaybackState | null>()
  audioMocks.readPPlayback.mockReturnValueOnce(playback.promise)
  const [tracks, setTracks] = createSignal<readonly PTrack[]>([])
  let playbackRevision = 0
  const onRestore = vi.fn()

  const dispose = createRoot(() => {
    usePlaylistRestoration({
      isQueueControlled: () => true,
      onError: vi.fn(),
      onLoad: ({defaultTracks}) => defaultTracks,
      onLoadSettled: vi.fn(),
      onRestore,
      playbackRevision: () => playbackRevision,
      queueRevision: () => 0,
      savedPlaylist: () => null,
      tracks,
    })
    return () => undefined
  })

  playback.resolve(PLAYBACK)
  await playback.promise
  await Promise.resolve()
  expect(onRestore).not.toHaveBeenCalled()
  playbackRevision = 1
  setTracks([TRACK])
  await Promise.resolve()

  expect(onRestore).toHaveBeenCalledExactlyOnceWith([TRACK], PLAYBACK)
  dispose()
})

it('should skip controlled playback when revision changes after tracks are ready', async () => {
  const playback = Promise.withResolvers<PPlaybackState | null>()
  audioMocks.readPPlayback.mockReturnValueOnce(playback.promise)
  const [tracks] = createSignal<readonly PTrack[]>([TRACK])
  let playbackRevision = 0
  const onRestore = vi.fn()

  const dispose = createRoot(() => {
    usePlaylistRestoration({
      isQueueControlled: () => true,
      onError: vi.fn(),
      onLoad: ({defaultTracks}) => defaultTracks,
      onLoadSettled: vi.fn(),
      onRestore,
      playbackRevision: () => playbackRevision,
      queueRevision: () => 0,
      savedPlaylist: () => null,
      tracks,
    })
    return () => undefined
  })

  playbackRevision = 1
  playback.resolve(PLAYBACK)
  await playback.promise
  await Promise.resolve()

  expect(onRestore).not.toHaveBeenCalled()
  dispose()
})
