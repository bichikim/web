/// <reference lib="webworker" />
import {listenTextGenerationRequests} from '../text-generation/listen-text-generation-requests'
import {unwrapGenerationResult} from '../text-generation/unwrap-generation-result'

import {createExclusiveAsyncTask} from 'src/utils/create-exclusive-async-task'
import {createDeviceTarget, trimRepetitiveTail} from '../text-generation'
import {createTextGenerationExecutor} from '../text-generation/execution'
import type {TarotGenerateRequest, TarotWorkerRequest, TarotWorkerResponse} from './messages'
import {createTarotMessages} from './prompt'

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
  const target = createDeviceTarget(request.modelId)
  const preparation = await textExecutor.prepare(target)
  unwrapGenerationResult(preparation, '타로 해석 모델을 준비하지 못했어요.')

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
  const resultValue = unwrapGenerationResult(result, '타로 해석을 만들지 못했어요.')

  const text = trimRepetitiveTail(resultValue).trim()
  if (text.length === 0) {
    throw new Error('타로 해석 결과가 비어 있어요.')
  }

  sendResponse({
    requestId: request.requestId,
    text,
    type: 'complete',
  })
}

listenTextGenerationRequests<TarotWorkerRequest>({
  fallback: '타로 해석을 만들지 못했어요.',
  handle: (request) => generation.run(() => generateReading(request)),
  onError: (error, request) => sendResponse({...error, requestId: request.requestId}),
  scope: workerScope,
})
