import {beforeEach, expect, it, vi} from 'vitest'

import type {OpusWorkerRequest, OpusWorkerResponse} from '../opus-messages'

type WorkerMessageListener = (event: MessageEvent<OpusWorkerRequest>) => void

const encoderMocks = vi.hoisted(() => ({encode: vi.fn()}))

vi.mock('../opus', () => ({encodeOpusBlob: encoderMocks.encode}))

const loadWorker = async () => {
  let messageListener: WorkerMessageListener | null = null
  const postMessage = vi.fn<(response: OpusWorkerResponse) => void>()

  vi.stubGlobal('self', {
    addEventListener: (type: string, listener: WorkerMessageListener) => {
      if (type === 'message') {
        messageListener = listener
      }
    },
    postMessage,
  })
  await import('../opus-worker')

  return {
    dispatch: (request: OpusWorkerRequest) => {
      if (messageListener === null) {
        throw new Error('Expected the Opus Worker message listener to be registered.')
      }

      messageListener({data: request} as MessageEvent<OpusWorkerRequest>)
    },
    postMessage,
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

it('should encode PCM audio and return a Blob', async () => {
  const audio = new Blob(['opus'], {type: 'audio/ogg; codecs=opus'})
  encoderMocks.encode.mockResolvedValue(audio)
  const worker = await loadWorker()
  const samples = Float32Array.of(0.1)

  worker.dispatch({sampleRate: 24_000, samples})

  await vi.waitFor(() => {
    expect(worker.postMessage).toHaveBeenCalledWith({audio, type: 'complete'})
  })
  expect(encoderMocks.encode).toHaveBeenCalledWith(samples, 24_000)
})

it('should resample legacy 44.1 kHz PCM before encoding', async () => {
  encoderMocks.encode.mockResolvedValue(new Blob(['opus']))
  const worker = await loadWorker()
  const samples = new Float32Array(44_100).fill(0.25)

  worker.dispatch({sampleRate: 44_100, samples})

  await vi.waitFor(() => expect(encoderMocks.encode).toHaveBeenCalledOnce())
  const [resampled, sampleRate] = encoderMocks.encode.mock.calls[0] ?? []
  expect(sampleRate).toBe(48_000)
  expect(resampled).toHaveLength(48_000)
  expect(resampled?.[24_000]).toBeCloseTo(0.25)
})

it('should serialize encoder failures', async () => {
  encoderMocks.encode.mockRejectedValue(new Error('encode failed'))
  const worker = await loadWorker()

  worker.dispatch({sampleRate: 24_000, samples: Float32Array.of(0.1)})

  await vi.waitFor(() => {
    expect(worker.postMessage).toHaveBeenCalledWith({detail: 'encode failed', type: 'error'})
  })
})

it('should serialize an unknown encoder failure', async () => {
  encoderMocks.encode.mockRejectedValue(null)
  const worker = await loadWorker()

  worker.dispatch({sampleRate: 24_000, samples: Float32Array.of(0.1)})

  await vi.waitFor(() => {
    expect(worker.postMessage).toHaveBeenCalledWith({
      detail: 'Opus 인코딩 중 알 수 없는 오류가 발생했어요.',
      type: 'error',
    })
  })
})
