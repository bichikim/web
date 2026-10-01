import {createRoot, onCleanup} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {useModelDownload} from '../features/model-download'
import type {ModelDownloadResult} from '../features/model-download/controller'
import type {TarotWorkerResponse} from '../features/tarot/messages'
import {type TarotReadingController, useTarotReading} from '../features/tarot/use-tarot-reading'

const mocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  downloaded: vi.fn<() => Promise<boolean>>(),
  generate: vi.fn(),
  onResponse: null as ((response: TarotWorkerResponse) => void) | null,
  startTextModel: vi.fn<() => Promise<ModelDownloadResult>>(),
  startVoiceModel: vi.fn<() => Promise<ModelDownloadResult>>(),
  supported: true,
  voiceDownloaded: vi.fn<() => Promise<boolean>>(),
}))

vi.mock('../features/model-download', () => ({
  useModelDownload: vi.fn(),
}))
vi.mock('../features/text-generation', () => ({
  isTextModelDownloaded: mocks.downloaded,
  supportsWebGpu: () => mocks.supported,
}))
vi.mock('../features/supertonic/download', () => ({
  isSupertonicModelDownloaded: mocks.voiceDownloaded,
}))
vi.mock('../features/tarot/client', () => ({
  createTarotClient: (options: {onResponse: (response: TarotWorkerResponse) => void}) => {
    mocks.onResponse = options.onResponse
    return {dispose: mocks.dispose, generate: mocks.generate}
  },
}))

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('tarot locale without document reload', () => {
  const originalGetLocale = getLocale
  let dispose: () => void
  let reading: TarotReadingController

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.onResponse = null
    mocks.supported = true
    mocks.downloaded.mockResolvedValue(false)
    mocks.voiceDownloaded.mockResolvedValue(false)
    mocks.startTextModel.mockResolvedValue({status: 'complete'})
    mocks.startVoiceModel.mockResolvedValue({status: 'complete'})
    overwriteGetLocale(() => 'ko')
    vi.mocked(useModelDownload).mockReturnValue({
      cancel: vi.fn(),
      dismissError: vi.fn(),
      dispose: vi.fn(),
      downloads: () => [],
      startImageModel: vi.fn(),
      startTextModel: mocks.startTextModel,
      startVoiceModel: mocks.startVoiceModel,
      state: () => ({status: 'idle'}),
    })
    createRoot((cleanup) => {
      dispose = cleanup
      reading = useTarotReading({locale: getLocale})
      onCleanup(() => overwriteGetLocale(originalGetLocale))
    })
  })

  afterEach(() => {
    dispose()
    overwriteGetLocale(originalGetLocale)
  })

  it('should interpret using the locale active when download starts after a no-reload language change', async () => {
    reading.draw()
    await flush()
    expect(reading.status()).toBe('consent')

    overwriteGetLocale(() => 'en')
    expect(getLocale()).toBe('en')

    await reading.startDownload()
    await flush()

    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({locale: 'en', question: ''}),
    )
  })
})
