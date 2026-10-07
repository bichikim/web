/// <reference lib="webworker" />
import {listenTextGenerationRequests} from '../text-generation/listen-text-generation-requests'
import {unwrapGenerationResult} from '../text-generation/unwrap-generation-result'

import {
  createDeviceTarget,
  createRequestSequence,
  type TextModelId,
  trimRepetitiveTail,
} from '../text-generation'

import {createExclusiveAsyncTask} from 'src/utils/create-exclusive-async-task'

import {createTextGenerationExecutor} from '../text-generation/execution'
import {normalizeKoreanSpeechStyle} from './answer'
import {createForeignTokenIds} from './foreign-tokens'
import type {DialogueWorkerRequest, DialogueWorkerResponse} from './messages'
import {createDirectAnswerMessages, type DialogueOutputLanguage} from './prompt'

const FAILURE_MESSAGE = '대화문 모델을 실행하지 못했어요.'

const MAXIMUM_NEW_TOKENS = 1024
const workerScope = globalThis.self as DedicatedWorkerGlobalScope

const sendResponse = (response: DialogueWorkerResponse) => workerScope.postMessage(response)
const textExecutor = createTextGenerationExecutor({
  onProgress: (progress) => sendResponse({...progress, type: 'loading'}),
})
let suppressedTokenIds: Array<number> | undefined
const generation = createExclusiveAsyncTask()
const createRequestId = createRequestSequence('dialogue')

const prepareModel = async (modelId: TextModelId) => {
  const result = await textExecutor.prepare(createDeviceTarget(modelId))
  const resultValue = unwrapGenerationResult(result, FAILURE_MESSAGE)

  sendResponse({type: 'ready'})
}

const generateDirectAnswer = async (
  modelId: TextModelId,
  outputLanguage: DialogueOutputLanguage,
  request: string,
) => {
  const preparation = await textExecutor.prepare(createDeviceTarget(modelId))
  unwrapGenerationResult(preparation, FAILURE_MESSAGE)

  sendResponse({type: 'started'})
  if (outputLanguage === 'ko') {
    const tokenizerResult = textExecutor.getTokenizer(createDeviceTarget(modelId))
    const tokenizerResultValue = unwrapGenerationResult(tokenizerResult, FAILURE_MESSAGE)

    suppressedTokenIds ??= createForeignTokenIds(tokenizerResultValue)
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
  const resultValue = unwrapGenerationResult(result, FAILURE_MESSAGE)

  const output = resultValue
  const trimmedOutput = trimRepetitiveTail(output)
  const answer =
    outputLanguage === 'ko' ? normalizeKoreanSpeechStyle(trimmedOutput) : trimmedOutput.trim()
  sendResponse({text: answer, type: 'complete'})
}

const handleRequest = (request: DialogueWorkerRequest): Promise<void> => {
  switch (request.type) {
    case 'generate': {
      return generation.run(() =>
        generateDirectAnswer(request.modelId, request.outputLanguage ?? 'ko', request.request),
      )
    }
    case 'prepare':
      return prepareModel(request.modelId)
  }

  request satisfies never
}

listenTextGenerationRequests<DialogueWorkerRequest>({
  fallback: FAILURE_MESSAGE,
  handle: handleRequest,
  onError: sendResponse,
  scope: workerScope,
})
