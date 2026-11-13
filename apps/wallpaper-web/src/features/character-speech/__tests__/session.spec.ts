/** @vitest-environment node */
import {expect, test, vi} from 'vitest'
import {createSpeechSession} from '../session'
import type {CreateSpeechSessionOptions, SpeechObserver} from '../types'

const setup = () => {
  const source = {
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    onended: null as (() => void) | null,
    start: vi.fn(),
    stop: vi.fn(),
  }
  const audio = {
    duration: 1,
    getChannelData: () => new Float32Array(1000).fill(0.1),
    sampleRate: 1000,
  } as unknown as AudioBuffer
  const context = {
    close: vi.fn().mockResolvedValue(undefined),
    createBufferSource: vi.fn(() => source),
    currentTime: 0,
    decodeAudioData: vi.fn().mockResolvedValue(audio),
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
  }
  const clip = {
    audio: new Blob(['mp3'], {type: 'audio/mpeg'}),
    mouth: {duration: 1, frames: new Float32Array(102), step: 0.02},
  }
  const synthesis = {dispose: vi.fn(), generate: vi.fn().mockResolvedValue(clip.audio)}
  const options = {
    cache: {
      read: vi.fn().mockResolvedValue({ok: true, value: clip}),
      remove: vi.fn().mockResolvedValue({ok: true, value: undefined}),
      write: vi.fn().mockResolvedValue({ok: true, value: undefined}),
    },
    context: context as unknown as CreateSpeechSessionOptions['context'],
    createSynthesis: vi.fn(() => synthesis),
    fetch: vi.fn(),
    frames: {cancel: vi.fn(), request: vi.fn(() => 1)},
    getCacheKey: vi.fn().mockResolvedValue('custom-key'),
  } satisfies CreateSpeechSessionOptions
  const observer = {onMouth: vi.fn(), onStatus: vi.fn()} satisfies SpeechObserver
  return {clip, context, observer, options, source, synthesis}
}

test('should play cached speech without a worker and release owned audio resources', async () => {
  const {context, observer, options, source} = setup()
  const session = createSpeechSession(options)
  const pending = session.speak('직접 입력', new AbortController().signal, observer)
  expect(context.resume).toHaveBeenCalledOnce()
  await vi.waitFor(() => expect(source.start).toHaveBeenCalledOnce(), {interval: 1})
  expect(options.createSynthesis).not.toHaveBeenCalled()
  expect(observer.onStatus).toHaveBeenLastCalledWith({phase: 'playing'})
  source.onended?.()
  expect(await pending).toEqual({ok: true})
  expect(source.disconnect).toHaveBeenCalledOnce()
  expect(observer.onMouth).toHaveBeenLastCalledWith(null)
  session.dispose()
  expect(context.close).toHaveBeenCalledOnce()
})

test('should replace a failed synthesis client on the next request', async () => {
  const {observer, options, source, synthesis} = setup()
  options.cache.read.mockResolvedValue({ok: true, value: null})
  synthesis.generate.mockRejectedValueOnce(new Error('Worker failed'))
  const session = createSpeechSession(options)
  expect(await session.speak('처음', new AbortController().signal, observer)).toEqual({
    error: 'unavailable',
    ok: false,
  })
  expect(synthesis.dispose).toHaveBeenCalledOnce()
  const pending = session.speak('다음', new AbortController().signal, observer)
  await vi.waitFor(() => expect(source.start).toHaveBeenCalledOnce(), {interval: 1})
  expect(options.createSynthesis).toHaveBeenCalledTimes(2)
  source.onended?.()
  expect(await pending).toEqual({ok: true})
  session.dispose()
})

test('should cancel a pending generation on disposal without storing or playing late audio', async () => {
  const {clip, context, observer, options, source, synthesis} = setup()
  options.cache.read.mockResolvedValue({ok: true, value: null})
  const generated = Promise.withResolvers<Blob>()
  synthesis.generate.mockReturnValue(generated.promise)
  const session = createSpeechSession(options)
  const pending = session.speak('대기', new AbortController().signal, observer)
  await vi.waitFor(() => expect(synthesis.generate).toHaveBeenCalledOnce(), {interval: 1})
  session.dispose()
  expect(synthesis.generate.mock.calls[0]![1].aborted).toBe(true)
  generated.resolve(clip.audio)
  expect(await pending).toEqual({error: 'cancelled', ok: false})
  expect(options.cache.write).not.toHaveBeenCalled()
  expect(source.start).not.toHaveBeenCalled()
  expect(context.close).toHaveBeenCalledOnce()
})

test('should stop active playback and release the mouth when disposed', async () => {
  const {observer, options, source} = setup()
  const session = createSpeechSession(options)
  const pending = session.speak('재생', new AbortController().signal, observer)
  await vi.waitFor(() => expect(source.start).toHaveBeenCalledOnce(), {interval: 1})
  session.dispose()
  expect(await pending).toEqual({error: 'cancelled', ok: false})
  expect(source.stop).toHaveBeenCalledOnce()
  expect(observer.onMouth).toHaveBeenLastCalledWith(null)
})

test('should unlock audio during the user gesture without downloading or starting speech', async () => {
  const {context, options, source} = setup()
  const session = createSpeechSession(options)
  await session.unlock()
  expect(context.resume).toHaveBeenCalledOnce()
  expect(options.fetch).not.toHaveBeenCalled()
  expect(options.createSynthesis).not.toHaveBeenCalled()
  expect(source.start).not.toHaveBeenCalled()
  session.dispose()
})
