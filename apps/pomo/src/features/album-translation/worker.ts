/// <reference lib="webworker" />

import {type TextGenerationRuntime, trimRepetitiveTail} from '../text-generation'
import type {AlbumTranslationWorkerRequest, AlbumTranslationWorkerResponse} from './messages'
import {parseAlbumTranslation} from './output'
import {createAlbumTranslationMessages} from './prompt'

const MAXIMUM_NEW_TOKENS = 900
const workerScope = self as DedicatedWorkerGlobalScope

const sendResponse = (response: AlbumTranslationWorkerResponse) => workerScope.postMessage(response)
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

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message.length > 0
    ? error.message
    : 'Gemma 4 번역을 실행하지 못했습니다.'

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

workerScope.addEventListener('message', (event: MessageEvent<AlbumTranslationWorkerRequest>) => {
  translateAlbum(event.data).catch((error: unknown) => {
    sendResponse({message: getErrorMessage(error), restartRequired: false, type: 'error'})
  })
})
