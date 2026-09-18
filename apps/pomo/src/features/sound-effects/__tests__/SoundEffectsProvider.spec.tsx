/** @vitest-environment jsdom */

import {cleanup, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import type {SoundEffectPlayback} from '../use-sound-effect'
import {SoundEffectsProvider} from '../SoundEffectsProvider'
import {useSoundEffects} from '../context'

const mocks = vi.hoisted(() => ({
  loadSoundEffects: vi.fn(),
  useSoundEffectPlayback: vi.fn(),
}))

vi.mock('../load-sound-effects', () => ({loadSoundEffects: mocks.loadSoundEffects}))
vi.mock('../use-sound-effect', () => ({useSoundEffectPlayback: mocks.useSoundEffectPlayback}))

const EFFECT = {
  artworkUrl: '/audio/artwork/waves.png',
  durationSeconds: 300,
  id: 'waves',
  source: 'https://storage.pomofi.io/sound-effects/waves.mp3',
  title: {en: 'Waves', ko: '파도 소리'},
} as const

const createPlayback = (): SoundEffectPlayback => ({
  activate: vi.fn(),
  error: () => null,
  playing: () => false,
  ready: () => true,
  setVolume: vi.fn(),
  volume: () => 0.4,
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should keep the global playback controller after a consumer unmounts', async () => {
  const playback = createPlayback()
  mocks.loadSoundEffects.mockResolvedValue([EFFECT])
  mocks.useSoundEffectPlayback.mockReturnValue(playback)
  const [isConsumerVisible, setConsumerVisible] = createSignal(true)
  let observedController: ReturnType<typeof useSoundEffects> | undefined

  const Consumer = () => {
    observedController = useSoundEffects()
    return (
      <Show when={isConsumerVisible()}>
        <span>consumer</span>
      </Show>
    )
  }

  const result = render(() => (
    <SoundEffectsProvider>
      <Consumer />
    </SoundEffectsProvider>
  ))

  await waitFor(() => expect(observedController?.getPlayback(EFFECT.id)).toBe(playback))
  expect(observedController?.effects()).toEqual([EFFECT])
  expect(screen.getByText('consumer')).toBeInTheDocument()

  setConsumerVisible(false)

  expect(screen.queryByText('consumer')).not.toBeInTheDocument()
  expect(observedController?.getPlayback(EFFECT.id)).toBe(playback)
  expect(playback.error()).toBeNull()
  result.unmount()
})

it('should retry global playback on the first user interaction', async () => {
  const playback = createPlayback()
  mocks.loadSoundEffects.mockResolvedValue([EFFECT])
  mocks.useSoundEffectPlayback.mockReturnValue(playback)
  let observedController: ReturnType<typeof useSoundEffects> | undefined

  const Consumer = () => {
    observedController = useSoundEffects()
    return null
  }

  const result = render(() => (
    <SoundEffectsProvider>
      <Consumer />
    </SoundEffectsProvider>
  ))

  await waitFor(() => expect(observedController?.getPlayback(EFFECT.id)).toBe(playback))

  document.dispatchEvent(new Event('pointerdown'))

  expect(playback.activate).toHaveBeenCalledOnce()
  result.unmount()
})

it('should expose a global playback activation command', async () => {
  const playback = createPlayback()
  mocks.loadSoundEffects.mockResolvedValue([EFFECT])
  mocks.useSoundEffectPlayback.mockReturnValue(playback)
  let observedController: ReturnType<typeof useSoundEffects> | undefined

  const Consumer = () => {
    observedController = useSoundEffects()
    return null
  }

  const result = render(() => (
    <SoundEffectsProvider>
      <Consumer />
    </SoundEffectsProvider>
  ))

  await waitFor(() => expect(observedController?.getPlayback(EFFECT.id)).toBe(playback))

  observedController?.activate()

  expect(playback.activate).toHaveBeenCalledOnce()
  result.unmount()
})
