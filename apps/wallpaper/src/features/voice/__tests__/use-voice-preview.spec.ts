/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {useVoicePreview} from '../use-voice-preview'

const {client} = vi.hoisted(() => ({
  client: {dispose: vi.fn(), play: vi.fn(), prepare: vi.fn()},
}))
vi.mock('../client', () => ({createVoiceClient: () => client}))
afterEach(() => vi.resetAllMocks())

it('should report playback failure instead of silently cancelling the stream', async () => {
  const prepared = Promise.withResolvers<{sampleRate: number; samples: Float32Array}>()
  let signal: AbortSignal | null = null
  client.prepare.mockImplementationOnce((_, __, request, observer) => {
    signal = request
    request.addEventListener('abort', () => prepared.reject(request.reason), {once: true})
    observer.audio({sampleRate: 48000, samples: Float32Array.of(0.1)})
    return prepared.promise
  })
  client.play.mockRejectedValueOnce(new Error('출력 장치 오류'))
  const hook = renderHook(() => useVoicePreview(() => DEFAULT_POFFO_VOICE))
  await hook.result.play()
  expect(signal!.aborted).toBe(true)
  expect(hook.result.error()).toBe('출력 장치 오류')
  expect(hook.result.status()).toBe('idle')
  hook.cleanup()
})

it('should stop queued streamed audio when generation fails', async () => {
  let signal: AbortSignal | null = null
  client.prepare.mockImplementationOnce(async (_, __, request, observer) => {
    signal = request
    observer.audio({sampleRate: 48000, samples: Float32Array.of(0.1)})
    throw new Error('연결이 끊겼어요.')
  })
  client.play.mockImplementationOnce(
    (_, __, request) =>
      new Promise<void>((resolve) => {
        request.addEventListener('abort', () => resolve(), {once: true})
      }),
  )
  const hook = renderHook(() => useVoicePreview(() => DEFAULT_POFFO_VOICE))
  await hook.result.play()
  expect(signal!.aborted).toBe(true)
  expect(hook.result.error()).toBe('연결이 끊겼어요.')
  hook.cleanup()
})
