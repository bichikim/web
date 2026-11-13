/** @vitest-environment jsdom */

import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createLoopPlayer} from '../../loop-player'
import {SoundEffectsProvider, useSoundEffects} from '..'
import {loadSoundEffects} from '../load-sound-effects'

vi.mock('../../loop-player', () => ({createLoopPlayer: vi.fn()}))
vi.mock('../load-sound-effects', () => ({loadSoundEffects: vi.fn()}))

const EFFECT = {
  artworkUrl: '/audio/artwork/waves.png',
  durationSeconds: 300,
  id: 'waves',
  source: 'https://storage.pomofi.io/sound-effects/waves.mp3',
  title: {en: 'Waves', ko: '파도 소리'},
} as const

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.clearAllMocks()
})

it('should serialize a superseded startup through the real provider and release playback on unmount', async () => {
  const catalog = Promise.withResolvers<ReadonlyArray<typeof EFFECT>>()
  const first = Promise.withResolvers<boolean>()
  const replacement = Promise.withResolvers<boolean>()
  const playback = {
    close: vi.fn(async () => undefined),
    play: vi
      .fn<() => Promise<boolean>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(replacement.promise),
    seek: vi.fn(async () => false),
    setVolume: vi.fn(),
    stop: vi.fn(),
  }
  let onReady: ((duration: number) => void) | undefined
  vi.mocked(createLoopPlayer).mockImplementation((_url, _status, ready) => {
    onReady = ready
    return playback
  })
  vi.mocked(loadSoundEffects).mockReturnValue(catalog.promise)
  const {result, cleanup: dispose} = renderHook(useSoundEffects, {
    wrapper: (props) => <SoundEffectsProvider>{props.children}</SoundEffectsProvider>,
  })
  document.dispatchEvent(new Event('keydown'))
  catalog.resolve([EFFECT])
  await waitFor(() => expect(result.getPlayback(EFFECT.id)).toBeDefined())
  const effect = result.getPlayback(EFFECT.id)!
  onReady?.(EFFECT.durationSeconds)
  expect(playback.play).toHaveBeenCalledOnce()
  result.stop()
  result.activate()
  result.activate()
  expect(playback.play).toHaveBeenCalledOnce()

  first.reject(new Error('Superseded startup failed'))
  await first.promise.catch(() => undefined)
  expect(playback.play).toHaveBeenCalledTimes(2)
  expect(effect.error()).toBeNull()
  expect(effect.playing()).toBe(false)
  replacement.resolve(true)
  await replacement.promise
  expect(effect.playing()).toBe(true)
  expect(effect.ready()).toBe(true)
  expect(effect.volume()).toBe(0.4)
  expect(playback.setVolume).toHaveBeenCalledWith(0.4)
  dispose()
  expect(playback.close).toHaveBeenCalledOnce()
  document.dispatchEvent(new Event('keydown'))
  expect(playback.play).toHaveBeenCalledTimes(2)
})
