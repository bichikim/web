/// <reference lib="webworker" />

import {getErrorMessage} from 'src/utils/get-error-message'
import {createExclusiveAsyncTask} from 'src/utils/create-exclusive-async-task'
import {createDeviceTarget, createGenerationFailure, trimRepetitiveTail} from '../text-generation'
import {createTextGenerationExecutor} from '../text-generation/execution'
import type {TarotGenerateRequest, TarotWorkerRequest, TarotWorkerResponse} from './messages'
import {createTarotMessages} from './prompt'

const MODEL_ID = 'gemma-4-e2b'
const MAXIMUM_NEW_TOKENS = 2560
const workerScope = globalThis.self as DedicatedWorkerGlobalScope
let activeRequestId = ''
const sendResponse = (response: TarotWorkerResponse) => workerScope.postMessage(response)
const textExecutor = createTextGenerationExecutor({
  onProgress: (progress) =>
    sendResponse({percentage: progress.percentage, requestId: activeRequestId, type: 'progress'}),
})
const generation = createExclusiveAsyncTask()

const generateReading = async (request: TarotGenerateRequest) => {
  activeRequestId = request.requestId
  const target = createDeviceTarget(MODEL_ID)
  const preparation = await textExecutor.prepare(target)
  if (!preparation.ok) {
    throw createGenerationFailure(preparation.error, '타로 해석 모델을 준비하지 못했어요.')
  }

  sendResponse({requestId: request.requestId, type: 'started'})
  const result = await textExecutor.generate(
    {
      execution: target,
      messages: createTarotMessages(request),
      parameters: {
        maximumTokens: MAXIMUM_NEW_TOKENS,
        noRepeatNgramSize: 4,
        repetitionPenalty: 1.1,
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
      },
      requestId: request.requestId,
    },
    {
      onResponse: (response) => {
        if (response.type === 'token') {
          sendResponse({requestId: request.requestId, text: response.text, type: 'token'})
        }
      },
    },
  )
  if (!result.ok) {
    throw createGenerationFailure(result.error, '타로 해석을 만들지 못했어요.')
  }

  const text = trimRepetitiveTail(result.value).trim()
  if (text.length === 0) {
    throw new Error('타로 해석 결과가 비어 있어요.')
  }

  sendResponse({
    requestId: request.requestId,
    text,
    type: 'complete',
  })
}

workerScope.addEventListener('message', (event: MessageEvent<TarotWorkerRequest>) => {
  generation
    .run(() => generateReading(event.data))
    .catch((error: unknown) => {
      sendResponse({
        message: getErrorMessage(error, '타로 해석을 만들지 못했어요.'),
        requestId: event.data.requestId,
        restartRequired: false,
        type: 'error',
      })
    })
})
