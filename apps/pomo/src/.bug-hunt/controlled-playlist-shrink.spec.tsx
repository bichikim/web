/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {createSignal} from 'solid-js'
import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PTrack} from '../features/focus-room-audio'
import {type PlayerController, usePlayerController} from '../components/media-player/use-player-controller'

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../features/focus-room-audio', async () => {
  const actual = await vi.importActual<typeof import('../features/focus-room-audio')>(
    '../features/focus-room-audio',
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

const createTrack = (id: string): PTrack => ({
  artist: 'Artist',
  durationSeconds: 120,
  id,
  source: `/${id}.mp3`,
  title: id,
})

const TRACKS = ['track-1', 'track-2', 'track-3', 'track-4'].map(createTrack)

const renderControlledController = (initialTracks: readonly PTrack[] = TRACKS) => {
  const [tracks, setTracks] = createSignal<readonly PTrack[]>(initialTracks)
  const [element, setElement] = createSignal<HTMLAudioElement>()
  let controller: PlayerController | undefined
  const ControllerHarness = (props: Parameters<typeof usePlayerController>[0]) => {
    controller = usePlayerController(props)
    return null
  }
  render(() => <ControllerHarness element={element} tracks={tracks()} />, {
    wrapper: PreferenceProvider,
  })

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

it('should clamp or stop playback when controlled tracks shrink past the current index', async () => {
  const {controller, setTracks} = renderControlledController()

  controller.selectChosenTrack(3)
  controller.onPlay()
  setTracks(TRACKS.slice(0, 2))
  await Promise.resolve()

  expect(controller.currentIndex()).toBeLessThan(2)
  expect(controller.currentTrack()).toBeDefined()
  expect(controller.isPlaying()).toBe(false)
})
