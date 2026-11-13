/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {createSynthesis, type SynthesisClient, type VoiceAudio} from '../synthesis'
import {createLiveSynthesis} from '../live-synthesis'
import {useVoicePreview} from '../use-voice-preview'
import {AudioRuntime} from './fixtures/audio-runtime'

vi.mock('../synthesis', () => ({createSynthesis: vi.fn()}))
vi.mock('../live-synthesis', () => ({createLiveSynthesis: vi.fn()}))

const audio: VoiceAudio = {sampleRate: 10, samples: new Float32Array(5)}
const generate = vi.fn<SynthesisClient['generate']>()
const dispose = vi.fn()
let report: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.stubGlobal('AudioContext', AudioRuntime)
  vi.mocked(createSynthesis).mockReturnValue({dispose, generate})
  vi.mocked(createLiveSynthesis).mockReturnValue({dispose: vi.fn(), generate: vi.fn()})
  report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  generate.mockResolvedValue(audio)
})

afterEach(() => {
  cleanup()
  AudioRuntime.instances = []
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

it('should stop playing and queued chunks without reporting a preview failure', async () => {
  generate.mockImplementationOnce(async (_, __, ___, observer) => {
    observer.audio?.(audio)
    observer.audio?.(audio)
    return audio
  })
  const hook = renderHook(() => useVoicePreview(() => DEFAULT_POFFO_VOICE))
  const playing = hook.result.play()
  await Promise.resolve()
  const runtime = AudioRuntime.instances[0]
  expect(runtime.sources[0].start).toHaveBeenCalledWith(3.25)
  expect(runtime.sources[1].start).toHaveBeenCalledWith(3.75)
  await hook.result.play()
  await playing
  expect(hook.result.status()).toBe('idle')
  expect(hook.result.error()).toBeNull()
  expect(report).not.toHaveBeenCalled()
  for (const source of runtime.sources) {
    expect(source.stop).toHaveBeenCalledOnce()
    expect(source.disconnect).toHaveBeenCalledOnce()
    expect(source.onended).toBeNull()
  }
})

it('should stop before audio-context resume without reporting a failure', async () => {
  generate.mockImplementationOnce(async (_, __, ___, observer) => {
    observer.audio?.(audio)
    return audio
  })
  const hook = renderHook(() => useVoicePreview(() => DEFAULT_POFFO_VOICE))
  const playing = hook.result.play()
  await hook.result.play()
  await playing
  expect(AudioRuntime.instances[0].sources[0].start).not.toHaveBeenCalled()
  expect(hook.result.error()).toBeNull()
  expect(report).not.toHaveBeenCalled()
})

it('should stop on a settings change without reporting a failure', async () => {
  const [voice, setVoice] = createSignal(DEFAULT_POFFO_VOICE)
  const hook = renderHook(() => useVoicePreview(voice))
  const playing = hook.result.play()
  await Promise.resolve()
  await vi.waitFor(
    () => expect(AudioRuntime.instances[0].sources[0].start).toHaveBeenCalledOnce(),
    {interval: 1},
  )
  setVoice({...voice(), volume: 25})
  await playing
  expect(AudioRuntime.instances[0].sources[0].stop).toHaveBeenCalledOnce()
  expect(hook.result.status()).toBe('idle')
  expect(hook.result.error()).toBeNull()
  expect(report).not.toHaveBeenCalled()
})

it('should preserve a replacement preview while the stopped request settles', async () => {
  const hook = renderHook(() => useVoicePreview(() => DEFAULT_POFFO_VOICE))
  const first = hook.result.play()
  await Promise.resolve()
  const stopping = hook.result.play()
  const replacement = hook.result.play()
  await stopping
  await first
  expect(hook.result.status()).toBe('playing')
  expect(hook.result.error()).toBeNull()
  expect(report).not.toHaveBeenCalled()
  const runtime = AudioRuntime.instances[0]
  expect(runtime.sources[1].stop).not.toHaveBeenCalled()
  runtime.sources[1].onended!()
  await replacement
  expect(hook.result.status()).toBe('idle')
})

it('should dispose active playback without reporting a failure', async () => {
  const hook = renderHook(() => useVoicePreview(() => DEFAULT_POFFO_VOICE))
  const playing = hook.result.play()
  await Promise.resolve()
  await vi.waitFor(
    () => expect(AudioRuntime.instances[0].sources[0].start).toHaveBeenCalledOnce(),
    {interval: 1},
  )
  hook.cleanup()
  await playing
  expect(AudioRuntime.instances[0].sources[0].stop).toHaveBeenCalledOnce()
  expect(AudioRuntime.instances[0].close).toHaveBeenCalledOnce()
  expect(dispose).toHaveBeenCalledOnce()
  expect(hook.result.error()).toBeNull()
  expect(report).not.toHaveBeenCalled()
})

it('should report a genuine audio start failure and abort generation', async () => {
  let signal: AbortSignal | undefined
  generate.mockImplementationOnce((_, __, request, observer) => {
    signal = request
    observer.audio?.(audio)
    observer.audio?.(audio)
    AudioRuntime.instances[0].sources[0].start.mockImplementationOnce(() => {
      throw new Error('출력 장치 오류')
    })
    return new Promise((_, reject) => {
      request.addEventListener('abort', () => reject(request.reason), {once: true})
    })
  })
  const hook = renderHook(() => useVoicePreview(() => DEFAULT_POFFO_VOICE))
  await hook.result.play()
  expect(signal?.aborted).toBe(true)
  expect(hook.result.status()).toBe('idle')
  expect(hook.result.error()).toBe('출력 장치 오류')
  expect(report).toHaveBeenCalledWith('Poffo voice preview failed', expect.any(Error))
})

it('should report generation failure and stop audio already queued', async () => {
  generate.mockImplementationOnce(async (_, __, ___, observer) => {
    observer.audio?.(audio)
    observer.audio?.(audio)
    throw new Error('연결이 끊겼어요.')
  })
  const hook = renderHook(() => useVoicePreview(() => DEFAULT_POFFO_VOICE))
  await hook.result.play()
  expect(hook.result.error()).toBe('연결이 끊겼어요.')
  expect(report).toHaveBeenCalledTimes(1)
  for (const source of AudioRuntime.instances[0].sources) {
    expect(source.stop).toHaveBeenCalledOnce()
    expect(source.disconnect).toHaveBeenCalledOnce()
  }
})

it('should ignore a stopped request failure after a replacement starts', async () => {
  const generated = Promise.withResolvers<VoiceAudio>()
  generate.mockImplementationOnce(async (_, __, ___, observer) => {
    observer.audio?.(audio)
    return generated.promise
  })
  const hook = renderHook(() => useVoicePreview(() => DEFAULT_POFFO_VOICE))
  const first = hook.result.play()
  await Promise.resolve()
  await hook.result.play()
  const replacement = hook.result.play()
  await Promise.resolve()
  generated.reject(new Error('이전 요청 실패'))
  await first
  expect(hook.result.status()).toBe('playing')
  expect(hook.result.error()).toBeNull()
  expect(report).not.toHaveBeenCalled()
  AudioRuntime.instances[0].sources[1].onended!()
  await replacement
})

it('should cancel generation before audio arrives without reporting a failure', async () => {
  generate.mockImplementationOnce((_, __, request, observer) => {
    observer.status('generating')
    return new Promise((_, reject) => {
      request.addEventListener('abort', () => reject(request.reason), {once: true})
    })
  })
  const hook = renderHook(() => useVoicePreview(() => DEFAULT_POFFO_VOICE))
  const generating = hook.result.play()
  expect(hook.result.status()).toBe('generating')
  await hook.result.play()
  await generating
  expect(hook.result.status()).toBe('idle')
  expect(hook.result.error()).toBeNull()
  expect(report).not.toHaveBeenCalled()
  expect(AudioRuntime.instances).toHaveLength(0)
})

it('should retain the replacement failure after the previous generation settles', async () => {
  const generated = Promise.withResolvers<VoiceAudio>()
  generate.mockImplementationOnce(async (_, __, ___, observer) => {
    observer.audio?.(audio)
    return generated.promise
  })
  const hook = renderHook(() => useVoicePreview(() => DEFAULT_POFFO_VOICE))
  const first = hook.result.play()
  await Promise.resolve()
  await hook.result.play()
  generate.mockRejectedValueOnce(new Error('새 요청 실패'))
  await hook.result.play()
  expect(hook.result.error()).toBe('새 요청 실패')
  generated.reject(new Error('이전 요청 실패'))
  await first
  expect(hook.result.error()).toBe('새 요청 실패')
  expect(report).toHaveBeenCalledTimes(1)
})

it('should ignore an obsolete playback failure after a replacement starts', async () => {
  const generated = Promise.withResolvers<VoiceAudio>()
  let signal: AbortSignal | undefined
  generate.mockImplementationOnce(async (_, __, request, observer) => {
    signal = request
    observer.audio?.(audio)
    AudioRuntime.instances[0].sources[0].start.mockImplementationOnce(() => {
      throw new Error('이전 출력 장치 오류')
    })
    return generated.promise
  })
  const hook = renderHook(() => useVoicePreview(() => DEFAULT_POFFO_VOICE))
  const first = hook.result.play()
  await vi.waitFor(() => expect(signal?.aborted).toBe(true), {interval: 1})
  await hook.result.play()
  const replacement = hook.result.play()
  await Promise.resolve()
  generated.reject(signal?.reason)
  await first
  expect(hook.result.error()).toBeNull()
  expect(hook.result.status()).toBe('playing')
  expect(report).not.toHaveBeenCalled()
  AudioRuntime.instances[0].sources[1].onended!()
  await replacement
})
