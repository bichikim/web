/// <reference lib="webworker" />
import {
  parseSupertonicConfig,
  parseSupertonicIndexer,
  parseSupertonicVoice,
  SupertonicEngine,
  type SupertonicVoice,
} from '@winter-love/supertonic/engine'
import {
  getSupertonicAssetUrl,
  getSupertonicModel,
  SUPERTONIC_VOICES,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '@winter-love/supertonic/model'
import type {SupertonicBackend, SupertonicRuntime} from '@winter-love/supertonic/runtime'
import {failureResult, successResult} from '@winter-love/supertonic/result'
import type {SynthesisCommand, SynthesisReply, SynthesisRequest} from './protocol'
import {createModelCache} from './model-cache'
import {createModelSessions} from './create-model-sessions'

const scope = globalThis.self as DedicatedWorkerGlobalScope
const cache = createModelCache()
const modelSessions = createModelSessions()
let loaded: {
  backend: SupertonicBackend
  gpu: boolean
  model: SupertonicModelId
  engine: SupertonicEngine
  runtime: SupertonicRuntime
} | null = null
const voices = new Map<SupertonicVoiceId, SupertonicVoice>()
const post = (message: SynthesisReply, transfer: Transferable[] = []) =>
  scope.postMessage(message, transfer)
const json = async (url: string): Promise<unknown> =>
  JSON.parse(new TextDecoder().decode(await cache.load(url)))

const initialize = async (id: SupertonicModelId, gpu: boolean) => {
  if (loaded?.model === id && loaded.gpu === gpu) {
    return loaded
  }
  await loaded?.engine.release()
  loaded = null
  voices.clear()
  const [config, indexer] = await Promise.all([
    json(getSupertonicAssetUrl('onnx/tts.json')).then(parseSupertonicConfig),
    json(getSupertonicAssetUrl('onnx/unicode_indexer.json')).then(parseSupertonicIndexer),
  ])
  if (!config.ok || !indexer.ok) {
    throw new Error('음성 모델 설정을 읽을 수 없어요.')
  }
  const sessions = await modelSessions.load({
    gpu,
    loadBuffer: async (options) => {
      try {
        return successResult(await cache.load(options.url))
      } catch (cause) {
        console.error('Poffo voice model download failed', cause)
        return failureResult({
          code: 'download-failed',
          fileName: options.fileName,
          phase: 'download',
          retryable: true,
          status: null,
        })
      }
    },
    model: getSupertonicModel(id),
    signal: new AbortController().signal,
  })
  if (!sessions.ok) {
    throw new Error('음성 모델을 실행할 수 없어요.', {cause: sessions.error})
  }
  const {backend, runtime} = sessions.value
  console.info('Poffo voice model ready', {backend, model: id})
  loaded = {
    backend,
    engine: new SupertonicEngine(config.value, indexer.value, sessions.value.sessions, runtime),
    gpu,
    model: id,
    runtime,
  }
  return loaded
}

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

const synthesize = async (request: SynthesisRequest, signal: AbortSignal): Promise<void> => {
  signal.throwIfAborted()
  if (loaded?.model !== request.voice.model || loaded.gpu !== request.voice.gpu) {
    post({id: request.id, status: 'download', type: 'status'})
  }
  const {backend, engine, runtime} = await initialize(request.voice.model, request.voice.gpu)
  signal.throwIfAborted()
  let voice = voices.get(request.voice.voice)
  if (voice === undefined) {
    const preset = SUPERTONIC_VOICES.find((item) => item.id === request.voice.voice)
    if (preset === undefined) {
      throw new Error('목소리를 찾을 수 없어요.')
    }
    const result = parseSupertonicVoice(
      runtime,
      await json(getSupertonicAssetUrl(`voice-styles/${preset.label.toLowerCase()}.json`)),
    )
    if (!result.ok) {
      throw new Error('목소리 파일을 읽을 수 없어요.')
    }
    voice = result.value
    voices.set(request.voice.voice, voice)
  }
  post({id: request.id, status: 'generating', type: 'status'})
  let samples: Float32Array
  try {
    samples = await engine.generate({
      language: request.voice.language,
      onProgress: yieldInput,
      signal,
      speed: request.voice.speed,
      text: request.text,
      voice,
    })
  } catch (cause) {
    signal.throwIfAborted()
    if (backend !== 'webgpu') {
      throw cause
    }
    console.warn('Poffo voice GPU execution failed; using CPU', cause)
    modelSessions.disableGpu(request.voice.model)
    await engine.release()
    loaded = null
    voices.clear()
    return synthesize(request, signal)
  }
  post({id: request.id, sampleRate: engine.sampleRate, samples, type: 'audio'}, [samples.buffer])
}
const requests = new Map<number, AbortController>()
let pending = Promise.resolve()
scope.onmessage = (event: MessageEvent<SynthesisCommand>) => {
  const command = event.data
  switch (command.type) {
    case 'cancel':
      requests.get(command.id)?.abort()
      return
    case 'generate': {
      const controller = new AbortController()
      requests.set(command.id, controller)
      pending = pending
        .then(() => synthesize(command, controller.signal))
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) {
            console.error('Poffo voice synthesis failed', cause)
            post({
              id: command.id,
              message: cause instanceof Error ? cause.message : '음성 생성에 실패했어요.',
              type: 'error',
            })
          }
        })
        .finally(() => {
          requests.delete(command.id)
        })
      return
    }
    default: {
      const unexpected: never = command
      throw new Error(`Unknown voice command: ${String(unexpected)}`)
    }
  }
}
