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

describe('generation', () => {
  it('should reject generation before a model is ready and ignore idle cancellation', async () => {
    const worker = await loadWorker()

    await worker.dispatch({type: 'cancel-generation'})
    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {code: 'model-not-ready', phase: 'generate', retryable: false},
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should generate and transfer custom-voice audio in ordered chunks', async () => {
    textMocks.split.mockReturnValue(['첫 문장', '둘째 문장'])
    currentEngine.generate
      .mockImplementationOnce(
        async (options: {onProgress: (step: number, total: number) => void}) => {
          options.onProgress(1, 2)
          return Float32Array.of(1)
        },
      )
      .mockResolvedValueOnce(Float32Array.of(2))
    const joined = Float32Array.of(1, 0, 2)
    audioMocks.join.mockReturnValue(joined)
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage())

    expect(currentEngine.generate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({language: 'ko', speed: 1, text: '첫 문장', voice}),
    )
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {message: '음성 1/2 다듬는 중 1/2', type: 'status'},
      [],
    )
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({index: 1, requestId: 7, total: 2, type: 'chunk'}),
      [],
    )
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        generationTime: 0,
        requestId: 7,
        sampleRate: 24_000,
        samples: joined,
        type: 'result',
      },
      [joined.buffer],
    )
  })

  it('should fetch and cache a preset voice between generations', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    const message = generateMessage({voice: {id: 'Yuna', kind: 'preset'}})

    await worker.dispatch(message)
    await worker.dispatch({...message, requestId: 8})

    expect(assetMocks.getVoiceUrl).toHaveBeenCalledOnce()
    expect(engineMocks.parseVoice).toHaveBeenCalledOnce()
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({requestId: 8, type: 'result'}),
      expect.any(Array),
    )
  })

  it('should return a preset voice validation failure without caching it', async () => {
    const voiceError = {...validationError, asset: 'voice'} as const
    engineMocks.parseVoice.mockReturnValue(failure(voiceError))
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage({voice: {id: 'Yuna', kind: 'preset'}}))

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {error: voiceError, requestId: 7, type: 'error'},
      [],
    )
  })

  it('should return a preset voice download failure', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      modelResource(
        options.url === 'https://models.test/voice.json' ? jsonResponse({}, 400) : jsonResponse(),
      ),
    )
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage({voice: {id: 'Yuna', kind: 'preset'}}))

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {
          code: 'download-failed',
          fileName: 'Yuna 목소리',
          phase: 'download',
          retryable: false,
          status: 400,
        },
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should reject preset generation when model assets are unavailable', async () => {
    assetMocks.parse.mockReturnValue(
      success({...initializationAssets, modelAssets: null as unknown as ModelAssets}),
    )
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage({voice: {id: 'Yuna', kind: 'preset'}}))

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {code: 'model-not-ready', phase: 'generate', retryable: false},
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should reject voice creation when the active runtime is unavailable', async () => {
    runtimeMocks.load.mockResolvedValue(null)
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {code: 'model-not-ready', phase: 'generate', retryable: false},
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should stop after a generation cancellation between chunks', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    currentEngine.generate.mockImplementationOnce(async () => {
      await worker.dispatch({type: 'cancel-generation'})
      return Float32Array.of(1)
    })

    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {code: 'cancelled', phase: 'generate', retryable: false},
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should stop after cancellation once empty chunks are joined', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    textMocks.split.mockImplementation(() => {
      void worker.dispatch({type: 'cancel-generation'})
      return []
    })

    await worker.dispatch(generateMessage())

    expect(audioMocks.join).toHaveBeenCalledOnce()
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({error: expect.objectContaining({code: 'cancelled'})}),
      [],
    )
  })

  it('should serialize unknown engine failures', async () => {
    currentEngine.generate.mockRejectedValue('generation failed')
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {
          code: 'worker-failed',
          detail: '알 수 없는 오류',
          phase: 'generate',
          retryable: true,
        },
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should preserve the latest controller across concurrent generations', async () => {
    let finishFirst: (samples: Float32Array) => void = () => undefined
    currentEngine.generate
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve
        }),
      )
      .mockResolvedValueOnce(Float32Array.of(2))
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    const first = worker.dispatch(generateMessage({requestId: 1}))
    await vi.waitFor(() => expect(currentEngine.generate).toHaveBeenCalledOnce())

    await worker.dispatch(generateMessage({requestId: 2}))
    finishFirst(Float32Array.of(1))
    await first

    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({requestId: 1, type: 'result'}),
      expect.any(Array),
    )
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({requestId: 2, type: 'result'}),
      expect.any(Array),
    )
  })
})

describe('worker lifecycle failures', () => {
  it('should dispose an initialized engine exactly once', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch({type: 'dispose'})
    await worker.dispatch({type: 'dispose'})

    expect(currentEngine.release).toHaveBeenCalledOnce()
    expect(worker.scope.postMessage).toHaveBeenNthCalledWith(1, {type: 'disposed'}, [])
    expect(worker.scope.postMessage).toHaveBeenNthCalledWith(2, {type: 'disposed'}, [])
  })

  it('should serialize runtime initialization failures', async () => {
    runtimeMocks.load.mockRejectedValue(new Error('runtime failed'))
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {
          code: 'worker-failed',
          detail: 'runtime failed',
          phase: 'initialize',
          retryable: true,
        },
        requestId: null,
        type: 'error',
      },
      [],
    )
  })

  it('should recover when posting a generated result throws', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    textMocks.split.mockReturnValue([])
    worker.scope.postMessage.mockImplementationOnce(() => {
      throw new Error('transfer failed')
    })

    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {
          code: 'worker-failed',
          detail: 'transfer failed',
          phase: 'generate',
          retryable: true,
        },
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should ignore an unknown message at runtime', async () => {
    const worker = await loadWorker()

    await worker.dispatch({type: 'unknown'} as unknown as SupertonicWorkerInput)

    expect(worker.scope.postMessage).not.toHaveBeenCalled()
  })

  it('should report engine release failures as initialization lifecycle errors', async () => {
    currentEngine.release.mockRejectedValue(new Error('release failed'))
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch({type: 'dispose'})

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({detail: 'release failed', phase: 'initialize'}),
        requestId: null,
      }),
      [],
    )
  })
})
