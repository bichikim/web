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

type TestTextModelId = 'cloud' | 'gemma-4-e2b' | 'lfm-2.6b-qad'

const mocks = vi.hoisted(() => ({
  cancelDownload: vi.fn(),
  dispose: vi.fn(),
  downloaded: vi.fn<(options: {readonly modelId: TestTextModelId}) => Promise<boolean>>(),
  generate: vi.fn(),
  modelId: 'gemma-4-e2b' as TestTextModelId,
  onResponse: null as ((response: TarotWorkerResponse) => void) | null,
  responses: [] as Array<(response: TarotWorkerResponse) => void>,
  setModelId: null as ((modelId: TestTextModelId) => void) | null,
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
    mocks.responses.push(options.onResponse)
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

  it('should start cached LFM interpretation when WebGPU is unavailable', async () => {
    mocks.setModelId?.('lfm-2.6b-qad')
    mocks.supported = false
    reading.draw()
    await flush()
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({modelId: 'lfm-2.6b-qad'}))
    expect(reading.status()).toBe('preparing')
  })

  it('starts text interpretation when Gemma is ready and the voice model is missing', async () => {
    mocks.voiceDownloaded.mockResolvedValue(false)
    mocks.generate.mockImplementation((request: {readonly requestId: string}) => {
      mocks.onResponse?.({requestId: request.requestId, type: 'started'})
    })
    reading.setQuestion('오늘 운세')
    reading.draw()
    const selected = reading.cards()
    await flush()

    expect(reading.status()).toBe('generating')
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, locale: 'ko', question: '오늘 운세'}),
    )
    expect(mocks.voiceDownloaded).not.toHaveBeenCalled()
    expect(mocks.startVoiceModel).not.toHaveBeenCalled()
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
  it('should use the chosen LFM model for consent, download, and the worker request', async () => {
    mocks.setModelId?.('lfm-2.6b-qad')
    mocks.downloaded.mockResolvedValue(false)
    reading.draw()
    await flush()
    expect(mocks.downloaded).toHaveBeenCalledWith({modelId: 'lfm-2.6b-qad'})
    expect(reading.status()).toBe('consent')
    mocks.setModelId?.('gemma-4-e2b')
    expect(reading.status()).toBe('consent')
    await reading.startDownload()
    expect(mocks.startTextModel).toHaveBeenCalledWith('lfm-2.6b-qad')
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({modelId: 'lfm-2.6b-qad'}))
  })

  it('should expose same-card interpretation when the default model becomes supported', async () => {
    mocks.supported = false
    reading.draw()
    const selected = reading.cards()
    expect(reading.status()).toBe('unsupported')

    mocks.setModelId?.('lfm-2.6b-qad')
    expect(reading.cards()).toBe(selected)
    expect(reading.status()).toBe('idle')
    expect(mocks.downloaded).not.toHaveBeenCalled()

    reading.retry()
    await flush()

    expect(mocks.downloaded).toHaveBeenCalledWith({modelId: 'lfm-2.6b-qad'})
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
    )
    expect(reading.status()).toBe('preparing')
  })

  it('should ignore stale readiness after repeated model switches in the same mount', async () => {
    const firstReadiness = Promise.withResolvers<boolean>()
    const secondReadiness = Promise.withResolvers<boolean>()
    const thirdReadiness = Promise.withResolvers<boolean>()
    let lfmReadinessCalls = 0
    mocks.supported = false
    mocks.downloaded.mockImplementation(({modelId}) => {
      if (modelId === 'lfm-2.6b-qad') {
        lfmReadinessCalls += 1
        if (lfmReadinessCalls === 1) {
          return firstReadiness.promise
        }
        return lfmReadinessCalls === 2 ? secondReadiness.promise : thirdReadiness.promise
      }
      return Promise.resolve(true)
    })

    reading.draw()
    const selected = reading.cards()
    mocks.setModelId?.('lfm-2.6b-qad')
    expect(reading.status()).toBe('idle')
    reading.retry()
    await flush()
    mocks.setModelId?.('gemma-4-e2b')
    await flush()
    expect(reading.status()).toBe('unsupported')
    firstReadiness.resolve(true)
    await flush()
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(reading.cards()).toBe(selected)

    reading.retry()
    await flush()
    expect(reading.status()).toBe('unsupported')

    mocks.setModelId?.('lfm-2.6b-qad')
    expect(reading.status()).toBe('idle')
    reading.retry()
    await flush()

    mocks.setModelId?.('gemma-4-e2b')
    expect(reading.status()).toBe('unsupported')
    secondReadiness.resolve(true)
    await flush()
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(reading.cards()).toBe(selected)
    expect(reading.status()).toBe('unsupported')

    mocks.setModelId?.('lfm-2.6b-qad')
    expect(reading.status()).toBe('idle')
    reading.retry()
    await flush()
    thirdReadiness.resolve(true)
    await flush()
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
    )
    expect(reading.status()).toBe('preparing')
  })

  it('should recover after a stale readiness rejection on a model round trip', async () => {
    const firstReadiness = Promise.withResolvers<boolean>()
    const retryReadiness = Promise.withResolvers<boolean>()
    let lfmReadinessCalls = 0
    mocks.supported = false
    mocks.downloaded.mockImplementation(({modelId}) => {
      if (modelId !== 'lfm-2.6b-qad') {
        return Promise.resolve(true)
      }
      lfmReadinessCalls += 1
      return lfmReadinessCalls === 1 ? firstReadiness.promise : retryReadiness.promise
    })

    reading.draw()
    const selected = reading.cards()
    mocks.setModelId?.('lfm-2.6b-qad')
    reading.retry()
    await flush()
    mocks.setModelId?.('gemma-4-e2b')
    expect(reading.status()).toBe('unsupported')
    firstReadiness.reject(new Error('stale readiness failure'))
    await flush()

    expect(reading.error()).toBeNull()
    expect(reading.status()).toBe('unsupported')
    mocks.setModelId?.('lfm-2.6b-qad')
    expect(reading.cards()).toBe(selected)
    expect(reading.status()).toBe('idle')
    reading.retry()
    await flush()
    retryReadiness.resolve(true)
    await flush()
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
    )
    expect(reading.status()).toBe('preparing')
  })

  it('should invalidate pending readiness when locale changes behind a projected unsupported status', async () => {
    const firstReadiness = Promise.withResolvers<boolean>()
    const secondReadiness = Promise.withResolvers<boolean>()
    let lfmReadinessCalls = 0
    mocks.supported = false
    mocks.downloaded.mockImplementation(({modelId}) => {
      if (modelId !== 'lfm-2.6b-qad') {
        return Promise.resolve(true)
      }
      lfmReadinessCalls += 1
      return lfmReadinessCalls === 1 ? firstReadiness.promise : secondReadiness.promise
    })

    reading.draw()
    const selected = reading.cards()
    mocks.setModelId?.('lfm-2.6b-qad')
    reading.retry()
    await flush()
    expect(reading.status()).toBe('checking')

    mocks.setModelId?.('gemma-4-e2b')
    expect(reading.status()).toBe('unsupported')
    setLocale('en')
    expect(reading.status()).toBe('idle')
    mocks.setModelId?.('lfm-2.6b-qad')
    expect(reading.cards()).toBe(selected)
    expect(reading.status()).toBe('idle')

    firstReadiness.resolve(true)
    await flush()
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(reading.status()).toBe('idle')

    reading.retry()
    await flush()
    secondReadiness.resolve(true)
    await flush()
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, locale: 'en', modelId: 'lfm-2.6b-qad'}),
    )
    expect(reading.status()).toBe('preparing')
  })

  it('should recover an idle retry after returning to a model whose readiness completed stale', async () => {
    const lfmReadiness = Promise.withResolvers<boolean>()
    mocks.supported = false
    mocks.downloaded.mockImplementation(({modelId}) =>
      modelId === 'lfm-2.6b-qad' ? lfmReadiness.promise : Promise.resolve(true),
    )

    reading.draw()
    const selected = reading.cards()
    expect(reading.status()).toBe('unsupported')

    mocks.setModelId?.('lfm-2.6b-qad')
    expect(reading.status()).toBe('idle')
    reading.retry()
    await flush()
    expect(reading.status()).toBe('checking')

    mocks.setModelId?.('gemma-4-e2b')
    expect(reading.status()).toBe('unsupported')
    lfmReadiness.resolve(true)
    await flush()
    expect(mocks.generate).not.toHaveBeenCalled()

    mocks.setModelId?.('lfm-2.6b-qad')
    expect(reading.cards()).toBe(selected)
    expect(reading.status()).toBe('idle')
    reading.retry()
    await flush()
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
    )
    expect(reading.status()).toBe('preparing')
  })

  it('should discard a previous model response after repeated switches without remounting', async () => {
    mocks.supported = false
    reading.draw()
    const selected = reading.cards()
    mocks.setModelId?.('lfm-2.6b-qad')
    expect(reading.status()).toBe('idle')
    reading.retry()
    await flush()
    const firstRequestId = mocks.generate.mock.lastCall?.[0].requestId as string
    const firstResponse = mocks.responses[0]

    mocks.setModelId?.('gemma-4-e2b')
    reading.cancel()
    reading.retry()
    await flush()
    expect(reading.status()).toBe('unsupported')
    firstResponse?.({requestId: firstRequestId, text: '오래된 해석', type: 'complete'})
    expect(reading.output()).toBe('')

    mocks.setModelId?.('lfm-2.6b-qad')
    expect(reading.status()).toBe('idle')
    reading.retry()
    await flush()
    const secondRequestId = mocks.generate.mock.lastCall?.[0].requestId as string
    expect(secondRequestId).not.toBe(firstRequestId)
    expect(mocks.generate).toHaveBeenCalledTimes(2)
    expect(mocks.generate.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
    )

    mocks.responses[1]?.({requestId: firstRequestId, text: '오래된 해석', type: 'complete'})
    expect(reading.output()).toBe('')
    mocks.responses[1]?.({requestId: secondRequestId, text: '새 해석', type: 'complete'})
    expect(reading.cards()).toBe(selected)
    expect(reading.output()).toBe('새 해석')
    expect(reading.status()).toBe('complete')
  })

  it('should ignore model readiness that resolves after the tarot owner is disposed', async () => {
    const readiness = Promise.withResolvers<boolean>()
    mocks.supported = false
    mocks.downloaded.mockImplementation(({modelId}) =>
      modelId === 'lfm-2.6b-qad' ? readiness.promise : Promise.resolve(true),
    )
    reading.draw()
    mocks.setModelId?.('lfm-2.6b-qad')
    expect(reading.status()).toBe('idle')
    reading.retry()
    await flush()
    expect(reading.status()).toBe('checking')

    dispose()
    readiness.resolve(true)
    await flush()

    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('should recover locally after cloud inference errors without downloading cloud assets', async () => {
    mocks.supported = false
    reading.draw()
    const selected = reading.cards()
    mocks.setModelId?.('cloud')
    expect(reading.status()).toBe('idle')
    reading.retry()
    await flush()

    const cloudRequestId = mocks.generate.mock.lastCall?.[0].requestId as string
    expect(mocks.downloaded).toHaveBeenCalledWith({modelId: 'cloud'})
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, modelId: 'cloud'}),
    )
    expect(mocks.startTextModel).not.toHaveBeenCalled()
    mocks.responses[0]?.({
      message: '일일 한도에 도달했어요.',
      requestId: cloudRequestId,
      restartRequired: false,
      type: 'error',
    })
    expect(reading.status()).toBe('error')
    expect(reading.error()).toBe('일일 한도에 도달했어요.')

    mocks.setModelId?.('lfm-2.6b-qad')
    reading.retry()
    await flush()
    expect(mocks.generate).toHaveBeenCalledTimes(2)
    expect(mocks.generate.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
    )
    expect(mocks.startTextModel).not.toHaveBeenCalled()
    expect(reading.error()).toBeNull()
    expect(reading.status()).toBe('preparing')
  })
})

vi.mock('src/features/text-generation/use-default-text-model', () => ({
  useDefaultTextModel: () => {
    const [modelId, setModelId] = createSignal(mocks.modelId)
    mocks.setModelId = setModelId
    return modelId
  },
}))
