/// <reference lib="webworker" />

import type {OpusWorkerRequest, OpusWorkerResponse} from './opus-messages'
import {getOpusEncodingInput} from './opus-sampling'
import {encodeOpusBlob} from './opus'

const workerScope = self as DedicatedWorkerGlobalScope

const getErrorDetail = (error: unknown) =>
  error instanceof Error ? error.message : 'Opus 인코딩 중 알 수 없는 오류가 발생했어요.'

workerScope.addEventListener('message', (event: MessageEvent<OpusWorkerRequest>) => {
  const input = getOpusEncodingInput(event.data.samples, event.data.sampleRate)

  encodeOpusBlob(input.samples, input.sampleRate)
    .then((audio) => {
      workerScope.postMessage({audio, type: 'complete'} satisfies OpusWorkerResponse)
    })
    .catch((error: unknown) => {
      workerScope.postMessage({
        detail: getErrorDetail(error),
        type: 'error',
      } satisfies OpusWorkerResponse)
    })
})
