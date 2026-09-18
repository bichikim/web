/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {createLoopPlayer} from '../../loop-player'
import {useSoundEffectPlayback} from '../use-sound-effect'

vi.mock('../../loop-player', () => ({createLoopPlayer: vi.fn()}))

const EFFECT = {
  artworkUrl: '/audio/artwork/waves.png',
  durationSeconds: 300,
  id: 'waves',
  source: 'https://storage.pomofi.io/sound-effects/waves.mp3',
  title: {en: 'Waves', ko: '파도 소리'},
} as const

const VOLUME_STORAGE_KEY = 'pomo:sound-effect-volume:v1:waves'

const createPlayback = () => ({
  close: vi.fn(async () => undefined),
  play: vi.fn(async () => undefined),
  seek: vi.fn(async () => undefined),
  setVolume: vi.fn(),
  stop: vi.fn(),
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

it('should autoplay a ready effect and resume after its volume leaves zero', async () => {
  const playback = createPlayback()
  let onReady: ((duration: number) => void) | undefined
  vi.mocked(createLoopPlayer).mockImplementation((_url, _onStatus, ready) => {
    onReady = ready
    return playback
  })

  const root = createRoot((dispose) => ({
    controller: useSoundEffectPlayback(() => EFFECT),
    dispose,
  }))
  await Promise.resolve()
  onReady?.(EFFECT.durationSeconds)
  await Promise.resolve()

  expect(playback.setVolume).toHaveBeenCalledWith(0.4)
  expect(playback.play).toHaveBeenCalledOnce()

  root.controller.setVolume(0)

  expect(playback.setVolume).toHaveBeenLastCalledWith(0)
  expect(playback.stop).toHaveBeenCalledOnce()
  expect(root.controller.playing()).toBe(false)

  root.controller.setVolume(0.2)
  await Promise.resolve()

  expect(playback.play).toHaveBeenCalledTimes(2)
  root.dispose()
})

it('should restore the saved volume before starting the effect', async () => {
  localStorage.setItem(VOLUME_STORAGE_KEY, '0.65')
  const playback = createPlayback()
  let onReady: ((duration: number) => void) | undefined
  vi.mocked(createLoopPlayer).mockImplementation((_url, _onStatus, ready) => {
    onReady = ready
    return playback
  })

  const root = createRoot((dispose) => ({
    controller: useSoundEffectPlayback(() => EFFECT),
    dispose,
  }))
  await Promise.resolve()

  expect(root.controller.volume()).toBe(0.65)
  expect(playback.setVolume).toHaveBeenCalledWith(0.65)

  onReady?.(EFFECT.durationSeconds)
  await Promise.resolve()

  expect(playback.play).toHaveBeenCalledOnce()
  root.dispose()
})

it('should ignore duplicate activation while the effect is starting', async () => {
  const playRequest = Promise.withResolvers<undefined>()
  const playback = createPlayback()
  playback.play.mockReturnValue(playRequest.promise)
  let onReady: ((duration: number) => void) | undefined
  vi.mocked(createLoopPlayer).mockImplementation((_url, _onStatus, ready) => {
    onReady = ready
    return playback
  })

  const root = createRoot((dispose) => ({
    controller: useSoundEffectPlayback(() => EFFECT),
    dispose,
  }))
  await Promise.resolve()
  onReady?.(EFFECT.durationSeconds)
  await Promise.resolve()

  root.controller.activate()

  expect(playback.play).toHaveBeenCalledOnce()
  playRequest.resolve(undefined)
  await Promise.resolve()
  root.dispose()
})

it('should persist a changed volume for the next app entry', async () => {
  const playback = createPlayback()
  vi.mocked(createLoopPlayer).mockImplementation(() => playback)

  const root = createRoot((dispose) => ({
    controller: useSoundEffectPlayback(() => EFFECT),
    dispose,
  }))
  await Promise.resolve()

  root.controller.setVolume(0.7)

  expect(localStorage.getItem(VOLUME_STORAGE_KEY)).toBe('0.7')
  root.dispose()
})
