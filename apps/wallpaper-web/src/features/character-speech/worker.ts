/// <reference lib="webworker" />
import {
  parseSupertonicConfig,
  parseSupertonicIndexer,
  parseSupertonicVoice,
  SupertonicEngine,
} from '@winter-love/supertonic/engine'
import {getSupertonicAssetUrl} from '@winter-love/supertonic/model'
import {failureResult, successResult} from '@winter-love/supertonic/result'
import {loadSupertonicRuntime} from '@winter-love/supertonic/runtime'
import {loadSessions} from '@winter-love/supertonic/sessions'
import type {SpeechCommand, SpeechReply} from './types'
import {getSpeechSpeed, SPEECH_MODEL, SPEECH_VOICE_PATH} from './configuration'
import {loadSpeechAsset, SPEECH_ASSET_CACHE} from './worker/load-asset'

const PERCENT = 100

const scope = globalThis.self as DedicatedWorkerGlobalScope
const model = SPEECH_MODEL
const requests = new Map<number, AbortController>()
let pending = Promise.resolve()
const post = (message: SpeechReply, transfer: Transferable[] = []) =>
  scope.postMessage(message, transfer)
let activeId = 0
let reportedProgress = -1
const status = (percent: number) => {
  if (percent === reportedProgress) {
    return
  }
  reportedProgress = percent
  post({id: activeId, status: {percent, phase: 'downloading'}, type: 'status'})
}

const initialize = async () => {
  const assets = {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
    openCache: () => caches.open(SPEECH_ASSET_CACHE),
  }
  const runtime = await loadSupertonicRuntime('wasm')
  const [config, indexer, voice] = await Promise.all([
    loadSpeechAsset({
      ...assets,
      parse: async (response) => {
        const result = parseSupertonicConfig(await response.json())
        if (!result.ok) {
          throw new Error('Invalid speech configuration')
        }
        return result.value
      },
      url: getSupertonicAssetUrl('onnx/tts.json'),
    }),
    loadSpeechAsset({
      ...assets,
      parse: async (response) => {
        const result = parseSupertonicIndexer(await response.json())
        if (!result.ok) {
          throw new Error('Invalid speech indexer')
        }
        return result.value
      },
      url: getSupertonicAssetUrl('onnx/unicode_indexer.json'),
    }),
    loadSpeechAsset({
      ...assets,
      parse: async (response) => {
        const result = parseSupertonicVoice(runtime, await response.json())
        if (!result.ok) {
          throw new Error('Invalid speech voice')
        }
        return result.value
      },
      url: getSupertonicAssetUrl(SPEECH_VOICE_PATH),
    }),
  ])
  let modelUrl: string | null = null
  const loaded = await loadSessions({
    backend: 'wasm',
    loadBuffer: async (options) => {
      try {
        modelUrl = options.url
        const buffer = await loadSpeechAsset({
          ...assets,
          parse: async (response) => {
            let received = 0
            const progress = new TransformStream<Uint8Array, Uint8Array>({
              transform(chunk, controller) {
                received += chunk.byteLength
                status(
                  Math.min(
                    PERCENT,
                    Math.round(((options.loadedBefore + received) / model.size) * PERCENT),
                  ),
                )
                controller.enqueue(chunk)
              },
            })
            const buffer =
              response.body === null
                ? await response.arrayBuffer()
                : await new Response(response.body.pipeThrough(progress)).arrayBuffer()
            if (buffer.byteLength !== options.expectedSize) {
              throw new Error('Incomplete speech model download')
            }
            return buffer
          },
          url: options.url,
        })
        return successResult(buffer)
      } catch (cause) {
        console.error('Speech download failed', cause)
        return failureResult({
          code: 'download-failed',
          fileName: options.fileName,
          phase: 'download',
          retryable: true,
          status: null,
        })
      }
    },
    model,
    runtime,
    signal: new AbortController().signal,
  })
  if (!loaded.ok) {
    const failedUrl = modelUrl
    if (loaded.error.code === 'backend-failed' && failedUrl !== null) {
      await caches
        .open(SPEECH_ASSET_CACHE)
        .then((cache) => cache.delete(failedUrl))
        .catch((cause: unknown) => console.warn('Speech cache removal failed', cause))
    }
    throw new Error('Speech model initialization failed', {cause: loaded.error})
  }
  return {
    engine: new SupertonicEngine(config, indexer, loaded.value, runtime),
    voice,
  }
}
let loaded: ReturnType<typeof initialize> | null = null

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

const generate = async (
  command: SpeechCommand & {readonly type: 'generate'},
  signal: AbortSignal,
) => {
  signal.throwIfAborted()
  activeId = command.id
  if (loaded === null) {
    reportedProgress = -1
    status(0)
    loaded = initialize().catch((cause: unknown) => {
      loaded = null
      throw cause
    })
  }
  const {engine, voice} = await loaded
  signal.throwIfAborted()
  post({id: command.id, status: {phase: 'generating'}, type: 'status'})
  const {text} = command
  const samples = await engine.generate({
    language: 'ko',
    onProgress: yieldInput,
    signal,
    speed: getSpeechSpeed(text),
    text,
    voice,
  })
  signal.throwIfAborted()
  const {encodeSpeechMp3} = await import('./worker/encode-mp3')
  signal.throwIfAborted()
  const audio = encodeSpeechMp3({sampleRate: engine.sampleRate, samples})
  signal.throwIfAborted()
  post({audio, id: command.id, type: 'audio'})
}

scope.onmessage = (event: MessageEvent<SpeechCommand>) => {
  const command = event.data
  switch (command.type) {
    case 'cancel':
      requests.get(command.id)?.abort()
      return
    case 'generate': {
      const request = new AbortController()
      requests.set(command.id, request)
      pending = pending
        .then(() => generate(command, request.signal))
        .catch((cause: unknown) => {
          if (!request.signal.aborted) {
            console.error('Speech generation failed', cause)
            post({id: command.id, type: 'error'})
          }
        })
        .finally(() => requests.delete(command.id))
      return
    }
    default: {
      const unexpected: never = command
      throw new Error(`Unknown speech command: ${String(unexpected)}`)
    }
  }
}
