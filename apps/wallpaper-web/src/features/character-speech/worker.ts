/// <reference lib="webworker" />
import {loadSupertonicRuntime} from '@winter-love/supertonic/runtime'
import type {SpeechCommand} from './types'
import {createSpeechHandler} from './worker/create-speech-handler'
import {SPEECH_ASSET_CACHE} from './worker/load-asset'
import {loadSpeechEngine} from './worker/load-speech-engine'

const scope = globalThis.self as DedicatedWorkerGlobalScope
const yieldInput = () =>
  new Promise<void>((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => {
      channel.port1.close()
      channel.port2.close()
      resolve()
    }
    channel.port2.postMessage(null)
  })

const handle = createSpeechHandler({
  encode: async (audio, signal) => {
    const {encodeSpeechMp3} = await import('./worker/encode-mp3')
    signal.throwIfAborted()
    return encodeSpeechMp3(audio)
  },
  initialize: (onProgress) =>
    loadSpeechEngine({
      fetch: (input, init) => fetch(input, init),
      loadRuntime: () => loadSupertonicRuntime('wasm'),
      onProgress,
      openCache: () => caches.open(SPEECH_ASSET_CACHE),
      yieldInput,
    }),
  onError: (cause) => console.error('Speech generation failed', cause),
  post: (message) => scope.postMessage(message),
})

scope.onmessage = (event: MessageEvent<SpeechCommand>) => {
  handle(event.data)
}
