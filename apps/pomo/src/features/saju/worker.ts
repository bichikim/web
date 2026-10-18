/// <reference lib="webworker" />

import {createExclusiveAsyncTask} from 'src/utils/create-exclusive-async-task'
import {getErrorMessage} from 'src/utils/get-error-message'
import {createDeviceTarget, createGenerationFailure} from '../text-generation'
import {createTextGenerationExecutor} from '../text-generation/execution'
import {generateSajuAnswer} from './generate-answer'
import type {SajuGenerateRequest, SajuGenerationResponse} from './generation-messages'

const workerScope = globalThis.self as DedicatedWorkerGlobalScope
const generation = createExclusiveAsyncTask()
let activeRequestId = ''
const respond = (response: SajuGenerationResponse) => workerScope.postMessage(response)
const executor = createTextGenerationExecutor({
  onProgress: (progress) =>
    respond({percentage: progress.percentage, requestId: activeRequestId, type: 'progress'}),
})

async function generate(request: SajuGenerateRequest) {
  activeRequestId = request.requestId
  const target = createDeviceTarget(request.modelId)
  const preparation = await executor.prepare(target)
  if (!preparation.ok) {
    throw createGenerationFailure(preparation.error, '사주 풀이 모델을 준비하지 못했어요.')
  }

  respond({requestId: request.requestId, type: 'started'})
  const answer = await generateSajuAnswer(request, async (messages) => {
    const result = await executor.generate(
      {
        execution: target,
        messages,
        parameters: {
          maximumTokens: 768,
          noRepeatNgramSize: 4,
          repetitionPenalty: 1.15,
          temperature: 0.3,
          topK: 40,
          topP: 0.9,
        },
        requestId: request.requestId,
      },
      {onResponse: () => undefined},
    )
    if (!result.ok) {
      throw createGenerationFailure(result.error, '사주 풀이를 생성하지 못했어요.')
    }
    return result.value
  })
  respond({...answer, requestId: request.requestId})
}

workerScope.addEventListener('message', (event: MessageEvent<SajuGenerateRequest>) => {
  generation
    .run(() => generate(event.data))
    .catch((cause: unknown) => {
      respond({
        message: getErrorMessage(cause, '사주 풀이를 생성하지 못했어요.'),
        requestId: event.data.requestId,
        type: 'error',
      })
    })
})
