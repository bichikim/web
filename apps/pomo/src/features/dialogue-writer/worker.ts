/// <reference lib="webworker" />

import {
  createDeviceTarget,
  createGenerationFailure,
  createRequestSequence,
  type TextModelId,
  trimRepetitiveTail,
} from '../text-generation'

import {getErrorMessage} from 'src/utils/get-error-message'

import {createTextGenerationExecutor} from '../text-generation/execution'
import {normalizeKoreanSpeechStyle} from './answer'
import {createForeignTokenIds} from './foreign-tokens'
import type {DialogueWorkerRequest, DialogueWorkerResponse} from './messages'
import {createDirectAnswerMessages, type DialogueOutputLanguage} from './prompt'

const MAXIMUM_NEW_TOKENS = 1024
const workerScope = globalThis.self as DedicatedWorkerGlobalScope

const sendResponse = (response: DialogueWorkerResponse) => workerScope.postMessage(response)
const textExecutor = createTextGenerationExecutor({
  onProgress: (progress) => sendResponse({...progress, type: 'loading'}),
})
let suppressedTokenIds: Array<number> | undefined
let generationInFlight = false
const createRequestId = createRequestSequence('dialogue')

const prepareModel = async (modelId: TextModelId) => {
  const result = await textExecutor.prepare(createDeviceTarget(modelId))
  if (!result.ok) {
    throw createGenerationFailure(result.error, '대화문 모델을 실행하지 못했어요.')
  }

  sendResponse({type: 'ready'})
}

const generateDirectAnswer = async (
  modelId: TextModelId,
  outputLanguage: DialogueOutputLanguage,
  request: string,
) => {
  const preparation = await textExecutor.prepare(createDeviceTarget(modelId))
  if (!preparation.ok) {
    throw createGenerationFailure(preparation.error, '대화문 모델을 실행하지 못했어요.')
  }

  sendResponse({type: 'started'})
  if (outputLanguage === 'ko') {
    const tokenizerResult = textExecutor.getTokenizer(createDeviceTarget(modelId))
    if (!tokenizerResult.ok) {
      throw createGenerationFailure(tokenizerResult.error, '대화문 모델을 실행하지 못했어요.')
    }

    suppressedTokenIds ??= createForeignTokenIds(tokenizerResult.value)
  }
  const result = await textExecutor.generate(
    {
      execution: createDeviceTarget(modelId),
      messages: createDirectAnswerMessages({outputLanguage, request}),
      parameters: {
        maximumTokens: MAXIMUM_NEW_TOKENS,
        noRepeatNgramSize: 4,
        repetitionPenalty: 1.15,
        suppressedTokenIds: outputLanguage === 'ko' ? suppressedTokenIds : undefined,
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
      },
      requestId: createRequestId(),
    },
    {
      onResponse: (response) => {
        if (response.type === 'token') {
          sendResponse({text: response.text, type: 'token'})
        }
      },
    },
  )
  if (!result.ok) {
    throw createGenerationFailure(result.error, '대화문 모델을 실행하지 못했어요.')
  }

  const output = result.value
  const trimmedOutput = trimRepetitiveTail(output)
  const answer =
    outputLanguage === 'ko' ? normalizeKoreanSpeechStyle(trimmedOutput) : trimmedOutput.trim()
  sendResponse({text: answer, type: 'complete'})
}

const handleRequest = (request: DialogueWorkerRequest): Promise<void> => {
  switch (request.type) {
    case 'generate': {
      if (generationInFlight) {
        return Promise.resolve()
      }

      generationInFlight = true
      return generateDirectAnswer(
        request.modelId,
        request.outputLanguage ?? 'ko',
        request.request,
      ).finally(() => {
        generationInFlight = false
      })
    }
    case 'prepare':
      return prepareModel(request.modelId)
  }

  request satisfies never
}

workerScope.addEventListener('message', (event: MessageEvent<DialogueWorkerRequest>) => {
  handleRequest(event.data).catch((error: unknown) => {
    sendResponse({
      message: getErrorMessage(error, '대화문 모델을 실행하지 못했어요.'),
      restartRequired: false,
      type: 'error',
    })
  })
})
