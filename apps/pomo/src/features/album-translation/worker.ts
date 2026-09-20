/// <reference lib="webworker" />

import {getErrorMessage} from 'src/utils/get-error-message'

import {type TextGenerationRuntime, trimRepetitiveTail} from '../text-generation'
import type {AlbumTranslationWorkerRequest, AlbumTranslationWorkerResponse} from './messages'
import {parseAlbumTranslation} from './output'
import {createAlbumTranslationMessages} from './prompt'

const MAXIMUM_NEW_TOKENS = 900
const workerScope = globalThis.self as DedicatedWorkerGlobalScope

const sendResponse = (response: AlbumTranslationWorkerResponse) => workerScope.postMessage(response)
let textRuntimePromise: Promise<TextGenerationRuntime> | null = null
let translationInFlight = false

const getTextRuntime = () => {
  textRuntimePromise ??= import('../text-generation/transformers-runtime').then(
    ({createTransformersRuntime}) =>
      createTransformersRuntime({
        onProgress: (progress) => sendResponse({...progress, type: 'loading'}),
      }),
  )
  return textRuntimePromise
}

const translateAlbum = async (request: AlbumTranslationWorkerRequest) => {
  const textRuntime = await getTextRuntime()
  await textRuntime.prepare('gemma-4-e2b')
  sendResponse({type: 'started'})
  const output = await textRuntime.generate({
    maximumTokens: MAXIMUM_NEW_TOKENS,
    messages: createAlbumTranslationMessages(request),
    noRepeatNgramSize: 3,
    repetitionPenalty: 1.05,
    temperature: 0.1,
    topK: 20,
    topP: 0.9,
  })
  sendResponse({translations: parseAlbumTranslation(trimRepetitiveTail(output)), type: 'complete'})
}

const handleRequest = (request: AlbumTranslationWorkerRequest): Promise<void> => {
  if (translationInFlight) {
    return Promise.resolve()
  }

  translationInFlight = true
  return translateAlbum(request).finally(() => {
    translationInFlight = false
  })
}

workerScope.addEventListener('message', (event: MessageEvent<AlbumTranslationWorkerRequest>) => {
  handleRequest(event.data).catch((error: unknown) => {
    sendResponse({
      message: getErrorMessage(error, 'Gemma 4 번역을 실행하지 못했습니다.'),
      restartRequired: false,
      type: 'error',
    })
  })
})
