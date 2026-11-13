/** @vitest-environment node */
import {expect, test, vi} from 'vitest'
import {createSpeechHandler} from '../create-speech-handler'
import type {SpeechEngine} from '../types'

const setup = () => {
  const audio = {sampleRate: 24000, samples: Float32Array.of(0.1)}
  const generate = vi.fn<SpeechEngine['generate']>().mockResolvedValue(audio)
  const initialize = vi
    .fn<(onProgress: (percent: number) => void) => Promise<SpeechEngine>>()
    .mockResolvedValue({generate})
  const encoded = new Blob(['mp3'], {type: 'audio/mpeg'})
  const encode = vi.fn(async () => encoded)
  const post = vi.fn()
  const onError = vi.fn()
  const handle = createSpeechHandler({encode, initialize, onError, post})
  return {audio, encode, encoded, generate, handle, initialize, onError, post}
}

test('should initialize on demand, suppress duplicate progress and reuse the engine', async () => {
  const worker = setup()
  expect(worker.initialize).not.toHaveBeenCalled()
  worker.initialize.mockImplementationOnce(async (progress) => {
    progress(20)
    progress(20)
    progress(100)
    return {generate: worker.generate}
  })
  await worker.handle({id: 1, text: '처음', type: 'generate'})
  expect(worker.post.mock.calls.map(([message]) => message)).toEqual([
    {id: 1, status: {percent: 0, phase: 'downloading'}, type: 'status'},
    {id: 1, status: {percent: 20, phase: 'downloading'}, type: 'status'},
    {id: 1, status: {percent: 100, phase: 'downloading'}, type: 'status'},
    {id: 1, status: {phase: 'generating'}, type: 'status'},
    {audio: worker.encoded, id: 1, type: 'audio'},
  ])
  await worker.handle({id: 2, text: '다음', type: 'generate'})
  expect(worker.initialize).toHaveBeenCalledOnce()
  expect(worker.generate).toHaveBeenNthCalledWith(2, '다음', expect.any(AbortSignal))
  expect(worker.encode).toHaveBeenCalledWith(worker.audio, expect.any(AbortSignal))
  expect(worker.post).toHaveBeenLastCalledWith({audio: worker.encoded, id: 2, type: 'audio'})
})

test('should serialize requests and skip a queued request cancelled before it starts', async () => {
  const worker = setup()
  const pending = Promise.withResolvers<Awaited<ReturnType<SpeechEngine['generate']>>>()
  const started = Promise.withResolvers<void>()
  worker.generate.mockImplementationOnce(() => {
    started.resolve()
    return pending.promise
  })
  const first = worker.handle({id: 1, text: '처음', type: 'generate'})
  const cancelled = worker.handle({id: 2, text: '취소', type: 'generate'})
  const last = worker.handle({id: 3, text: '마지막', type: 'generate'})
  await started.promise
  expect(worker.generate).toHaveBeenCalledOnce()
  worker.handle({id: 2, type: 'cancel'})
  pending.resolve(worker.audio)
  await Promise.all([first, cancelled, last])
  expect(worker.generate.mock.calls.map(([text]) => text)).toEqual(['처음', '마지막'])
  expect(worker.post.mock.calls.some(([message]) => message.id === 2)).toBe(false)
  expect(worker.onError).not.toHaveBeenCalled()
})

test('should retain initialization when its caller cancels and skip that caller generation', async () => {
  const worker = setup()
  const pending = Promise.withResolvers<SpeechEngine>()
  const started = Promise.withResolvers<void>()
  worker.initialize.mockImplementationOnce(() => {
    started.resolve()
    return pending.promise
  })
  const first = worker.handle({id: 1, text: '취소', type: 'generate'})
  await started.promise
  worker.handle({id: 1, type: 'cancel'})
  const next = worker.handle({id: 2, text: '다음', type: 'generate'})
  pending.resolve({generate: worker.generate})
  await Promise.all([first, next])
  expect(worker.initialize).toHaveBeenCalledOnce()
  expect(worker.generate).toHaveBeenCalledExactlyOnceWith('다음', expect.any(AbortSignal))
  expect(worker.post).toHaveBeenLastCalledWith({audio: worker.encoded, id: 2, type: 'audio'})
  expect(worker.onError).not.toHaveBeenCalled()
})

test('should abort active synthesis and ignore its late samples without encoding them', async () => {
  const worker = setup()
  const pending = Promise.withResolvers<Awaited<ReturnType<SpeechEngine['generate']>>>()
  const started = Promise.withResolvers<void>()
  worker.generate.mockImplementationOnce(() => {
    started.resolve()
    return pending.promise
  })
  const first = worker.handle({id: 1, text: '취소', type: 'generate'})
  await started.promise
  worker.handle({id: 1, type: 'cancel'})
  expect(worker.generate.mock.calls[0]![1].aborted).toBe(true)
  pending.resolve(worker.audio)
  await first
  expect(worker.encode).not.toHaveBeenCalled()
  expect(worker.post.mock.calls.some(([message]) => message.type === 'audio')).toBe(false)
  expect(worker.onError).not.toHaveBeenCalled()
})

test('should ignore late encoded audio after cancellation and retain queue progress', async () => {
  const worker = setup()
  const pending = Promise.withResolvers<Blob>()
  const started = Promise.withResolvers<void>()
  worker.encode.mockImplementationOnce(() => {
    started.resolve()
    return pending.promise
  })
  const first = worker.handle({id: 1, text: '취소', type: 'generate'})
  await started.promise
  worker.handle({id: 1, type: 'cancel'})
  const next = worker.handle({id: 2, text: '다음', type: 'generate'})
  pending.resolve(worker.encoded)
  await Promise.all([first, next])
  expect(worker.post.mock.calls.filter(([message]) => message.type === 'audio')).toEqual([
    [{audio: worker.encoded, id: 2, type: 'audio'}],
  ])
})

test('should retry failed initialization for the next queued request', async () => {
  const worker = setup()
  const failure = new Error('Unavailable model')
  worker.initialize.mockRejectedValueOnce(failure)
  const first = worker.handle({id: 1, text: '처음', type: 'generate'})
  const next = worker.handle({id: 2, text: '재시도', type: 'generate'})
  await Promise.all([first, next])
  expect(worker.onError).toHaveBeenCalledExactlyOnceWith(failure)
  expect(worker.post).toHaveBeenCalledWith({id: 1, type: 'error'})
  expect(worker.initialize).toHaveBeenCalledTimes(2)
  expect(worker.post).toHaveBeenLastCalledWith({audio: worker.encoded, id: 2, type: 'audio'})
})

test('should report synthesis failure and continue with the initialized engine', async () => {
  const worker = setup()
  const failure = new Error('Inference failed')
  worker.generate.mockRejectedValueOnce(failure)
  await worker.handle({id: 1, text: '처음', type: 'generate'})
  await worker.handle({id: 2, text: '다음', type: 'generate'})
  expect(worker.onError).toHaveBeenCalledExactlyOnceWith(failure)
  expect(worker.post).toHaveBeenCalledWith({id: 1, type: 'error'})
  expect(worker.initialize).toHaveBeenCalledOnce()
  expect(worker.post).toHaveBeenLastCalledWith({audio: worker.encoded, id: 2, type: 'audio'})
})

test('should report encoding failure without preventing later requests', async () => {
  const worker = setup()
  const failure = new Error('Encoding failed')
  worker.encode.mockRejectedValueOnce(failure)
  await worker.handle({id: 1, text: '처음', type: 'generate'})
  await worker.handle({id: 2, text: '다음', type: 'generate'})
  expect(worker.onError).toHaveBeenCalledExactlyOnceWith(failure)
  expect(worker.post).toHaveBeenCalledWith({id: 1, type: 'error'})
  expect(worker.initialize).toHaveBeenCalledOnce()
  expect(worker.post).toHaveBeenLastCalledWith({audio: worker.encoded, id: 2, type: 'audio'})
})

test('should isolate worker lifetimes and ignore cancellation of an unknown request', async () => {
  const first = setup()
  const second = setup()
  first.handle({id: 1, type: 'cancel'})
  expect(first.initialize).not.toHaveBeenCalled()
  await first.handle({id: 1, text: '처음', type: 'generate'})
  expect(second.initialize).not.toHaveBeenCalled()
  expect(second.post).not.toHaveBeenCalled()
  await second.handle({id: 1, text: '다음', type: 'generate'})
  expect(first.generate).toHaveBeenCalledExactlyOnceWith('처음', expect.any(AbortSignal))
  expect(second.generate).toHaveBeenCalledExactlyOnceWith('다음', expect.any(AbortSignal))
})
