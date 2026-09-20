/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {createSignal} from 'solid-js'
import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PTrack} from '../../../features/focus-room-audio'
import {type PlayerController, usePlayerController} from '../use-player-controller'

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../../../features/focus-room-audio', async () => {
  const actual = await vi.importActual<typeof import('../../../features/focus-room-audio')>(
    '../../../features/focus-room-audio',
  )

  return {
    ...actual,
    usePAudioVisualizer: vi.fn(() => ({
      levels: vi.fn(() => []),
      setOutputGain: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
  }
})

const PLAYBACK_STORAGE_KEY = 'pomo:focus-room-playback:v1'
const TRACK = {
  artist: 'Artist',
  durationSeconds: 120,
  id: 'track-1',
  source: '/track-1.mp3',
  title: 'Track 1',
} as const satisfies PTrack
const NEXT_TRACK = {
  ...TRACK,
  id: 'track-2',
  source: '/track-2.mp3',
  title: 'Track 2',
} as const satisfies PTrack
const THIRD_TRACK = {
  ...TRACK,
  id: 'track-3',
  source: '/track-3.mp3',
  title: 'Track 3',
} as const satisfies PTrack
const FOURTH_TRACK = {
  ...TRACK,
  id: 'track-4',
  source: '/track-4.mp3',
  title: 'Track 4',
} as const satisfies PTrack

const readStoredPlayback = () =>
  JSON.parse(localStorage.getItem(PLAYBACK_STORAGE_KEY) ?? 'null') as {
    readonly isPlaying: boolean
    readonly positionSeconds: number
    readonly trackId: string
    readonly trackIndex?: number
  } | null

const renderController = () => {
  const [element, setElement] = createSignal<HTMLAudioElement>()
  let controller: PlayerController | undefined
  render(
    () => {
      controller = usePlayerController({element, tracks: [TRACK]})
      return null
    },
    {wrapper: PreferenceProvider},
  )

  const audio = document.createElement('audio')
  vi.spyOn(audio, 'load').mockImplementation(() => undefined)
  vi.spyOn(audio, 'play').mockResolvedValue()
  vi.spyOn(audio, 'pause').mockImplementation(() => undefined)
  setElement(audio)

  if (controller === undefined) {
    throw new Error('Missing player controller')
  }

  return {audio, controller}
}

const renderControlledController = (
  initialTracks: readonly PTrack[] = [TRACK],
  onTrackChange?: (track: PTrack | null) => void,
) => {
  const [tracks, setTracks] = createSignal<readonly PTrack[]>(initialTracks)
  const [element, setElement] = createSignal<HTMLAudioElement>()
  let controller: PlayerController | undefined
  const ControllerHarness = (props: Parameters<typeof usePlayerController>[0]) => {
    controller = usePlayerController(props)
    return null
  }
  render(
    () => <ControllerHarness element={element} onTrackChange={onTrackChange} tracks={tracks()} />,
    {
      wrapper: PreferenceProvider,
    },
  )

  const audio = document.createElement('audio')
  vi.spyOn(audio, 'load').mockImplementation(() => undefined)
  vi.spyOn(audio, 'play').mockResolvedValue()
  vi.spyOn(audio, 'pause').mockImplementation(() => undefined)
  setElement(audio)

  if (controller === undefined) {
    throw new Error('Missing player controller')
  }

  return {audio, controller, setTracks}
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should preserve restart playback intent until the play event follows seeked', () => {
  const {audio, controller} = renderController()

  controller.onEnded()
  expect(readStoredPlayback()).toMatchObject({
    isPlaying: true,
    positionSeconds: 0,
    trackId: TRACK.id,
  })

  controller.onSeeking()
  globalThis.dispatchEvent(new Event('pagehide'))
  controller.onSeeked()
  controller.onTimeUpdate()
  expect(readStoredPlayback()).toMatchObject({
    isPlaying: true,
    positionSeconds: 0,
    trackId: TRACK.id,
  })

  controller.onPlay()
  expect(audio.pause).not.toHaveBeenCalled()
  audio.currentTime = 8
  controller.onSeeked()
  expect(readStoredPlayback()).toMatchObject({
    isPlaying: true,
    positionSeconds: 8,
    trackId: TRACK.id,
  })
})

it('should restore the saved occurrence when a controlled playlist repeats a track ID', async () => {
  const duplicateTracks = [TRACK, TRACK, NEXT_TRACK]
  localStorage.setItem(
    PLAYBACK_STORAGE_KEY,
    JSON.stringify({
      isPlaying: false,
      positionSeconds: 8,
      savedAt: 1,
      trackId: TRACK.id,
      trackIndex: 1,
    }),
  )

  const {controller} = renderControlledController(duplicateTracks)

  await vi.waitFor(() => expect(controller.currentIndex()).toBe(1))
  expect(controller.currentTrack()).toBe(duplicateTracks[1])
})

it('should persist a failed restart as paused after releasing the pending intent', () => {
  const {controller} = renderController()

  controller.onEnded()
  controller.onError(new Error('Playback failed'))

  expect(readStoredPlayback()).toMatchObject({
    isPlaying: false,
    positionSeconds: 0,
    trackId: TRACK.id,
  })
})

it('should keep persistence active when restarting an already-playing track', () => {
  const {audio, controller} = renderController()

  controller.onPlay()
  controller.selectNextTrack()
  audio.currentTime = 6
  controller.onSeeked()

  expect(readStoredPlayback()).toMatchObject({
    isPlaying: true,
    positionSeconds: 6,
    trackId: TRACK.id,
  })
})

it('should keep a pending restart play request when seeking an already-playing track', () => {
  const {audio, controller} = renderController()

  controller.onPlay()
  controller.selectNextTrack()
  expect(audio.play).toHaveBeenCalledOnce()
  controller.onSeeking()
  Object.defineProperty(audio, 'paused', {configurable: true, value: false})
  controller.onPlay()

  expect(audio.pause).not.toHaveBeenCalled()
  expect(controller.isPlaying()).toBe(true)
})

it('should release pending restart persistence when track selection cancels playback', async () => {
  const {audio, controller} = renderController()

  Object.defineProperty(audio, 'readyState', {
    configurable: true,
    value: HTMLMediaElement.HAVE_METADATA,
  })
  controller.selectNextTrack()
  controller.selectChosenTrack(0)
  await Promise.resolve()
  audio.currentTime = 12
  controller.onSeeked()

  expect(readStoredPlayback()).toMatchObject({
    isPlaying: false,
    positionSeconds: 12,
    trackId: TRACK.id,
  })
})

it('should ignore a late play event after track selection cancels a restart', () => {
  const {controller} = renderController()

  controller.onEnded()
  controller.selectChosenTrack(0)
  controller.onPlay()

  expect(controller.isPlaying()).toBe(false)
  expect(readStoredPlayback()).toMatchObject({
    isPlaying: false,
    positionSeconds: 0,
    trackId: TRACK.id,
  })
})

it('should persist a user pause when it cancels a pending restart', () => {
  const {controller} = renderController()

  controller.onEnded()
  controller.pause()
  globalThis.dispatchEvent(new Event('pagehide'))
  controller.onSeeked()

  expect(readStoredPlayback()).toMatchObject({
    isPlaying: false,
    positionSeconds: 0,
    trackId: TRACK.id,
  })
})

it('should persist a media-controller pause intent without a native pause event', () => {
  const {controller} = renderController()

  controller.onEnded()
  controller.markPauseIntent()
  globalThis.dispatchEvent(new Event('pagehide'))

  expect(readStoredPlayback()).toMatchObject({
    isPlaying: false,
    positionSeconds: 0,
    trackId: TRACK.id,
  })
})

it('should release pending restart persistence when controlled tracks change', async () => {
  const {audio, controller, setTracks} = renderControlledController()

  controller.onEnded()
  setTracks([NEXT_TRACK])
  await Promise.resolve()
  audio.currentTime = 12
  controller.onSeeked()

  expect(readStoredPlayback()).toMatchObject({
    isPlaying: false,
    positionSeconds: 12,
    trackId: NEXT_TRACK.id,
  })
})

it('should preserve playback when controlled tracks replace the current source', async () => {
  const {controller, setTracks} = renderControlledController()

  controller.onPlay()
  setTracks([NEXT_TRACK])
  await Promise.resolve()
  controller.onPause()

  expect(controller.isPlaying()).toBe(true)
  expect(readStoredPlayback()).toMatchObject({
    isPlaying: true,
    positionSeconds: 0,
    trackId: NEXT_TRACK.id,
  })
})

it('should preserve playback preparation after an aborted source replacement error', () => {
  const {controller} = renderControlledController([TRACK, NEXT_TRACK])

  controller.onPlay()
  controller.selectChosenTrack(1)
  controller.onError({code: 1, message: 'The user aborted a request.'})

  expect(controller.isPlaying()).toBe(true)
  expect(controller.isPreparing()).toBe(true)
})

it('should preserve playback when seeking before metadata during track replacement', async () => {
  const {controller, setTracks} = renderControlledController()

  controller.onPlay()
  setTracks([NEXT_TRACK])
  await Promise.resolve()
  controller.onSeeking()
  controller.onPause()

  expect(controller.isPlaying()).toBe(true)
  expect(readStoredPlayback()).toMatchObject({
    isPlaying: true,
    positionSeconds: 0,
    trackId: NEXT_TRACK.id,
  })
})

it('should resume the media element after seeking before metadata during track replacement', async () => {
  const {audio, controller, setTracks} = renderControlledController()

  controller.onPlay()
  setTracks([NEXT_TRACK])
  await Promise.resolve()
  await Promise.resolve()
  audio.currentTime = 8
  controller.onSeeking()
  Object.defineProperty(audio, 'readyState', {
    configurable: true,
    value: HTMLMediaElement.HAVE_METADATA,
  })
  controller.onLoadedMetadata()

  expect(audio.play).toHaveBeenCalled()
})

it('should honor an explicit pause after seeking before metadata during track replacement', async () => {
  const {audio, controller, setTracks} = renderControlledController()

  controller.onPlay()
  setTracks([NEXT_TRACK])
  await Promise.resolve()
  await Promise.resolve()
  audio.currentTime = 8
  controller.onSeeking()
  controller.pause()
  Object.defineProperty(audio, 'readyState', {
    configurable: true,
    value: HTMLMediaElement.HAVE_METADATA,
  })
  controller.onLoadedMetadata()

  expect(controller.isPlaying()).toBe(false)
  expect(audio.play).not.toHaveBeenCalled()
  expect(readStoredPlayback()).toMatchObject({
    isPlaying: false,
    positionSeconds: 8,
    trackId: NEXT_TRACK.id,
  })
})

it('should not reload when controlled tracks refresh with identical track identity', async () => {
  const {audio, controller, setTracks} = renderControlledController()

  controller.onPlay()
  vi.mocked(audio.load).mockClear()
  setTracks([{...TRACK}])
  await Promise.resolve()

  expect(audio.load).not.toHaveBeenCalled()
})

it('should clamp the current index when controlled tracks shrink', async () => {
  const initialTracks = [TRACK, NEXT_TRACK, THIRD_TRACK, FOURTH_TRACK]
  const onTrackChange = vi.fn()
  const {controller, setTracks} = renderControlledController(initialTracks, onTrackChange)

  controller.selectChosenTrack(3)
  controller.onPlay()
  setTracks(initialTracks.slice(0, 2))

  expect(controller.currentIndex()).toBe(1)
  expect(controller.currentTrack()).toBe(NEXT_TRACK)

  await Promise.resolve()

  expect(controller.currentIndex()).toBe(1)
  expect(controller.currentTrack()).toBe(NEXT_TRACK)
  expect(controller.isPlaying()).toBe(true)
  expect(onTrackChange).toHaveBeenLastCalledWith(NEXT_TRACK)
  expect(onTrackChange).not.toHaveBeenCalledWith(null)
})
