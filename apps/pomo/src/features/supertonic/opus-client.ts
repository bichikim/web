import type {OpusWorkerRequest, OpusWorkerResponse} from './opus-messages'

const OPUS_WORKER_FAILURE_MESSAGE = 'Opus 인코딩 Worker를 실행하지 못했어요.'

/** Encodes mono PCM speech off the main thread and releases the Worker after one request. */
export const createOpusBlob = (samples: Float32Array, sampleRate: number): Promise<Blob> => {
  const worker = new Worker(new URL('./opus-worker.ts', import.meta.url), {
    name: 'pomo-opus-encoder',
    type: 'module',
  })
  const workerSamples = samples.slice()

  return new Promise((resolve, reject) => {
    let isSettled = false
    const settle = (result: {readonly audio: Blob} | {readonly error: Error}) => {
      if (isSettled) {
        return
      }

      isSettled = true
      worker.terminate()

      if ('audio' in result) {
        resolve(result.audio)
      } else {
        reject(result.error)
      }
    }

    worker.addEventListener('message', (event: MessageEvent<OpusWorkerResponse>) => {
      const response = event.data

      switch (response.type) {
        case 'complete':
          settle({audio: response.audio})
          return
        case 'error':
          settle({error: new Error(response.detail)})
          return
      }

      response satisfies never
    })
    worker.addEventListener('error', (event) => {
      settle({error: new Error(event.message || OPUS_WORKER_FAILURE_MESSAGE)})
    })
    worker.addEventListener('messageerror', () => {
      settle({error: new Error('Opus 인코딩 Worker 응답을 읽지 못했어요.')})
    })
    worker.postMessage({sampleRate, samples: workerSamples} satisfies OpusWorkerRequest, [
      workerSamples.buffer,
    ])
  })
}
