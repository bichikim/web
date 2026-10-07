/// <reference lib="webworker" />

import {
  createDeviceTarget,
  createGenerationFailure,
  createRequestSequence,
  trimRepetitiveTail,
} from 'src/features/text-generation'
import {createTextGenerationExecutor} from 'src/features/text-generation/execution'
import {createExclusiveAsyncTask} from 'src/utils/create-exclusive-async-task'
import {getErrorMessage} from 'src/utils/get-error-message'
import {generateSajuAnswer} from './generate-answer'
import type {GenerateSajuRequest, SajuWorkerResponse} from './messages'

const MODEL = createDeviceTarget('gemma-4-e2b')
const createRequestId = createRequestSequence('saju')
const generation = createExclusiveAsyncTask()
const workerScope = globalThis.self as DedicatedWorkerGlobalScope
const sendResponse = (response: SajuWorkerResponse) => workerScope.postMessage(response)
const executor = createTextGenerationExecutor({
  onProgress: (progress) => sendResponse({...progress, type: 'loading'}),
})
async function generateAnswer(messages: GenerateSajuRequest['messages']): Promise<string> {
  const result = await executor.generate(
    {
      execution: MODEL,
      messages,
      parameters: {
        maximumTokens: 768,
        noRepeatNgramSize: 4,
        repetitionPenalty: 1.15,
        temperature: 0.3,
        topK: 40,
        topP: 0.9,
      },
      requestId: createRequestId(),
    },
    {onResponse: () => undefined},
  )
  if (!result.ok) {
    throw createGenerationFailure(result.error, '사주 풀이를 생성하지 못했어요.')
  }

  return trimRepetitiveTail(result.value).trim()
}

async function generate(request: GenerateSajuRequest) {
  const preparation = await executor.prepare(MODEL)
  if (!preparation.ok) {
    throw createGenerationFailure(preparation.error, 'Gemma 4 모델을 준비하지 못했어요.')
  }

  sendResponse({type: 'started'})
  sendResponse(await generateSajuAnswer(request, generateAnswer))
}

workerScope.addEventListener('message', (event: MessageEvent<GenerateSajuRequest>) => {
  generation
    .run(() => generate(event.data))
    .catch((cause: unknown) => {
      sendResponse({
        message: getErrorMessage(cause, '사주 풀이를 생성하지 못했어요.'),
        type: 'error',
      })
    })
})
