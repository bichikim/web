/// <reference lib="webworker" />

import {type TextGenerationRuntime, type TextModelId, trimRepetitiveTail} from '../text-generation'
import {normalizeKoreanSpeechStyle} from './answer'
import {createForeignTokenIds} from './foreign-tokens'
import type {DialogueWorkerRequest, DialogueWorkerResponse} from './messages'
import {createDirectAnswerMessages, type DialogueOutputLanguage} from './prompt'

const MAXIMUM_NEW_TOKENS = 1024
const workerScope = self as DedicatedWorkerGlobalScope

const sendResponse = (response: DialogueWorkerResponse) => workerScope.postMessage(response)
let textRuntimePromise: Promise<TextGenerationRuntime> | null = null
const getTextRuntime = () => {
  textRuntimePromise ??= import('../text-generation/transformers-runtime').then(
    ({createTransformersRuntime}) =>
      createTransformersRuntime({
        onProgress: (progress) => sendResponse({...progress, type: 'loading'}),
      }),
  )
  return textRuntimePromise
}
let suppressedTokenIds: Array<number> | null = null

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  return '대화문 모델을 실행하지 못했어요.'
}

const prepareModel = async (modelId: TextModelId) => {
  const textRuntime = await getTextRuntime()
  await textRuntime.prepare(modelId)
  sendResponse({type: 'ready'})
}

const generateDirectAnswer = async (
  modelId: TextModelId,
  outputLanguage: DialogueOutputLanguage,
  request: string,
) => {
  const textRuntime = await getTextRuntime()
  await textRuntime.prepare(modelId)
  sendResponse({type: 'started'})
  if (outputLanguage === 'ko') {
    suppressedTokenIds ??= createForeignTokenIds(textRuntime.getTokenizer())
  }
  const output = await textRuntime.generate({
    maximumTokens: MAXIMUM_NEW_TOKENS,
    messages: createDirectAnswerMessages({outputLanguage, request}),
    noRepeatNgramSize: 4,
    onToken: (text) => sendResponse({text, type: 'token'}),
    repetitionPenalty: 1.15,
    suppressedTokenIds: outputLanguage === 'ko' ? (suppressedTokenIds ?? undefined) : undefined,
    temperature: 0.7,
    topK: 40,
    topP: 0.9,
  })
  const trimmedOutput = trimRepetitiveTail(output)
  const answer =
    outputLanguage === 'ko' ? normalizeKoreanSpeechStyle(trimmedOutput) : trimmedOutput.trim()
  sendResponse({text: answer, type: 'complete'})
}

const handleRequest = (request: DialogueWorkerRequest): Promise<void> => {
  switch (request.type) {
    case 'generate':
      return generateDirectAnswer(request.modelId, request.outputLanguage ?? 'ko', request.request)
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
