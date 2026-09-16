/** @vitest-environment jsdom */

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

const readStoredPlayback = () =>
  JSON.parse(localStorage.getItem(PLAYBACK_STORAGE_KEY) ?? 'null') as {
    readonly isPlaying: boolean
    readonly positionSeconds: number
    readonly trackId: string
  } | null

const renderController = () => {
  const [element, setElement] = createSignal<HTMLAudioElement>()
  let controller: PlayerController | undefined
  render(() => {
    controller = usePlayerController({element, tracks: [TRACK]})
    return null
  })

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

const renderControlledController = () => {
  const [tracks, setTracks] = createSignal<readonly PTrack[]>([TRACK])
  const [element, setElement] = createSignal<HTMLAudioElement>()
  let controller: PlayerController | undefined
  const ControllerHarness = (props: Parameters<typeof usePlayerController>[0]) => {
    controller = usePlayerController(props)
    return null
  }
  render(() => <ControllerHarness element={element} tracks={tracks()} />)

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
  window.dispatchEvent(new Event('pagehide'))
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
  window.dispatchEvent(new Event('pagehide'))
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
  window.dispatchEvent(new Event('pagehide'))

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
