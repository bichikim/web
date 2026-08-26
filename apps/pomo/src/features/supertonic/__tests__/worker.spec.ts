/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {ModelResource} from '../../model-storage'
import type {Result} from '../../result'
import type {SupertonicSessions, SupertonicVoice} from '../engine'
import type {SupertonicError} from '../errors'
import type {SupertonicWorkerInput, SupertonicWorkerOutput} from '../messages'
import type {InitializationAssets, ModelAssets} from '../model-assets'
import type {SupertonicModel} from '../model'
import type {SupertonicBackend, SupertonicRuntime} from '../runtime'
import type {LoadBufferOptions} from '../sessions'

const httpMocks = vi.hoisted(() => ({fetch: vi.fn()}))
const storageMocks = vi.hoisted(() => ({
  create: vi.fn(),
  load: vi.fn(),
  report: vi.fn(),
}))
const audioMocks = vi.hoisted(() => ({join: vi.fn()}))
const engineMocks = vi.hoisted(() => ({
  Constructor: vi.fn(),
  createVoice: vi.fn(),
  parseVoice: vi.fn(),
}))
const assetMocks = vi.hoisted(() => ({
  getVoiceUrl: vi.fn(),
  parse: vi.fn(),
}))
const modelMocks = vi.hoisted(() => ({
  getAssetUrl: vi.fn(),
  getModel: vi.fn(),
}))
const runtimeMocks = vi.hoisted(() => ({load: vi.fn()}))
const sessionMocks = vi.hoisted(() => ({load: vi.fn(), release: vi.fn()}))
const textMocks = vi.hoisted(() => ({split: vi.fn()}))

vi.mock('../../http-client', () => ({httpFetch: httpMocks.fetch}))
vi.mock('../../model-storage', () => ({
  createModelStorage: storageMocks.create,
  loadModelResource: storageMocks.load,
  reportModelStorageError: storageMocks.report,
}))
vi.mock('../audio', () => ({joinAudioChunks: audioMocks.join}))
vi.mock('../engine', () => ({
  createSupertonicVoice: engineMocks.createVoice,
  parseSupertonicVoice: engineMocks.parseVoice,
  SupertonicEngine: engineMocks.Constructor,
}))
vi.mock('../model-assets', () => ({
  getVoiceStyleUrl: assetMocks.getVoiceUrl,
  parseInitializationAssets: assetMocks.parse,
}))
vi.mock('../model', () => ({
  getSupertonicAssetUrl: modelMocks.getAssetUrl,
  getSupertonicModel: modelMocks.getModel,
  SUPERTONIC_MODEL_ASSETS_URL: '/manifest.json',
}))
vi.mock('../runtime', () => ({loadSupertonicRuntime: runtimeMocks.load}))
vi.mock('../sessions', () => ({
  loadSessions: sessionMocks.load,
  releaseSessions: sessionMocks.release,
}))
vi.mock('../text-chunking', () => ({splitSpeechText: textMocks.split}))

type WorkerMessageHandler = (event: MessageEvent<SupertonicWorkerInput>) => Promise<void>

interface WorkerScopeMock {
  readonly location: {readonly origin: string}
  readonly navigator: {readonly gpu?: unknown}
  onmessage: WorkerMessageHandler | null
  readonly postMessage: ReturnType<typeof vi.fn>
}

interface EngineMock {
  readonly generate: ReturnType<typeof vi.fn>
  readonly release: ReturnType<typeof vi.fn>
  readonly sampleRate: number
}

const success = <Value>(value: Value): Result<Value, never> => ({ok: true, value})
const failure = <ErrorValue>(error: ErrorValue): Result<never, ErrorValue> => ({error, ok: false})

const backendError = (backend: SupertonicBackend = 'webgpu'): SupertonicError => ({
  backend,
  code: 'backend-failed',
  detail: 'backend unavailable',
  phase: 'initialize',
  retryable: backend === 'webgpu',
})

const validationError: SupertonicError = {
  asset: 'manifest',
  code: 'invalid-model-data',
  phase: 'validate',
  retryable: false,
}

const modelAssets = {
  models: {supertonic3: {revision: 'test', voiceStyles: {}}},
  version: 1,
} as unknown as ModelAssets

const initializationAssets = {
  config: {
    ae: {base_chunk_size: 1, sample_rate: 24_000},
    ttl: {chunk_compress_factor: 1, latent_dim: 1},
  },
  indexer: [],
  modelAssets,
} satisfies InitializationAssets

const fullModel = {
  baseUrl: 'https://models.test/full',
  description: 'test model',
  files: [],
  id: 'full',
  label: 'Full',
  preferredBackend: 'webgpu',
  size: 0,
  speechPolicy: {
    considerSplitLength: 120,
    locale: 'ko',
    maximumLength: 200,
    recommendedLength: 150,
    silenceDuration: 0.3,
  },
} satisfies SupertonicModel

const wasmModel = {
  ...fullModel,
  id: 'int8',
  label: 'INT8',
  preferredBackend: 'wasm',
} satisfies SupertonicModel
const runtime = {} as SupertonicRuntime
const sessions = {} as SupertonicSessions
const voice = {} as SupertonicVoice
let currentEngine: EngineMock

const jsonResponse = (value: unknown = {ok: true}, status = 200) =>
  new Response(JSON.stringify(value), {
    headers: {'content-type': 'application/json'},
    status,
  })

const modelResource = (response: Response): ModelResource => ({
  cacheWrite: Promise.resolve(success(undefined)),
  response,
  source: 'network',
})

const createScope = (hasGpu: boolean): WorkerScopeMock => ({
  location: {origin: 'https://pomo.test'},
  navigator: hasGpu ? {gpu: {}} : {},
  onmessage: null,
  postMessage: vi.fn(),
})

const loadWorker = async (hasGpu = true) => {
  const scope = createScope(hasGpu)
  vi.stubGlobal('self', scope)
  await import('../worker')

  const dispatch = async (message: SupertonicWorkerInput) => {
    if (scope.onmessage === null) {
      throw new Error('Expected the Supertonic Worker message listener to be registered.')
    }

    await scope.onmessage({data: message} as MessageEvent<SupertonicWorkerInput>)
  }

  return {dispatch, scope}
}

const initialize = async (
  worker: Awaited<ReturnType<typeof loadWorker>>,
  modelId: 'full' | 'int8' = 'full',
) => {
  await worker.dispatch({modelId, type: 'initialize'})
}

const generateMessage = (
  overrides: Partial<Extract<SupertonicWorkerInput, {type: 'generate'}>> = {},
): Extract<SupertonicWorkerInput, {type: 'generate'}> => ({
  language: 'ko',
  requestId: 7,
  speed: 1,
  text: '안녕하세요.',
  type: 'generate',
  voice: {
    kind: 'custom',
    value: {duration: {data: [1], dimensions: [1]}, speech: {data: [1], dimensions: [1]}},
  },
  ...overrides,
})

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  currentEngine = {
    generate: vi.fn().mockResolvedValue(Float32Array.of(0.1, 0.2)),
    release: vi.fn().mockResolvedValue(undefined),
    sampleRate: 24_000,
  }
  storageMocks.create.mockReturnValue({})
  storageMocks.load.mockImplementation(async () => modelResource(jsonResponse()))
  httpMocks.fetch.mockImplementation(async () => jsonResponse())
  audioMocks.join.mockReturnValue(Float32Array.of(0.1, 0.2))
  engineMocks.Constructor.mockImplementation(function createEngineMock() {
    return currentEngine
  })
  engineMocks.createVoice.mockReturnValue(voice)
  engineMocks.parseVoice.mockReturnValue(success(voice))
  assetMocks.getVoiceUrl.mockReturnValue('https://models.test/voice.json')
  assetMocks.parse.mockReturnValue(success(initializationAssets))
  modelMocks.getAssetUrl.mockImplementation((path: string) => `https://models.test/${path}`)
  modelMocks.getModel.mockReturnValue(fullModel)
  runtimeMocks.load.mockResolvedValue(runtime)
  sessionMocks.load.mockResolvedValue(success(sessions))
  sessionMocks.release.mockResolvedValue(undefined)
  textMocks.split.mockImplementation((text: string) => [text])
  vi.spyOn(performance, 'now').mockReturnValue(100)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('initialization', () => {
  it('should reject an unsupported model id', async () => {
    modelMocks.getModel.mockImplementation(() => {
      throw new Error('invalid model')
    })
    const worker = await loadWorker()

    await worker.dispatch({modelId: 'full', type: 'initialize'})

    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {
        error: {
          code: 'invalid-model',
          modelId: 'full',
          phase: 'initialize',
          retryable: false,
        },
        requestId: null,
        type: 'error',
      },
      [],
    )
  })

  it('should initialize WebGPU and stream model bytes with bounded progress', async () => {
    const cacheError = {cause: new Error('cache full'), operation: 'write'} as const
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(Uint8Array.of(1, 2))
        controller.enqueue(Uint8Array.of(3, 4))
        controller.close()
      },
    })
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      options.url.endsWith('.onnx')
        ? {
            cacheWrite: Promise.resolve(failure(cacheError)),
            response: new Response(stream),
            source: 'network' as const,
          }
        : modelResource(jsonResponse()),
    )
    sessionMocks.load.mockImplementation(
      async (options: {
        loadBuffer: (
          bufferOptions: LoadBufferOptions,
        ) => Promise<Result<ArrayBuffer, SupertonicError>>
      }) => {
        const buffer = await options.loadBuffer({
          expectedSize: 3,
          fileName: '음성 모델',
          loadedBefore: 5,
          signal: new AbortController().signal,
          totalBytes: 20,
          url: 'https://models.test/model.onnx',
        })
        expect(buffer).toEqual(success(Uint8Array.of(1, 2, 3, 4).buffer))
        return success(sessions)
      },
    )
    const worker = await loadWorker()

    await initialize(worker)

    expect(runtimeMocks.load).toHaveBeenCalledWith('webgpu')
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {
        progress: {fileName: '음성 모델', loadedBytes: 7, totalBytes: 20},
        type: 'progress',
      },
      [],
    )
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {
        progress: {fileName: '음성 모델', loadedBytes: 8, totalBytes: 20},
        type: 'progress',
      },
      [],
    )
    expect(storageMocks.report).toHaveBeenCalledWith(cacheError)
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {backend: 'webgpu', type: 'ready'},
      [],
    )
  })

  it('should load a bodyless model response and keep a successful cache write silent', async () => {
    const buffer = Uint8Array.of(9, 8).buffer
    const response = {
      arrayBuffer: vi.fn().mockResolvedValue(buffer),
      body: null,
      ok: true,
    } as unknown as Response
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      options.url.endsWith('.onnx') ? modelResource(response) : modelResource(jsonResponse()),
    )
    sessionMocks.load.mockImplementation(
      async (options: {
        loadBuffer: (
          bufferOptions: LoadBufferOptions,
        ) => Promise<Result<ArrayBuffer, SupertonicError>>
      }) => {
        const result = await options.loadBuffer({
          expectedSize: 2,
          fileName: '보코더',
          loadedBefore: 0,
          signal: new AbortController().signal,
          totalBytes: 2,
          url: 'https://models.test/vocoder.onnx',
        })
        expect(result).toEqual(success(buffer))
        return success(sessions)
      },
    )
    const worker = await loadWorker(false)

    await initialize(worker)

    expect(runtimeMocks.load).toHaveBeenCalledWith('wasm')
    expect(storageMocks.report).not.toHaveBeenCalled()
  })

  it('should fall back from a WebGPU session failure to WASM', async () => {
    sessionMocks.load
      .mockResolvedValueOnce(failure(backendError('webgpu')))
      .mockResolvedValueOnce(success(sessions))
    runtimeMocks.load.mockResolvedValueOnce({backend: 'webgpu'}).mockResolvedValueOnce(runtime)
    const worker = await loadWorker()

    await initialize(worker)

    expect(runtimeMocks.load).toHaveBeenNthCalledWith(1, 'webgpu')
    expect(runtimeMocks.load).toHaveBeenNthCalledWith(2, 'wasm')
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {message: 'WebGPU를 사용할 수 없어 WASM으로 다시 준비하고 있어요.', type: 'status'},
      [],
    )
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith({backend: 'wasm', type: 'ready'}, [])
  })

  it('should return a non-backend session failure without fallback', async () => {
    sessionMocks.load.mockResolvedValue(failure(validationError))
    const worker = await loadWorker()

    await initialize(worker)

    expect(runtimeMocks.load).toHaveBeenCalledOnce()
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {error: validationError, requestId: null, type: 'error'},
      [],
    )
  })

  it('should not fall back when a WASM backend session fails', async () => {
    modelMocks.getModel.mockReturnValue(wasmModel)
    sessionMocks.load.mockResolvedValue(failure(backendError('wasm')))
    const worker = await loadWorker()

    await initialize(worker, 'int8')

    expect(runtimeMocks.load).toHaveBeenCalledWith('wasm')
    expect(runtimeMocks.load).toHaveBeenCalledOnce()
  })

  it('should release sessions when disposal aborts initialization', async () => {
    let finishSessions: (result: Result<SupertonicSessions, SupertonicError>) => void = () =>
      undefined
    sessionMocks.load.mockReturnValue(
      new Promise((resolve) => {
        finishSessions = resolve
      }),
    )
    const worker = await loadWorker()
    const initializing = initialize(worker)
    await vi.waitFor(() => expect(sessionMocks.load).toHaveBeenCalledOnce())

    await worker.dispatch({type: 'dispose'})
    finishSessions(success(sessions))
    await initializing

    expect(sessionMocks.release).toHaveBeenCalledWith(sessions)
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {
        error: {code: 'cancelled', phase: 'initialize', retryable: false},
        requestId: null,
        type: 'error',
      },
      [],
    )
  })

  it('should keep the latest initialization controller active', async () => {
    let finishFirst: (result: Result<SupertonicSessions, SupertonicError>) => void = () => undefined
    sessionMocks.load
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve
        }),
      )
      .mockResolvedValueOnce(success(sessions))
    const worker = await loadWorker()
    const first = initialize(worker)
    await vi.waitFor(() => expect(sessionMocks.load).toHaveBeenCalledOnce())

    await initialize(worker)
    finishFirst(success(sessions))
    await first

    expect(worker.scope.postMessage).toHaveBeenCalledTimes(2)
  })
})
