/** @vitest-environment jsdom */

import {createRoot, createSignal, onCleanup} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useModelDownload} from 'src/features/model-download'
import type {ModelDownloadResult} from 'src/features/model-download/controller'
import type {TarotWorkerResponse} from 'src/features/tarot/messages'
import {type TarotReadingController, useTarotReading} from 'src/features/tarot/use-tarot-reading'

const mocks = vi.hoisted(() => ({
  cancelDownload: vi.fn(),
  dispose: vi.fn(),
  downloaded: vi.fn<() => Promise<boolean>>(),
  generate: vi.fn(),
  modelId: 'gemma-4-e2b' as 'gemma-4-e2b' | 'lfm-2.6b-qad',
  onResponse: null as ((response: TarotWorkerResponse) => void) | null,
  setModelId: null as ((id: 'gemma-4-e2b' | 'lfm-2.6b-qad') => void) | null,
  startTextModel: vi.fn<() => Promise<ModelDownloadResult>>(),
  supported: true,
}))

vi.mock('src/features/model-download', () => ({
  useModelDownload: vi.fn(),
}))
vi.mock('src/features/text-generation', () => ({
  isTextModelDownloaded: mocks.downloaded,
  supportsWebGpu: () => mocks.supported,
}))
vi.mock('src/features/tarot/client', () => ({
  createTarotClient: (options: {onResponse: (response: TarotWorkerResponse) => void}) => {
    mocks.onResponse = options.onResponse
    return {dispose: mocks.dispose, generate: mocks.generate}
  },
}))
vi.mock('src/features/text-generation/use-default-text-model', () => ({
  useDefaultTextModel: () => {
    const [modelId, setModelId] = createSignal(mocks.modelId)
    mocks.setModelId = setModelId
    return modelId
  },
}))

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('tarot unsupported after default model change', () => {
  let dispose: () => void
  let reading: TarotReadingController

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.onResponse = null
    mocks.modelId = 'gemma-4-e2b'
    mocks.supported = false
    mocks.downloaded.mockResolvedValue(true)
    mocks.startTextModel.mockResolvedValue({status: 'complete'})
    vi.mocked(useModelDownload).mockReturnValue({
      cancel: mocks.cancelDownload,
      dismissError: vi.fn(),
      dispose: vi.fn(),
      downloads: () => [],
      startImageModel: vi.fn(),
      startTextModel: mocks.startTextModel,
      startVoiceModel: vi.fn(),
      state: () => ({status: 'idle'}),
    })
    createRoot((cleanup) => {
      dispose = cleanup
      reading = useTarotReading({locale: () => 'ko'})
    })
  })

  afterEach(() => dispose())

  it('should re-check support when the default text model changes after an unsupported draw', async () => {
    reading.draw()
    await flush()
    const selected = reading.cards()

    expect(selected.length).toBeGreaterThan(0)
    expect(reading.status()).toBe('unsupported')
    expect(mocks.downloaded).not.toHaveBeenCalled()

    mocks.setModelId?.('lfm-2.6b-qad')
    await flush()

    expect(reading.status()).not.toBe('unsupported')
    expect(reading.cards()).toBe(selected)
    expect(mocks.downloaded).toHaveBeenCalledWith({modelId: 'lfm-2.6b-qad'})
  })
})
