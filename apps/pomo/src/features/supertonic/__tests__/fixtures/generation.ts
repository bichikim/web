/** @vitest-environment jsdom */

import {getMonotonicTime} from 'src/utils/get-monotonic-time'

vi.mock('src/utils/get-monotonic-time', () => ({getMonotonicTime: vi.fn()}))

import {afterEach, beforeEach, vi} from 'vitest'

import type {ModelResource} from '../../../model-storage'
import type {Result} from 'src/features/result'
import type {SupertonicSessions, SupertonicVoice} from '../../engine'
import type {SupertonicError} from '../../errors'
import type {SupertonicWorkerInput, SupertonicWorkerOutput} from '../../messages'
import type {InitializationAssets, ModelAssets} from '../../model-assets'
import type {SupertonicModel} from '../../model'
import type {SupertonicRuntime} from '../../runtime'

const httpMocks = vi.hoisted(() => ({fetch: vi.fn()}))
const storageMocksHoisted = vi.hoisted(() => ({
  create: vi.fn(),
  load: vi.fn(),
  report: vi.fn(),
}))
const audioMocksHoisted = vi.hoisted(() => ({join: vi.fn()}))
const engineMocksHoisted = vi.hoisted(() => ({
  Constructor: vi.fn(),
  createVoice: vi.fn(),
  parseVoice: vi.fn(),
}))
const assetMocksHoisted = vi.hoisted(() => ({
  getVoiceUrl: vi.fn(),
  parse: vi.fn(),
}))
const modelMocks = vi.hoisted(() => ({
  getAssetUrl: vi.fn(),
  getModel: vi.fn(),
}))
const runtimeMocksHoisted = vi.hoisted(() => ({load: vi.fn()}))
const sessionMocks = vi.hoisted(() => ({load: vi.fn(), release: vi.fn()}))
const textMocksHoisted = vi.hoisted(() => ({split: vi.fn()}))

vi.mock('../../../http-client', () => ({httpFetch: httpMocks.fetch}))
vi.mock('../../../model-storage', () => ({
  createModelStorage: storageMocksHoisted.create,
  loadModelResource: storageMocksHoisted.load,
  reportModelStorageError: storageMocksHoisted.report,
}))
vi.mock('../../audio', () => ({joinAudioChunks: audioMocksHoisted.join}))
vi.mock('../../engine', () => ({
  createSupertonicVoice: engineMocksHoisted.createVoice,
  parseSupertonicVoice: engineMocksHoisted.parseVoice,
  SupertonicEngine: engineMocksHoisted.Constructor,
}))
vi.mock('../../model-assets', () => ({
  getVoiceStyleUrl: assetMocksHoisted.getVoiceUrl,
  parseInitializationAssets: assetMocksHoisted.parse,
}))
vi.mock('../../model', () => ({
  getSupertonicAssetUrl: modelMocks.getAssetUrl,
  getSupertonicModel: modelMocks.getModel,
  SUPERTONIC_MODEL_ASSETS_URL: '/manifest.json',
}))
vi.mock('../../runtime', () => ({loadSupertonicRuntime: runtimeMocksHoisted.load}))
vi.mock('../../sessions', () => ({
  loadSessions: sessionMocks.load,
  releaseSessions: sessionMocks.release,
}))
vi.mock('../../text-chunking', () => ({splitSpeechText: textMocksHoisted.split}))

const HTTP_OK = 200
const FIRST_SAMPLE = 0.1
const SECOND_SAMPLE = 0.2
const GENERATION_TIMESTAMP = 100

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

export const success = <Value>(value: Value): Result<Value, never> => ({ok: true, value})
export const failure = <ErrorValue>(error: ErrorValue): Result<never, ErrorValue> => ({
  error,
  ok: false,
})

export const validationError: SupertonicError = {
  asset: 'manifest',
  code: 'invalid-model-data',
  phase: 'validate',
  retryable: false,
}

export const modelAssets = {
  models: {supertonic3: {revision: 'test', voiceStyles: {}}},
  version: 1,
} as unknown as ModelAssets

export const initializationAssets = {
  config: {
    // oxlint-disable-next-line eslint-js/camelcase -- Supertonic model configuration field names.
    ae: {base_chunk_size: 1, sample_rate: 24_000},
    // oxlint-disable-next-line eslint-js/camelcase -- Supertonic model configuration field names.
    ttl: {chunk_compress_factor: 1, latent_dim: 1},
  },
  indexer: [],
  modelAssets,
} satisfies InitializationAssets

export const fullModel = {
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

export const runtime = {} as SupertonicRuntime
const sessions = {} as SupertonicSessions
export const voice = {} as SupertonicVoice
export let currentEngine: EngineMock

export const jsonResponse = (value: unknown = {ok: true}, status = HTTP_OK) =>
  new Response(JSON.stringify(value), {
    headers: {'content-type': 'application/json'},
    status,
  })

export const modelResource = (response: Response): ModelResource => ({
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

export const loadWorker = async (hasGpu = true) => {
  const scope = createScope(hasGpu)
  vi.stubGlobal('self', scope)
  await import('../../worker')

  const dispatch = async (message: SupertonicWorkerInput) => {
    if (scope.onmessage === null) {
      throw new Error('Expected the Supertonic Worker message listener to be registered.')
    }

    await scope.onmessage({data: message} as MessageEvent<SupertonicWorkerInput>)
  }

  return {dispatch, scope}
}

export const initialize = async (
  worker: Awaited<ReturnType<typeof loadWorker>>,
  modelId: 'full' | 'int8' = 'full',
) => {
  await worker.dispatch({modelId, type: 'initialize'})
}

export const generateMessage = (
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
    generate: vi.fn().mockResolvedValue(Float32Array.of(FIRST_SAMPLE, SECOND_SAMPLE)),
    release: vi.fn().mockResolvedValue(undefined),
    sampleRate: 24_000,
  }
  storageMocksHoisted.create.mockReturnValue({})
  storageMocksHoisted.load.mockImplementation(async () => modelResource(jsonResponse()))
  httpMocks.fetch.mockImplementation(async () => jsonResponse())
  audioMocksHoisted.join.mockReturnValue(Float32Array.of(FIRST_SAMPLE, SECOND_SAMPLE))
  engineMocksHoisted.Constructor.mockImplementation(function createEngineMock() {
    return currentEngine
  })
  engineMocksHoisted.createVoice.mockReturnValue(voice)
  engineMocksHoisted.parseVoice.mockReturnValue(success(voice))
  assetMocksHoisted.getVoiceUrl.mockReturnValue('https://models.test/voice.json')
  assetMocksHoisted.parse.mockReturnValue(success(initializationAssets))
  modelMocks.getAssetUrl.mockImplementation((path: string) => `https://models.test/${path}`)
  modelMocks.getModel.mockReturnValue(fullModel)
  runtimeMocksHoisted.load.mockResolvedValue(runtime)
  sessionMocks.load.mockResolvedValue(success(sessions))
  sessionMocks.release.mockResolvedValue(undefined)
  textMocksHoisted.split.mockImplementation((text: string) => [text])
  vi.mocked(getMonotonicTime).mockReturnValue(GENERATION_TIMESTAMP)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

export const storageMocks = storageMocksHoisted
export const audioMocks = audioMocksHoisted
export const engineMocks = engineMocksHoisted
export const assetMocks = assetMocksHoisted
export const runtimeMocks = runtimeMocksHoisted
export const textMocks = textMocksHoisted
