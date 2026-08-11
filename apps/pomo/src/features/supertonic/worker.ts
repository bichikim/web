/// <reference lib="webworker" />

// oxlint-disable no-await-in-loop -- Model streams and sessions are loaded sequentially to cap peak browser memory.

import {env, InferenceSession} from 'onnxruntime-web/all'

import {joinAudioChunks} from './audio'
import {
  createModelStorage,
  loadModelResource,
  type ModelStorageError,
  reportModelStorageError,
} from '../model-storage'
import {
  createSupertonicVoice,
  parseSupertonicConfig,
  parseSupertonicIndexer,
  parseSupertonicVoice,
  SupertonicEngine,
  type SupertonicSessions,
  type SupertonicVoice,
} from './engine'
import {
  type BackendFailedError,
  type CancelledError,
  type DownloadFailedError,
  getErrorDetail,
  type SupertonicError,
  type WorkerFailedError,
} from './errors'
import type {SupertonicVoiceSource, SupertonicWorkerInput, SupertonicWorkerOutput} from './messages'
import {
  getSupertonicAssetUrl,
  getSupertonicModel,
  getSupertonicModelFileUrl,
  getSupertonicVoiceUrl,
  SUPERTONIC_ORT_WASM_URL,
  type SupertonicModel,
  type SupertonicVoiceId,
} from './model'
import {failureResult, type Result, successResult} from './result'
import {splitSpeechText} from './text-chunking'

const workerScope = self as DedicatedWorkerGlobalScope
const modelStorage = createModelStorage()
const voiceCache = new Map<SupertonicVoiceId, SupertonicVoice>()
const REQUEST_TIMEOUT_STATUS = 408
const TOO_MANY_REQUESTS_STATUS = 429
const SERVER_ERROR_STATUS = 500
let engine: SupertonicEngine | null = null
let activeModel: SupertonicModel | null = null
let activeAbortController: AbortController | null = null

type MutableSupertonicSessions = {
  -readonly [Key in keyof SupertonicSessions]?: SupertonicSessions[Key]
}

interface FetchBufferOptions {
  readonly expectedSize: number
  readonly fileName: string
  readonly loadedBefore: number
  readonly signal: AbortSignal
  readonly totalBytes: number
  readonly url: string
}

interface FetchJsonOptions {
  readonly fileName: string
  readonly signal: AbortSignal
  readonly url: string
}

interface GeneratedAudio {
  readonly generationTime: number
  readonly sampleRate: number
  readonly samples: Float32Array
}

type Backend = 'wasm' | 'webgpu'

const finishCacheWrite = async (cacheWrite: Promise<Result<void, ModelStorageError>>) => {
  const result = await cacheWrite

  if (!result.ok) {
    reportModelStorageError(result.error)
  }
}

const postMessage = (
  message: SupertonicWorkerOutput,
  transfer: ReadonlyArray<Transferable> = [],
) => {
  workerScope.postMessage(message, Array.from(transfer))
}

const createCancelledError = (phase: CancelledError['phase']): CancelledError => ({
  code: 'cancelled',
  phase,
  retryable: false,
})

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError'

const createDownloadError = (
  options: Pick<FetchBufferOptions, 'fileName'> | Pick<FetchJsonOptions, 'fileName'>,
  status: number | null,
): DownloadFailedError => ({
  code: 'download-failed',
  fileName: options.fileName,
  phase: 'download',
  retryable:
    status === null ||
    status === REQUEST_TIMEOUT_STATUS ||
    status === TOO_MANY_REQUESTS_STATUS ||
    status >= SERVER_ERROR_STATUS,
  status,
})

const createBackendError = (backend: Backend, error: unknown): BackendFailedError => ({
  backend,
  code: 'backend-failed',
  detail: getErrorDetail(error),
  phase: 'initialize',
  retryable: backend === 'webgpu',
})

const createWorkerError = (
  phase: WorkerFailedError['phase'],
  error: unknown,
): WorkerFailedError => ({
  code: 'worker-failed',
  detail: getErrorDetail(error),
  phase,
  retryable: true,
})

const fetchBuffer = async (
  options: FetchBufferOptions,
): Promise<Result<ArrayBuffer, CancelledError | DownloadFailedError>> => {
  try {
    const resource = await loadModelResource({
      onStorageError: reportModelStorageError,
      signal: options.signal,
      storage: modelStorage,
      url: options.url,
    })
    const {response} = resource

    if (!response.ok) {
      return failureResult(createDownloadError(options, response.status))
    }

    if (response.body === null) {
      const buffer = await response.arrayBuffer()
      await finishCacheWrite(resource.cacheWrite)
      return successResult(buffer)
    }

    const reader = response.body.getReader()
    const chunks: Array<Uint8Array> = []
    let received = 0

    while (true) {
      const result = await reader.read()

      if (result.done) {
        break
      }

      chunks.push(result.value)
      received += result.value.byteLength
      postMessage({
        progress: {
          fileName: options.fileName,
          loadedBytes: options.loadedBefore + Math.min(received, options.expectedSize),
          totalBytes: options.totalBytes,
        },
        type: 'progress',
      })
    }

    const buffer = new Uint8Array(received)
    let offset = 0

    for (const chunk of chunks) {
      buffer.set(chunk, offset)
      offset += chunk.byteLength
    }

    await finishCacheWrite(resource.cacheWrite)
    return successResult(buffer.buffer)
  } catch (error: unknown) {
    return failureResult(
      isAbortError(error) ? createCancelledError('download') : createDownloadError(options, null),
    )
  }
}

const releaseSessions = async (sessions: MutableSupertonicSessions) => {
  await Promise.all(
    Object.values(sessions).map(async (session) => {
      await session.release()
    }),
  )
}

const loadSessions = async (
  backend: Backend,
  model: SupertonicModel,
  signal: AbortSignal,
): Promise<Result<SupertonicSessions, SupertonicError>> => {
  const sessions: MutableSupertonicSessions = {}
  let loadedBytes = 0

  for (const file of model.files) {
    const bufferResult = await fetchBuffer({
      expectedSize: file.size,
      fileName: file.name,
      loadedBefore: loadedBytes,
      signal,
      totalBytes: model.size,
      url: getSupertonicModelFileUrl(model, file),
    })

    if (!bufferResult.ok) {
      await releaseSessions(sessions)
      return bufferResult
    }

    try {
      sessions[file.key] = await InferenceSession.create(bufferResult.value, {
        executionProviders: [backend],
        graphOptimizationLevel: 'all',
        logSeverityLevel: 3,
      })
      loadedBytes += file.size
    } catch (error: unknown) {
      await releaseSessions(sessions)
      return failureResult(createBackendError(backend, error))
    }
  }

  return successResult(sessions as SupertonicSessions)
}

const fetchJson = async (
  options: FetchJsonOptions,
): Promise<Result<unknown, CancelledError | DownloadFailedError>> => {
  try {
    const resource = await loadModelResource({
      onStorageError: reportModelStorageError,
      signal: options.signal,
      storage: modelStorage,
      url: options.url,
    })
    const {response} = resource

    if (!response.ok) {
      return failureResult(createDownloadError(options, response.status))
    }

    const value: unknown = await response.json()
    await finishCacheWrite(resource.cacheWrite)
    return successResult(value)
  } catch (error: unknown) {
    return failureResult(
      isAbortError(error) ? createCancelledError('download') : createDownloadError(options, null),
    )
  }
}

const initialize = async (model: SupertonicModel): Promise<Result<Backend, SupertonicError>> => {
  const abortController = new AbortController()
  activeAbortController = abortController
  env.wasm.numThreads = 1
  env.wasm.wasmPaths = SUPERTONIC_ORT_WASM_URL
  const workerNavigator = workerScope.navigator as WorkerNavigator & {gpu?: unknown}
  const canUseWebGpu = workerNavigator.gpu !== undefined && model.preferredBackend === 'webgpu'
  let backend: Backend = canUseWebGpu ? 'webgpu' : 'wasm'
  let sessions: SupertonicSessions

  try {
    let sessionResult = await loadSessions(backend, model, abortController.signal)

    if (
      !sessionResult.ok &&
      sessionResult.error.code === 'backend-failed' &&
      backend === 'webgpu'
    ) {
      postMessage({
        message: 'WebGPU를 사용할 수 없어 WASM으로 다시 준비하고 있어요.',
        type: 'status',
      })
      backend = 'wasm'
      sessionResult = await loadSessions(backend, model, abortController.signal)
    }

    if (!sessionResult.ok) {
      return sessionResult
    }

    sessions = sessionResult.value
    const [configResponse, indexerResponse] = await Promise.all([
      fetchJson({
        fileName: '모델 설정',
        signal: abortController.signal,
        url: getSupertonicAssetUrl('onnx/tts.json'),
      }),
      fetchJson({
        fileName: '문자 인덱서',
        signal: abortController.signal,
        url: getSupertonicAssetUrl('onnx/unicode_indexer.json'),
      }),
    ])

    if (!configResponse.ok) {
      await releaseSessions(sessions)
      return failureResult(configResponse.error)
    }

    if (!indexerResponse.ok) {
      await releaseSessions(sessions)
      return failureResult(indexerResponse.error)
    }

    const configResult = parseSupertonicConfig(configResponse.value)
    const indexerResult = parseSupertonicIndexer(indexerResponse.value)

    if (!configResult.ok) {
      await releaseSessions(sessions)
      return failureResult(configResult.error)
    }

    if (!indexerResult.ok) {
      await releaseSessions(sessions)
      return failureResult(indexerResult.error)
    }

    if (abortController.signal.aborted) {
      await releaseSessions(sessions)
      return failureResult(createCancelledError('initialize'))
    }

    engine = new SupertonicEngine(configResult.value, indexerResult.value, sessions)
    activeModel = model
    return successResult(backend)
  } finally {
    if (activeAbortController === abortController) {
      activeAbortController = null
    }
  }
}

const getVoice = async (
  voice: SupertonicVoiceSource,
  signal: AbortSignal,
): Promise<Result<SupertonicVoice, SupertonicError>> => {
  if (voice.kind === 'custom') {
    return successResult(createSupertonicVoice(voice.value))
  }

  const cachedVoice = voiceCache.get(voice.id)

  if (cachedVoice !== undefined) {
    return successResult(cachedVoice)
  }

  const response = await fetchJson({
    fileName: `${voice.id} 목소리`,
    signal,
    url: getSupertonicVoiceUrl(voice.id),
  })

  if (!response.ok) {
    return response
  }

  const voiceResult = parseSupertonicVoice(response.value)

  if (voiceResult.ok) {
    voiceCache.set(voice.id, voiceResult.value)
  }

  return voiceResult
}

const generate = async (
  message: Extract<SupertonicWorkerInput, {type: 'generate'}>,
): Promise<Result<GeneratedAudio, SupertonicError>> => {
  if (engine === null || activeModel === null) {
    return failureResult({
      code: 'model-not-ready',
      phase: 'generate',
      retryable: false,
    })
  }

  const currentEngine = engine
  const currentModel = activeModel
  const abortController = new AbortController()
  activeAbortController = abortController
  const startedAt = performance.now()

  try {
    const voiceResult = await getVoice(message.voice, abortController.signal)

    if (!voiceResult.ok) {
      return voiceResult
    }

    const textChunks = splitSpeechText(message.text, currentModel.speechPolicy)
    const audioChunks: Array<Float32Array> = []

    for (const [chunkIndex, text] of textChunks.entries()) {
      const chunkNumber = chunkIndex + 1
      const chunkStartedAt = performance.now()
      const samples = await currentEngine.generate({
        onProgress: (step, total) => {
          postMessage({
            message: `음성 ${chunkNumber}/${textChunks.length} 다듬는 중 ${step}/${total}`,
            type: 'status',
          })
        },
        speed: message.speed,
        text,
        voice: voiceResult.value,
      })
      audioChunks.push(samples)
      postMessage({
        generationTime: Math.round(performance.now() - chunkStartedAt),
        index: chunkIndex,
        requestId: message.requestId,
        sampleRate: currentEngine.sampleRate,
        samples,
        total: textChunks.length,
        type: 'chunk',
      })

      if (abortController.signal.aborted) {
        return failureResult(createCancelledError('generate'))
      }
    }

    const samples = joinAudioChunks({
      chunks: audioChunks,
      sampleRate: currentEngine.sampleRate,
      silenceDuration: currentModel.speechPolicy.silenceDuration,
    })

    if (abortController.signal.aborted) {
      return failureResult(createCancelledError('generate'))
    }

    return successResult({
      generationTime: Math.round(performance.now() - startedAt),
      sampleRate: currentEngine.sampleRate,
      samples,
    })
  } catch (error: unknown) {
    return failureResult(createWorkerError('generate', error))
  } finally {
    if (activeAbortController === abortController) {
      activeAbortController = null
    }
  }
}

workerScope.onmessage = async (event: MessageEvent<SupertonicWorkerInput>) => {
  const message = event.data

  try {
    switch (message.type) {
      case 'dispose':
        activeAbortController?.abort()
        await engine?.release()
        engine = null
        activeModel = null
        voiceCache.clear()
        postMessage({type: 'disposed'})
        return
      case 'generate': {
        const result = await generate(message)

        if (result.ok) {
          postMessage(
            {
              generationTime: result.value.generationTime,
              requestId: message.requestId,
              sampleRate: result.value.sampleRate,
              samples: result.value.samples,
              type: 'result',
            },
            [result.value.samples.buffer],
          )
        } else {
          postMessage({error: result.error, requestId: message.requestId, type: 'error'})
        }
        return
      }
      case 'initialize': {
        let model: SupertonicModel

        try {
          model = getSupertonicModel(message.modelId)
        } catch {
          postMessage({
            error: {
              code: 'invalid-model',
              modelId: message.modelId,
              phase: 'initialize',
              retryable: false,
            },
            requestId: null,
            type: 'error',
          })
          return
        }

        const result = await initialize(model)

        if (result.ok) {
          postMessage({backend: result.value, type: 'ready'})
        } else {
          postMessage({error: result.error, requestId: null, type: 'error'})
        }
        return
      }
    }

    message satisfies never
  } catch (error: unknown) {
    postMessage({
      error: createWorkerError(message.type === 'generate' ? 'generate' : 'initialize', error),
      requestId: message.type === 'generate' ? message.requestId : null,
      type: 'error',
    })
  }
}
