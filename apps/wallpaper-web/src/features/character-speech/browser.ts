import {createSpeechCache} from './cache'
import {getSpeechCacheKey} from './configuration'
import {createSpeechSession} from './session'
import {createSpeechSynthesis} from './synthesis'
import type {SpeechSession} from './types'

/** 사용자 동작으로 호출될 때만 브라우저 자원을 생성한다. */
export const createBrowserSpeechSession = (): SpeechSession => {
  const context = new AudioContext()
  return createSpeechSession({
    cache: createSpeechCache(() => indexedDB),
    context,
    createSynthesis: () =>
      createSpeechSynthesis(new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})),
    fetch: (input, init) => fetch(input, init),
    frames: {
      cancel: (handle) => cancelAnimationFrame(handle),
      request: (callback) => requestAnimationFrame(callback),
    },
    getCacheKey: (text) => getSpeechCacheKey(text, crypto.subtle),
  })
}
