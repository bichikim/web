import {createOneShotWorkerRequest} from 'src/utils/worker-transport'
import type {OpusWorkerRequest, OpusWorkerResponse} from './opus-messages'

const OPUS_WORKER_FAILURE_MESSAGE = 'Opus 인코딩 Worker를 실행하지 못했어요.'

export interface CreateOpusBlobOptions {
  readonly sampleRate: number
  readonly samples: Float32Array
  readonly signal?: AbortSignal
}

const getAbortError = (signal: AbortSignal) =>
  signal.reason instanceof Error
    ? signal.reason
    : new DOMException('Opus 인코딩을 취소했어요.', 'AbortError')
const getWorkerError = (error: unknown) => {
  if (error instanceof Error) {
    return error
  }

  const message =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
      ? error.message
      : OPUS_WORKER_FAILURE_MESSAGE
  return new Error(message, {cause: error})
}

/** Encodes owned mono PCM off the main thread and releases the Worker after one request. */
export const createOpusBlob = (options: CreateOpusBlobOptions): Promise<Blob> => {
  if (options.signal?.aborted === true) {
    return Promise.reject(getAbortError(options.signal))
  }

  const worker = new Worker(new URL('./opus-worker.ts', import.meta.url), {
    name: 'pomo-opus-encoder',
    type: 'module',
  })
  const workerSamples =
    options.samples.buffer instanceof ArrayBuffer &&
    options.samples.byteOffset === 0 &&
    options.samples.byteLength === options.samples.buffer.byteLength
      ? new Float32Array(options.samples.buffer)
      : options.samples.slice()

  return createOneShotWorkerRequest<OpusWorkerRequest, OpusWorkerResponse, Blob>({
    abortError: getAbortError,
    failureMessage: OPUS_WORKER_FAILURE_MESSAGE,
    messageFailureMessage: 'Opus 인코딩 Worker 응답을 읽지 못했어요.',
    onMessage: (response, reply) => {
      switch (response.type) {
        case 'complete':
          reply.resolve(response.audio)
          return
        case 'error':
          reply.reject(new Error(response.detail))
          return
      }
      response satisfies never
    },
    request: {sampleRate: options.sampleRate, samples: workerSamples},
    sendError: getWorkerError,
    get signal() {
      return options.signal
    },
    transfer: [workerSamples.buffer],
    worker,
  })
}
