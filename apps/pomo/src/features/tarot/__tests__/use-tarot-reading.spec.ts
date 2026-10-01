import {createRoot, createSignal, onCleanup} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useModelDownload} from '../../model-download'
import {
  createModelDownloadController,
  type ModelDownloadResult,
} from '../../model-download/controller'
import type {CreateTextModelDownloadClientOptions} from '../../model-download/text-client'
import type {TarotWorkerResponse} from '../messages'
import {type TarotReadingController, useTarotReading} from '../use-tarot-reading'

const mocks = vi.hoisted(() => ({
  cancelDownload: vi.fn(),
  dispose: vi.fn(),
  downloaded: vi.fn<() => Promise<boolean>>(),
  generate: vi.fn(),
  onResponse: null as ((response: TarotWorkerResponse) => void) | null,
  startTextModel: vi.fn<() => Promise<ModelDownloadResult>>(),
  startVoiceModel: vi.fn<() => Promise<ModelDownloadResult>>(),
  supported: true,
  voiceDownloaded: vi.fn<() => Promise<boolean>>(),
}))

vi.mock('../../model-download', () => ({
  useModelDownload: vi.fn(),
}))
vi.mock('../../text-generation', () => ({
  isTextModelDownloaded: mocks.downloaded,
  supportsWebGpu: () => mocks.supported,
}))
vi.mock('../../supertonic/download', () => ({isSupertonicModelDownloaded: mocks.voiceDownloaded}))
vi.mock('../client', () => ({
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

describe('useTarotReading', () => {
  let dispose: () => void
  let reading: TarotReadingController
  let setLocale: (locale: 'en' | 'ko') => void

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.onResponse = null
    mocks.supported = true
    mocks.downloaded.mockResolvedValue(true)
    mocks.startTextModel.mockResolvedValue({status: 'complete'})
    mocks.startVoiceModel.mockResolvedValue({status: 'complete'})
    mocks.voiceDownloaded.mockResolvedValue(true)
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
    createRoot((cleanup) => {
      dispose = cleanup
      const [locale, updateLocale] = createSignal<'en' | 'ko'>('ko')
      setLocale = updateLocale
      reading = useTarotReading({locale})
    })
  })

  afterEach(() => dispose())

  it('draws three distinct cards by default and one card after changing the count', async () => {
    mocks.supported = false
    reading.draw()
    expect(reading.cards()).toHaveLength(3)
    expect(new Set(reading.cards().map((card) => card.id)).size).toBe(3)
    expect(reading.status()).toBe('unsupported')
    expect(mocks.downloaded).not.toHaveBeenCalled()

    reading.setCount(1)
    expect(reading.cards()).toHaveLength(0)
    reading.draw()
    expect(reading.cards()).toHaveLength(1)
  })

  it('asks for download consent and interprets the selected cards after download', async () => {
    mocks.downloaded.mockResolvedValue(false)
    reading.setQuestion('지금 필요한 것은?')
    reading.draw()
    const selected = reading.cards()
    await flush()
    expect(reading.status()).toBe('consent')
    expect(mocks.startTextModel).not.toHaveBeenCalled()

    await reading.startDownload()
    expect(mocks.startTextModel).toHaveBeenCalledWith('gemma-4-e2b')
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, locale: 'ko', question: '지금 필요한 것은?'}),
    )
    const requestId = vi.mocked(mocks.generate).mock.lastCall?.[0].requestId as string
    mocks.onResponse?.({requestId, text: '세 카드의 해석', type: 'complete'})
    expect(reading.status()).toBe('complete')
    expect(reading.output()).toBe('세 카드의 해석')
  })

  it('should interpret five cards in draw order and retain the result when editing the question', async () => {
    reading.setCount(5)
    reading.setQuestion('새로운 일을 시작할까요?')
    reading.draw()
    const selected = reading.cards()
    expect(selected).toHaveLength(5)
    expect(new Set(selected.map((card) => card.id)).size).toBe(5)
    await flush()
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        cards: selected,
        question: '새로운 일을 시작할까요?',
      }),
    )
    const requestId = mocks.generate.mock.lastCall?.[0].requestId as string
    mocks.onResponse?.({requestId, text: '다섯 카드의 해석', type: 'complete'})
    reading.setQuestion('조금 더 준비할까요?')
    expect(reading.cards()).toBe(selected)
    expect(reading.output()).toBe('다섯 카드의 해석')
  })

  it('should keep the shared download running after closing and join it when retrying', async () => {
    const clients: Array<CreateTextModelDownloadClientOptions> = []
    const disposeDownload = vi.fn()
    const createTextClient = vi.fn((options: CreateTextModelDownloadClientOptions) => {
      clients.push(options)
      return {dispose: disposeDownload, prepare: vi.fn()}
    })
    let disposeProvider: () => void = () => undefined
    const controller = createRoot((cleanup) => {
      disposeProvider = cleanup
      const download = createModelDownloadController({createTextClient, createVoiceClient: vi.fn()})
      onCleanup(download.dispose)
      return download
    })
    vi.mocked(useModelDownload).mockReturnValue(controller)
    dispose()
    createRoot((cleanup) => {
      dispose = cleanup
      reading = useTarotReading({locale: () => 'ko'})
    })
    mocks.downloaded.mockResolvedValue(false)
    reading.draw()
    await flush()
    const pending = reading.startDownload()
    clients[0]!.onResponse({
      files: [],
      loadedBytes: 35,
      percentage: 35,
      totalBytes: 100,
      type: 'loading',
    })

    reading.cancel()
    expect(controller.downloads()).toEqual([
      expect.objectContaining({percentage: 35, status: 'loading'}),
    ])
    expect(disposeDownload).not.toHaveBeenCalled()

    reading.retry()
    await flush()
    expect(reading.status()).toBe('downloading')
    expect(createTextClient).toHaveBeenCalledOnce()
    clients[0]!.onResponse({
      files: [],
      loadedBytes: 64,
      percentage: 64,
      totalBytes: 100,
      type: 'loading',
    })
    expect(reading.progress()).toBe(64)
    clients[0]!.onResponse({type: 'ready'})
    await pending
    await flush()
    expect(mocks.generate).toHaveBeenCalledOnce()
    expect(controller.downloads()).toEqual([])
    disposeProvider()
  })

  it('should leave the provider download running when the tarot owner is disposed', async () => {
    const download = Promise.withResolvers<ModelDownloadResult>()
    mocks.startTextModel.mockReturnValue(download.promise)
    mocks.downloaded.mockResolvedValue(false)
    reading.draw()
    await flush()
    const pending = reading.startDownload()

    dispose()
    expect(mocks.cancelDownload).not.toHaveBeenCalled()
    download.resolve({status: 'complete'})
    await pending
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('should cancel the shared Gemma download only when explicitly requested', async () => {
    const download = Promise.withResolvers<ModelDownloadResult>()
    mocks.startTextModel.mockReturnValue(download.promise)
    mocks.downloaded.mockResolvedValue(false)
    reading.draw()
    await flush()
    const selected = reading.cards()
    const pending = reading.startDownload()

    reading.cancelDownload()
    expect(mocks.cancelDownload).toHaveBeenCalledExactlyOnceWith({
      kind: 'text',
      modelId: 'gemma-4-e2b',
    })
    expect(reading.status()).toBe('idle')
    expect(reading.cards()).toBe(selected)
    download.resolve({status: 'complete'})
    await pending
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('should queue Gemma then voice before either download completes and wait for both', async () => {
    const text = Promise.withResolvers<ModelDownloadResult>()
    const voice = Promise.withResolvers<ModelDownloadResult>()
    mocks.downloaded.mockResolvedValue(false)
    mocks.voiceDownloaded.mockResolvedValue(false)
    mocks.startTextModel.mockReturnValue(text.promise)
    mocks.startVoiceModel.mockReturnValue(voice.promise)
    reading.draw()
    await flush()
    expect(reading.status()).toBe('consent')
    const pending = reading.startDownload()
    expect(mocks.startTextModel).toHaveBeenCalledWith('gemma-4-e2b')
    expect(mocks.startVoiceModel).toHaveBeenCalledWith('full')
    expect(mocks.startTextModel.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.startVoiceModel.mock.invocationCallOrder[0]!,
    )
    text.resolve({status: 'complete'})
    await flush()
    expect(mocks.generate).not.toHaveBeenCalled()
    voice.resolve({status: 'complete'})
    await pending
    expect(mocks.generate).toHaveBeenCalledOnce()
  })

  it('should ask for only the missing voice model when Gemma is cached', async () => {
    mocks.voiceDownloaded.mockResolvedValue(false)
    reading.draw()
    await flush()
    expect(reading.status()).toBe('consent')
    await reading.startDownload()
    expect(mocks.startTextModel).not.toHaveBeenCalled()
    expect(mocks.startVoiceModel).toHaveBeenCalledWith('full')
    expect(mocks.generate).toHaveBeenCalledOnce()
  })

  it('should continue the real provider queue from Gemma to voice after the tarot owner closes', async () => {
    const textClients: Array<CreateTextModelDownloadClientOptions> = []
    const voice = Promise.withResolvers<{ok: true; value: void}>()
    const initialize = vi.fn(() => voice.promise)
    const createVoiceClient = vi.fn(() => ({
      cancelGeneration: vi.fn(),
      dispose: vi.fn(),
      generate: vi.fn(),
      generateStream: vi.fn(),
      initialize,
    }))
    const createTextClient = vi.fn((options: CreateTextModelDownloadClientOptions) => {
      textClients.push(options)
      return {dispose: vi.fn(), prepare: vi.fn()}
    })
    let disposeProvider: () => void = () => undefined
    const controller = createRoot((cleanup) => {
      disposeProvider = cleanup
      const download = createModelDownloadController({createTextClient, createVoiceClient})
      onCleanup(download.dispose)
      return download
    })
    vi.mocked(useModelDownload).mockReturnValue(controller)
    dispose()
    createRoot((cleanup) => {
      dispose = cleanup
      reading = useTarotReading({locale: () => 'ko'})
    })
    mocks.downloaded.mockResolvedValue(false)
    mocks.voiceDownloaded.mockResolvedValue(false)
    reading.draw()
    await flush()
    const pending = reading.startDownload()
    expect(createVoiceClient).not.toHaveBeenCalled()
    expect(controller.downloads().map((item) => item.status)).toEqual(['loading', 'queued'])
    dispose()
    textClients[0]!.onResponse({type: 'ready'})
    expect(createVoiceClient).toHaveBeenCalledOnce()
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({modelId: 'full'}))
    voice.resolve({ok: true, value: undefined})
    await pending
    expect(controller.downloads()).toEqual([])
    expect(mocks.generate).not.toHaveBeenCalled()
    disposeProvider()
  })

  it('discards a cancelled result and retries with the same cards and question', async () => {
    reading.setQuestion('선택을 돌아보고 싶어요')
    reading.draw()
    const selected = reading.cards()
    await flush()
    const oldRequestId = vi.mocked(mocks.generate).mock.lastCall?.[0].requestId as string
    reading.cancel()
    expect(mocks.dispose).toHaveBeenCalledOnce()
    expect(reading.output()).toBe('')

    reading.retry()
    await flush()
    const newRequestId = vi.mocked(mocks.generate).mock.lastCall?.[0].requestId as string
    expect(newRequestId).not.toBe(oldRequestId)
    expect(reading.cards()).toBe(selected)
    expect(vi.mocked(mocks.generate).mock.lastCall?.[0].cards).toEqual(selected)
    expect(
      selected.every((card) => card.orientation === 'upright' || card.orientation === 'reversed'),
    ).toBe(true)
    expect(vi.mocked(mocks.generate).mock.lastCall?.[0].question).toBe('선택을 돌아보고 싶어요')

    mocks.onResponse?.({requestId: oldRequestId, text: '늦은 응답', type: 'complete'})
    expect(reading.output()).toBe('')
    mocks.onResponse?.({requestId: newRequestId, text: '새 응답', type: 'complete'})
    expect(reading.output()).toBe('새 응답')
  })

  it('keeps the result while editing a question and uses the edited question on retry', async () => {
    reading.setQuestion('지금 필요한 것은?')
    reading.draw()
    await flush()
    const requestId = vi.mocked(mocks.generate).mock.lastCall?.[0].requestId as string
    mocks.onResponse?.({requestId, text: '기존 해석', type: 'complete'})
    const selected = reading.cards()

    reading.setQuestion('앞으로 어떤 선택을 할까요?')
    expect(reading.cards()).toBe(selected)
    expect(reading.output()).toBe('기존 해석')
    expect(reading.status()).toBe('complete')
    expect(mocks.generate).toHaveBeenCalledOnce()

    reading.retry()
    await flush()
    expect(reading.cards()).toBe(selected)
    expect(vi.mocked(mocks.generate).mock.lastCall?.[0].cards).toEqual(selected)
    expect(
      selected.every((card) => card.orientation === 'upright' || card.orientation === 'reversed'),
    ).toBe(true)
    expect(vi.mocked(mocks.generate).mock.lastCall?.[0].question).toBe('앞으로 어떤 선택을 할까요?')
  })

  it('keeps the cards but clears the old language interpretation when locale changes', async () => {
    reading.draw()
    await flush()
    const requestId = vi.mocked(mocks.generate).mock.lastCall?.[0].requestId as string
    mocks.onResponse?.({requestId, text: '한국어 해석', type: 'complete'})
    const selected = reading.cards()

    setLocale('en')
    expect(reading.cards()).toBe(selected)
    expect(reading.output()).toBe('')
    expect(reading.status()).toBe('idle')
    reading.retry()
    await flush()
    expect(vi.mocked(mocks.generate).mock.lastCall?.[0].locale).toBe('en')
  })

  it('reads the locale accessor at download start after consent', async () => {
    let locale: 'en' | 'ko' = 'ko'
    dispose()
    createRoot((cleanup) => {
      dispose = cleanup
      reading = useTarotReading({locale: () => locale})
    })
    mocks.downloaded.mockResolvedValue(false)
    reading.setQuestion('무엇을 기억해야 할까요?')
    reading.draw()
    const selected = reading.cards()
    await flush()
    expect(reading.status()).toBe('consent')

    locale = 'en'
    await reading.startDownload()

    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        cards: selected,
        locale: 'en',
        question: '무엇을 기억해야 할까요?',
      }),
    )
  })
})
