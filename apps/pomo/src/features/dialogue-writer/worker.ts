/// <reference lib="webworker" />

import {createTextGenerationRuntime, type TextModelId, trimRepetitiveTail} from '../text-generation'
import {normalizeKoreanSpeechStyle} from './answer'
import {createForeignTokenIds} from './foreign-tokens'
import type {DialogueWorkerRequest, DialogueWorkerResponse} from './messages'
import {createDirectAnswerMessages} from './prompt'

const MAXIMUM_NEW_TOKENS = 1024
const workerScope = self as DedicatedWorkerGlobalScope

const sendResponse = (response: DialogueWorkerResponse) => workerScope.postMessage(response)
const textRuntime = createTextGenerationRuntime({
  onProgress: (progress) => sendResponse({...progress, type: 'loading'}),
})
let suppressedTokenIds: Array<number> | null = null

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  return '대화문 모델을 실행하지 못했어요.'
}

const prepareModel = async (modelId: TextModelId) => {
  await textRuntime.prepare(modelId)
  sendResponse({type: 'ready'})
}

const generateDirectAnswer = async (modelId: TextModelId, request: string) => {
  await textRuntime.prepare(modelId)
  sendResponse({type: 'started'})
  suppressedTokenIds ??= createForeignTokenIds(textRuntime.getTokenizer())
  const output = await textRuntime.generate({
    maximumTokens: MAXIMUM_NEW_TOKENS,
    messages: createDirectAnswerMessages({request}),
    noRepeatNgramSize: 4,
    onToken: (text) => sendResponse({text, type: 'token'}),
    repetitionPenalty: 1.15,
    suppressedTokenIds,
    temperature: 0.7,
    topK: 40,
    topP: 0.9,
  })
  const answer = normalizeKoreanSpeechStyle(trimRepetitiveTail(output))
  sendResponse({text: answer, type: 'complete'})
}

const handleRequest = (request: DialogueWorkerRequest): Promise<void> => {
  switch (request.type) {
    case 'generate':
      return generateDirectAnswer(request.modelId, request.request)
    case 'prepare':
      return prepareModel(request.modelId)
  }

  request satisfies never
}

workerScope.addEventListener('message', (event: MessageEvent<DialogueWorkerRequest>) => {
  handleRequest(event.data).catch((error: unknown) => {
    sendResponse({message: getErrorMessage(error), restartRequired: false, type: 'error'})
  })
})
