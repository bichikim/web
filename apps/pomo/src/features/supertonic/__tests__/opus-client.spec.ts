import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {OpusWorkerRequest, OpusWorkerResponse} from '../opus-messages'
import {createOpusBlob} from '../opus-client'

type WorkerListener = (event: ErrorEvent | MessageEvent<OpusWorkerResponse>) => void

const workerMocks = {
  listeners: new Map<string, WorkerListener>(),
  postMessage: vi.fn<(message: OpusWorkerRequest, transfer: Transferable[]) => void>(),
  terminate: vi.fn(),
}

const dispatch = (type: string, event: ErrorEvent | MessageEvent<OpusWorkerResponse>) => {
  const listener = workerMocks.listeners.get(type)

  if (listener === undefined) {
    throw new Error(`Expected a ${type} Worker listener.`)
  }

  listener(event)
}

beforeEach(() => {
  vi.clearAllMocks()
  workerMocks.listeners.clear()
  vi.stubGlobal(
    'Worker',
    vi.fn(function WorkerMock() {
      return {
        addEventListener: (type: string, listener: WorkerListener) => {
          workerMocks.listeners.set(type, listener)
        },
        postMessage: workerMocks.postMessage,
        terminate: workerMocks.terminate,
      }
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should transfer owned PCM samples and resolve the encoded audio', async () => {
  const samples = Float32Array.of(0.1, 0.2)
  const result = createOpusBlob({sampleRate: 24_000, samples})
  const [request, transfer] = workerMocks.postMessage.mock.calls[0] ?? []

  expect(request?.sampleRate).toBe(24_000)
  expect(request?.samples).not.toBe(samples)
  expect(request?.samples.buffer).toBe(samples.buffer)
  expect(transfer).toEqual([request?.samples.buffer])

  const audio = new Blob(['opus'], {type: 'audio/ogg; codecs=opus'})
  dispatch('message', new MessageEvent('message', {data: {audio, type: 'complete'}}))

  await expect(result).resolves.toEqual(audio)
  expect(workerMocks.terminate).toHaveBeenCalledOnce()
})

it('should copy a partial PCM view before transferring it', async () => {
  const backingSamples = Float32Array.of(9, 0.1, 0.2, 9)
  const samples = backingSamples.subarray(1, 3)
  const result = createOpusBlob({sampleRate: 24_000, samples})
  const [request, transfer] = workerMocks.postMessage.mock.calls[0] ?? []

  expect(request?.samples).toEqual(Float32Array.of(0.1, 0.2))
  expect(request?.samples.buffer).not.toBe(samples.buffer)
  expect(transfer).toEqual([request?.samples.buffer])

  const audio = new Blob(['opus'])
  dispatch('message', new MessageEvent('message', {data: {audio, type: 'complete'}}))

  await expect(result).resolves.toEqual(audio)
})

it('should reject an encoder error and terminate the Worker once', async () => {
  const result = createOpusBlob({sampleRate: 24_000, samples: Float32Array.of(0.1)})

  dispatch('message', new MessageEvent('message', {data: {detail: 'encode failed', type: 'error'}}))
  dispatch('error', new ErrorEvent('error', {message: 'late failure'}))

  await expect(result).rejects.toThrow('encode failed')
  expect(workerMocks.terminate).toHaveBeenCalledOnce()
})

it('should terminate the Worker when encoding is aborted', async () => {
  const abortController = new AbortController()
  const result = createOpusBlob({
    sampleRate: 24_000,
    samples: Float32Array.of(0.1),
    signal: abortController.signal,
  })

  abortController.abort()

  await expect(result).rejects.toMatchObject({name: 'AbortError'})
  expect(workerMocks.terminate).toHaveBeenCalledOnce()
})

it('should reject before creating a Worker when already aborted with a non-error reason', async () => {
  const abortController = new AbortController()
  abortController.abort('cancelled')

  await expect(
    createOpusBlob({
      sampleRate: 24_000,
      samples: Float32Array.of(0.1),
      signal: abortController.signal,
    }),
  ).rejects.toMatchObject({name: 'AbortError'})
  expect(workerMocks.postMessage).not.toHaveBeenCalled()
})

it('should ignore an abort callback after its signal option is removed', async () => {
  const abortController = new AbortController()
  let signalReads = 0
  const options = {
    sampleRate: 24_000,
    samples: Float32Array.of(0.1),
    get signal() {
      signalReads += 1
      return signalReads <= 2 ? abortController.signal : undefined
    },
  }
  const result = createOpusBlob(options)

  abortController.abort()
  const audio = new Blob(['opus'])
  dispatch('message', new MessageEvent('message', {data: {audio, type: 'complete'}}))

  await expect(result).resolves.toEqual(audio)
})

it('should ignore an unknown Worker response and accept a later completion', async () => {
  const result = createOpusBlob({sampleRate: 24_000, samples: Float32Array.of(0.1)})

  dispatch(
    'message',
    new MessageEvent('message', {
      data: {type: 'unknown'} as unknown as OpusWorkerResponse,
    }),
  )
  const audio = new Blob(['opus'])
  dispatch('message', new MessageEvent('message', {data: {audio, type: 'complete'}}))

  await expect(result).resolves.toEqual(audio)
})

it('should use the Worker failure fallback for an error event without a message', async () => {
  const result = createOpusBlob({sampleRate: 24_000, samples: Float32Array.of(0.1)})

  dispatch('error', new ErrorEvent('error'))

  await expect(result).rejects.toThrow('Opus 인코딩 Worker를 실행하지 못했어요.')
})

it('should reject a Worker response that cannot be decoded', async () => {
  const result = createOpusBlob({sampleRate: 24_000, samples: Float32Array.of(0.1)})

  dispatch('messageerror', new MessageEvent('messageerror'))

  await expect(result).rejects.toThrow('Opus 인코딩 Worker 응답을 읽지 못했어요.')
})

it('should terminate the Worker when transferring samples fails', async () => {
  workerMocks.postMessage.mockImplementationOnce(() => {
    throw new DOMException('detached buffer', 'DataCloneError')
  })

  await expect(createOpusBlob({sampleRate: 24_000, samples: Float32Array.of(0.1)})).rejects.toThrow(
    'detached buffer',
  )
  expect(workerMocks.terminate).toHaveBeenCalledOnce()
})

it('should preserve an Error thrown while transferring samples', async () => {
  const transferError = new Error('transfer failed')
  workerMocks.postMessage.mockImplementationOnce(() => {
    throw transferError
  })

  await expect(createOpusBlob({sampleRate: 24_000, samples: Float32Array.of(0.1)})).rejects.toBe(
    transferError,
  )
})

it('should use the Worker failure fallback for a non-error transfer failure', async () => {
  const transferFailure = new (class TransferFailure {})()
  workerMocks.postMessage.mockImplementationOnce(() => {
    throw transferFailure
  })

  await expect(
    createOpusBlob({sampleRate: 24_000, samples: Float32Array.of(0.1)}),
  ).rejects.toMatchObject({cause: transferFailure})
})
