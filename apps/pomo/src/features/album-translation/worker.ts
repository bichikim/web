/// <reference lib="webworker" />

import {getErrorMessage} from 'src/utils/get-error-message'

import {createTextGenerationExecutor, type TextGenerationError} from '../text-generation/execution'
import {trimRepetitiveTail} from '../text-generation'
import type {AlbumTranslationWorkerRequest, AlbumTranslationWorkerResponse} from './messages'
import {parseAlbumTranslation} from './output'
import {createAlbumTranslationMessages} from './prompt'

const MAXIMUM_NEW_TOKENS = 900
const workerScope = self as DedicatedWorkerGlobalScope

const sendResponse = (response: AlbumTranslationWorkerResponse) => workerScope.postMessage(response)
const textExecutor = createTextGenerationExecutor({
  onProgress: (progress) => sendResponse({...progress, type: 'loading'}),
})
let nextRequestId = 0

const createGenerationFailure = (error: TextGenerationError) =>
  new Error(error.detail ?? 'Gemma 4 번역을 실행하지 못했습니다.')

const createRequestId = () => {
  const requestId = `album-translation-${nextRequestId}`
  nextRequestId += 1
  return requestId
}

const translateAlbum = async (request: AlbumTranslationWorkerRequest) => {
  const preparation = await textExecutor.prepare({kind: 'device', modelId: 'gemma-4-e2b'})
  if (!preparation.ok) {
    throw createGenerationFailure(preparation.error)
  }

  sendResponse({type: 'started'})
  const result = await textExecutor.generate(
    {
      execution: {kind: 'device', modelId: 'gemma-4-e2b'},
      messages: createAlbumTranslationMessages(request),
      parameters: {
        maximumTokens: MAXIMUM_NEW_TOKENS,
        noRepeatNgramSize: 3,
        repetitionPenalty: 1.05,
        temperature: 0.1,
        topK: 20,
        topP: 0.9,
      },
      requestId: createRequestId(),
    },
    {onResponse: () => undefined},
  )
  if (!result.ok) {
    throw createGenerationFailure(result.error)
  }

  const output = result.value
  sendResponse({translations: parseAlbumTranslation(trimRepetitiveTail(output)), type: 'complete'})
}

workerScope.addEventListener('message', (event: MessageEvent<AlbumTranslationWorkerRequest>) => {
  translateAlbum(event.data).catch((error: unknown) => {
    sendResponse({
      message: getErrorMessage(error, 'Gemma 4 번역을 실행하지 못했습니다.'),
      restartRequired: false,
      type: 'error',
    })
  })
})
