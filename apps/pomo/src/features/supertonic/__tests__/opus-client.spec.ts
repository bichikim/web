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

it('should terminate the Worker when transferring samples fails', async () => {
  workerMocks.postMessage.mockImplementationOnce(() => {
    throw new DOMException('detached buffer', 'DataCloneError')
  })

  await expect(createOpusBlob({sampleRate: 24_000, samples: Float32Array.of(0.1)})).rejects.toThrow(
    'detached buffer',
  )
  expect(workerMocks.terminate).toHaveBeenCalledOnce()
})
