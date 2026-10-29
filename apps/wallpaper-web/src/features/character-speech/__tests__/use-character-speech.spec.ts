/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {createBrowserSpeechSession} from '../browser'
import {useCharacterSpeech} from '../use-character-speech'
import type {SpeechObserver, SpeechResult} from '../types'

vi.mock('../browser', () => ({createBrowserSpeechSession: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should load speech only on demand, update mouth, finish and reuse the session', async () => {
  const first = Promise.withResolvers<SpeechResult>()
  const speak = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue({ok: true})
  const dispose = vi.fn()
  vi.mocked(createBrowserSpeechSession).mockReturnValue({
    dispose,
    speak,
    unlock: vi.fn().mockResolvedValue(undefined),
  })
  const hook = renderHook(useCharacterSpeech)
  expect(createBrowserSpeechSession).not.toHaveBeenCalled()
  await hook.result.speak('   ')
  await hook.result.speak('가'.repeat(151))
  expect(createBrowserSpeechSession).not.toHaveBeenCalled()
  const playback = hook.result.speak(' 안녕 ')
  expect(speak.mock.calls[0]![0]).toBe('안녕')
  const observer: SpeechObserver = speak.mock.calls[0]![2]
  observer.onStatus({percent: 20, phase: 'downloading'})
  expect(hook.result.status()).toEqual({percent: 20, phase: 'downloading'})
  observer.onMouth({form: 1, open: 0.5})
  expect(hook.result.mouth()).toEqual({form: 1, open: 0.5})
  expect(hook.result.busy()).toBe(true)
  first.resolve({ok: true})
  await playback
  expect(hook.result.status()).toEqual({phase: 'idle'})
  expect(hook.result.mouth()).toBeNull()
  await hook.result.speak('한 번 더')
  expect(createBrowserSpeechSession).toHaveBeenCalledOnce()
  hook.cleanup()
  expect(dispose).toHaveBeenCalledOnce()
})

test('should cancel obsolete speech and ignore late mouth or status callbacks', async () => {
  const first = Promise.withResolvers<SpeechResult>()
  const second = Promise.withResolvers<SpeechResult>()
  const speak = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  vi.mocked(createBrowserSpeechSession).mockReturnValue({
    dispose: vi.fn(),
    speak,
    unlock: vi.fn().mockResolvedValue(undefined),
  })
  const hook = renderHook(useCharacterSpeech)
  const previous = hook.result.speak('처음')
  const next = hook.result.speak('다음')
  const signal: AbortSignal = speak.mock.calls[0]![1]
  const stale: SpeechObserver = speak.mock.calls[0]![2]
  expect(signal.aborted).toBe(true)
  stale.onMouth({form: 1, open: 1})
  stale.onStatus({phase: 'playing'})
  first.resolve({error: 'cancelled', ok: false})
  await previous
  expect(hook.result.mouth()).toBeNull()
  expect(hook.result.status()).toEqual({phase: 'preparing'})
  hook.result.stop()
  expect((speak.mock.calls[1]![1] as AbortSignal).aborted).toBe(true)
  second.resolve({ok: true})
  await next
  expect(hook.result.status()).toEqual({phase: 'idle'})
})

test('should expose synthesis failure and allow another attempt', async () => {
  const speak = vi
    .fn()
    .mockResolvedValueOnce({error: 'unavailable', ok: false})
    .mockResolvedValue({ok: true})
  vi.mocked(createBrowserSpeechSession).mockReturnValue({
    dispose: vi.fn(),
    speak,
    unlock: vi.fn().mockResolvedValue(undefined),
  })
  const hook = renderHook(useCharacterSpeech)
  await hook.result.speak('안녕')
  expect(hook.result.status()).toEqual({phase: 'error'})
  expect(hook.result.busy()).toBe(false)
  await hook.result.speak('다시')
  expect(hook.result.status()).toEqual({phase: 'idle'})
})

test('should unlock audio once on demand and tolerate unavailable audio without interrupting navigation', () => {
  const unlock = vi.fn().mockResolvedValue(undefined)
  vi.mocked(createBrowserSpeechSession).mockReturnValue({dispose: vi.fn(), speak: vi.fn(), unlock})
  const hook = renderHook(useCharacterSpeech)
  hook.result.unlock()
  expect(unlock).toHaveBeenCalledOnce()
  expect(hook.result.status()).toEqual({phase: 'idle'})
  hook.cleanup()
  hook.result.unlock()
  expect(unlock).toHaveBeenCalledOnce()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.mocked(createBrowserSpeechSession).mockImplementation(() => {
    throw new Error('Unavailable')
  })
  const unavailable = renderHook(useCharacterSpeech)
  expect(() => unavailable.result.unlock()).not.toThrow()
  vi.mocked(console.warn).mockRestore()
})
