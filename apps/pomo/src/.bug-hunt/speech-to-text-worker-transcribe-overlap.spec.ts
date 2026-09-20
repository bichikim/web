/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import type {SpeechWorkerRequest, SpeechWorkerResponse} from '../features/speech-to-text/messages'

type WorkerMessageListener = (event: MessageEvent<SpeechWorkerRequest>) => void

const transformers = vi.hoisted(() => ({pipeline: vi.fn(), transcribe: vi.fn()}))

vi.mock('@huggingface/transformers', () => ({pipeline: transformers.pipeline}))

const loadWorker = async () => {
  let messageListener: WorkerMessageListener | null = null
  const postMessage = vi.fn<(response: SpeechWorkerResponse) => void>()

  vi.stubGlobal('self', {
    addEventListener: (type: string, listener: WorkerMessageListener) => {
      if (type === 'message') {
        messageListener = listener
      }
    },
    postMessage,
  })
  await import('../features/speech-to-text/worker')

  return {
    dispatch: (request: SpeechWorkerRequest) => {
      if (messageListener === null) {
        throw new Error('Speech worker message listener was not registered.')
      }

      messageListener({data: request} as MessageEvent<SpeechWorkerRequest>)
    },
    postMessage,
  }
}

const createTranscribeRequest = (requestId: number, sample: number) =>
  ({
    audio: Float32Array.of(sample),
    language: 'korean',
    modelId: 'whisper-base',
    preferredBackend: 'wasm',
    requestId,
    type: 'transcribe',
  }) as const

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  transformers.pipeline.mockResolvedValue(transformers.transcribe)
})

it('should run only one transcribe at a time in the worker', async () => {
  const firstTranscription = Promise.withResolvers<{text: string}>()
  const secondTranscription = Promise.withResolvers<{text: string}>()
  transformers.transcribe
    .mockReturnValueOnce(firstTranscription.promise)
    .mockReturnValueOnce(secondTranscription.promise)
  const worker = await loadWorker()

  worker.dispatch(createTranscribeRequest(1, 0.1))
  await vi.waitFor(() => expect(transformers.transcribe).toHaveBeenCalledOnce())

  worker.dispatch(createTranscribeRequest(2, 0.2))
  await Promise.resolve()

  expect(transformers.transcribe).toHaveBeenCalledTimes(1)
})
