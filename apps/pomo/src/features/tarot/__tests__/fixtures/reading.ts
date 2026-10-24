import {type Accessor, createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, vi} from 'vitest'
import {useModelDownload} from '../../../model-download'
import type {ModelDownloadResult} from '../../../model-download/controller'
import type {IsTextModelDownloadedOptions} from '../../../text-generation/download'
import type {CreateTarotClientOptions, TarotClient} from '../../client'
import type {TarotWorkerResponse} from '../../messages'
import {type TarotReadingController, useTarotReading} from '../../use-tarot-reading'

type TestTextModelId = 'cloud' | 'gemma-4-e2b' | 'lfm-2.6b-qad'

const mocks = vi.hoisted(() => ({
  cancelDownload: vi.fn(),
  createClient: vi.fn<(options: CreateTarotClientOptions) => TarotClient>(),
  defaultModel: vi.fn<() => Accessor<TestTextModelId>>(),
  dispose: vi.fn(),
  downloaded: vi.fn<(options: IsTextModelDownloadedOptions) => Promise<boolean>>(),
  generate: vi.fn(),
  modelId: 'gemma-4-e2b' as TestTextModelId,
  onResponse: null as ((response: TarotWorkerResponse) => void) | null,
  responses: [] as Array<(response: TarotWorkerResponse) => void>,
  setModelId: null as ((modelId: TestTextModelId) => void) | null,
  startTextModel: vi.fn<() => Promise<ModelDownloadResult>>(),
  startVoiceModel: vi.fn<() => Promise<ModelDownloadResult>>(),
  supported: true,
  supportsWebGpu: vi.fn<() => boolean>(),
  voiceDownloaded: vi.fn<() => Promise<boolean>>(),
}))

export {mocks}

vi.mock('../../../model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('../../../text-generation', () => ({
  isTextModelDownloaded: mocks.downloaded,
  supportsWebGpu: mocks.supportsWebGpu,
}))
vi.mock('../../../supertonic/download', () => ({
  isSupertonicModelDownloaded: mocks.voiceDownloaded,
}))
vi.mock('../../client', () => ({createTarotClient: mocks.createClient}))
vi.mock('src/features/text-generation/use-default-text-model', () => ({
  useDefaultTextModel: mocks.defaultModel,
}))

interface TarotReadingFixture {
  /** 테스트 중 소유자를 교체하면 새 해제 함수로 갱신합니다. */
  dispose: () => void
  /** 현재 소유자의 실제 타로 컨트롤러입니다. */
  reading: TarotReadingController
  /** 현재 소유자의 언어 입력을 변경합니다. */
  setLocale: (locale: 'en' | 'ko') => void
}

export const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

export const setupTarotReading = () => {
  let fixture: TarotReadingFixture

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generate.mockReset()
    mocks.onResponse = null
    mocks.responses.length = 0
    mocks.setModelId = null
    mocks.modelId = 'gemma-4-e2b'
    mocks.supported = true
    mocks.downloaded.mockResolvedValue(true)
    mocks.startTextModel.mockResolvedValue({status: 'complete'})
    mocks.startVoiceModel.mockResolvedValue({status: 'complete'})
    mocks.voiceDownloaded.mockResolvedValue(true)
    mocks.supportsWebGpu.mockImplementation(() => mocks.supported)
    mocks.defaultModel.mockImplementation(() => {
      const [modelId, setModelId] = createSignal(mocks.modelId)
      mocks.setModelId = setModelId
      return modelId
    })
    mocks.createClient.mockImplementation((options) => {
      mocks.onResponse = options.onResponse
      mocks.responses.push(options.onResponse)
      return {dispose: mocks.dispose, generate: mocks.generate}
    })
    vi.mocked(useModelDownload).mockReturnValue({
      cancel: mocks.cancelDownload,
      dismissError: vi.fn(),
      dispose: vi.fn(),
      downloads: () => [],
      startImageModel: vi.fn(),
      startTextModel: mocks.startTextModel,
      startVoiceModel: mocks.startVoiceModel,
      state: () => ({status: 'idle'}),
    })
    fixture = createRoot((dispose) => {
      const [locale, setLocale] = createSignal<'en' | 'ko'>('ko')
      return {dispose, reading: useTarotReading({locale}), setLocale}
    })
  })

  afterEach(() => fixture.dispose())

  return () => fixture
}
