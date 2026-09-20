/** @vitest-environment jsdom */

import {cleanup, render, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import type {SoundEffectPlayback} from '../features/sound-effects/use-sound-effect'
import {SoundEffectsProvider} from '../features/sound-effects/SoundEffectsProvider'
import {useSoundEffects} from '../features/sound-effects/context'

const mocks = vi.hoisted(() => ({
  loadSoundEffects: vi.fn(),
  useSoundEffectPlayback: vi.fn(),
}))

vi.mock('../features/sound-effects/load-sound-effects', () => ({
  loadSoundEffects: mocks.loadSoundEffects,
}))
vi.mock('../features/sound-effects/use-sound-effect', () => ({
  useSoundEffectPlayback: mocks.useSoundEffectPlayback,
}))

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
  stop: vi.fn(),
  volume: () => 0.4,
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.clearAllMocks()
})

it('should unlock playback on the first user gesture even when the catalog is still loading', async () => {
  const catalog = Promise.withResolvers<typeof EFFECT[]>()
  const playback = createPlayback()
  mocks.loadSoundEffects.mockReturnValue(catalog.promise)
  mocks.useSoundEffectPlayback.mockReturnValue(playback)
  let observedController: ReturnType<typeof useSoundEffects> | undefined

  const Consumer = () => {
    observedController = useSoundEffects()
    return null
  }

  const view = render(() => (
    <SoundEffectsProvider>
      <Consumer />
    </SoundEffectsProvider>
  ))

  document.dispatchEvent(new Event('pointerdown'))
  expect(playback.activate).not.toHaveBeenCalled()

  catalog.resolve([EFFECT])
  await waitFor(() => expect(observedController?.getPlayback(EFFECT.id)).toBe(playback))

  expect(playback.activate).toHaveBeenCalledOnce()

  view.unmount()
})
