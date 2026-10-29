/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {useAudioPlayback} from '../use-audio-playback'

const setup = () => {
  const audio = document.createElement('audio')
  const play = vi.spyOn(audio, 'play').mockResolvedValue()
  vi.spyOn(audio, 'pause').mockImplementation(() => {})
  vi.spyOn(audio, 'load').mockImplementation(() => {})
  const [source, setSource] = createSignal<string | null>('/music/first.mp3')
  return createRoot((dispose) => ({
    audio,
    dispose,
    play,
    playback: useAudioPlayback({element: () => audio, source}),
    setSource,
  }))
}

afterEach(() => vi.restoreAllMocks())

test('should ignore a rejected play request after the selected source changes', async () => {
  const player = setup()
  const request = Promise.withResolvers<void>()
  player.play.mockReturnValueOnce(request.promise)
  player.playback.play()
  player.setSource('/music/second.mp3')
  request.reject(new Error('Old request failed'))
  await request.promise.catch(() => {})
  expect(player.playback.error()).toBeNull()
  expect(player.playback.status()).toBe('loading')
  player.dispose()
})

test('should expose a playback failure that the user can retry', async () => {
  const player = setup()
  player.play.mockRejectedValueOnce(new Error('Playback blocked'))
  player.playback.play()
  await Promise.resolve()
  expect(player.playback.status()).toBe('error')
  expect(player.playback.error()).toBe('playback')
  player.dispose()
})

test('should defer seeking without metadata and clamp it to the real duration', () => {
  const player = setup()
  player.playback.seek(20)
  expect(player.audio.currentTime).toBe(0)
  Object.defineProperty(player.audio, 'duration', {value: 12})
  player.playback.seek(20)
  expect(player.audio.currentTime).toBe(12)
  player.playback.seek(-5)
  expect(player.audio.currentTime).toBe(0)
  player.dispose()
})
