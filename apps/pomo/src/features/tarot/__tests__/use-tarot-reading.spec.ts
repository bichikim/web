import {flush, mocks, setupTarotReading} from './fixtures/reading'
import {createRoot, onCleanup} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {useModelDownload} from '../../model-download'
import {
  createModelDownloadController,
  type ModelDownloadResult,
} from '../../model-download/controller'
import type {CreateTextModelDownloadClientOptions} from '../../model-download/text-client'
import {useTarotReading} from '../use-tarot-reading'

describe('useTarotReading', () => {
  const getFixture = setupTarotReading()

  it('draws three distinct cards by default and one card after changing the count', async () => {
    const fixture = getFixture()
    mocks.supported = false
    fixture.reading.draw()
    expect(fixture.reading.cards()).toHaveLength(3)
    expect(new Set(fixture.reading.cards().map((card) => card.id)).size).toBe(3)
    expect(fixture.reading.status()).toBe('unsupported')
    expect(mocks.downloaded).not.toHaveBeenCalled()

    fixture.reading.setCount(1)
    expect(fixture.reading.cards()).toHaveLength(0)
    fixture.reading.draw()
    expect(fixture.reading.cards()).toHaveLength(1)
  })

  it('asks for download consent and interprets the selected cards after download', async () => {
    const fixture = getFixture()
    mocks.downloaded.mockResolvedValue(false)
    fixture.reading.setQuestion('지금 필요한 것은?')
    fixture.reading.draw()
    const selected = fixture.reading.cards()
    await flush()
    expect(fixture.reading.status()).toBe('consent')
    expect(mocks.startTextModel).not.toHaveBeenCalled()

    await fixture.reading.startDownload()
    expect(mocks.startTextModel).toHaveBeenCalledWith('gemma-4-e2b')
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, locale: 'ko', question: '지금 필요한 것은?'}),
    )
    const requestId = vi.mocked(mocks.generate).mock.lastCall?.[0].requestId as string
    mocks.onResponse?.({requestId, text: '세 카드의 해석', type: 'complete'})
    expect(fixture.reading.status()).toBe('complete')
    expect(fixture.reading.output()).toBe('세 카드의 해석')
  })

  it('should start cached LFM interpretation when WebGPU is unavailable', async () => {
    const fixture = getFixture()
    mocks.setModelId?.('lfm-2.6b-qad')
    mocks.supported = false
    fixture.reading.draw()
    await flush()
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({modelId: 'lfm-2.6b-qad'}))
    expect(fixture.reading.status()).toBe('preparing')
  })

  it('starts text interpretation when Gemma is ready and the voice model is missing', async () => {
    const fixture = getFixture()
    mocks.voiceDownloaded.mockResolvedValue(false)
    mocks.generate.mockImplementation((request: {readonly requestId: string}) => {
      mocks.onResponse?.({requestId: request.requestId, type: 'started'})
    })
    fixture.reading.setQuestion('오늘 운세')
    fixture.reading.draw()
    const selected = fixture.reading.cards()
    await flush()

    expect(fixture.reading.status()).toBe('generating')
    const active = mocks.generate.mock.lastCall?.[0]
    mocks.onResponse?.({
      reason: 'busy',
      request: {...active, requestId: 'rejected'},
      type: 'skipped',
    })
    expect(fixture.reading.status()).toBe('generating')
    mocks.onResponse?.({requestId: active.requestId, text: '진행하던 해석', type: 'complete'})
    expect(fixture.reading.status()).toBe('complete')
    expect(fixture.reading.output()).toBe('진행하던 해석')
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, locale: 'ko', question: '오늘 운세'}),
    )
    expect(mocks.voiceDownloaded).not.toHaveBeenCalled()
    expect(mocks.startVoiceModel).not.toHaveBeenCalled()
  })

  it('should interpret five cards in draw order and retain the result when editing the question', async () => {
    const fixture = getFixture()
    fixture.reading.setCount(5)
    fixture.reading.setQuestion('새로운 일을 시작할까요?')
    fixture.reading.draw()
    const selected = fixture.reading.cards()
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
    fixture.reading.setQuestion('조금 더 준비할까요?')
    expect(fixture.reading.cards()).toBe(selected)
    expect(fixture.reading.output()).toBe('다섯 카드의 해석')
  })

  it('should keep the shared download running after closing and join it when retrying', async () => {
    const fixture = getFixture()
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
    fixture.dispose()
    createRoot((cleanup) => {
      fixture.dispose = cleanup
      fixture.reading = useTarotReading({locale: () => 'ko'})
    })
    mocks.downloaded.mockResolvedValue(false)
    fixture.reading.draw()
    await flush()
    const pending = fixture.reading.startDownload()
    clients[0]!.onResponse({
      files: [],
      loadedBytes: 35,
      percentage: 35,
      totalBytes: 100,
      type: 'loading',
    })

    fixture.reading.cancel()
    expect(controller.downloads()).toEqual([
      expect.objectContaining({percentage: 35, status: 'loading'}),
    ])
    expect(disposeDownload).not.toHaveBeenCalled()

    fixture.reading.retry()
    await flush()
    expect(fixture.reading.status()).toBe('downloading')
    expect(createTextClient).toHaveBeenCalledOnce()
    clients[0]!.onResponse({
      files: [],
      loadedBytes: 133,
      percentage: 133,
      totalBytes: 100,
      type: 'loading',
    })
    expect(fixture.reading.progress()).toBe(133)
    expect(fixture.reading.status()).toBe('downloading')
    expect(controller.downloads()).toEqual([
      expect.objectContaining({percentage: 133, status: 'loading'}),
    ])
    clients[0]!.onResponse({type: 'ready'})
    await pending
    await flush()
    expect(mocks.generate).toHaveBeenCalledOnce()
    expect(controller.downloads()).toEqual([])
    disposeProvider()
  })

  it('should leave the provider download running when the tarot owner is disposed', async () => {
    const fixture = getFixture()
    const download = Promise.withResolvers<ModelDownloadResult>()
    mocks.startTextModel.mockReturnValue(download.promise)
    mocks.downloaded.mockResolvedValue(false)
    fixture.reading.draw()
    await flush()
    const pending = fixture.reading.startDownload()

    fixture.dispose()
    expect(mocks.cancelDownload).not.toHaveBeenCalled()
    download.resolve({status: 'complete'})
    await pending
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('should cancel the shared Gemma download only when explicitly requested', async () => {
    const fixture = getFixture()
    const download = Promise.withResolvers<ModelDownloadResult>()
    mocks.startTextModel.mockReturnValue(download.promise)
    mocks.downloaded.mockResolvedValue(false)
    fixture.reading.draw()
    await flush()
    const selected = fixture.reading.cards()
    const pending = fixture.reading.startDownload()

    fixture.reading.cancelDownload()
    expect(mocks.cancelDownload).toHaveBeenCalledExactlyOnceWith({
      kind: 'text',
      modelId: 'gemma-4-e2b',
    })
    expect(fixture.reading.status()).toBe('idle')
    expect(fixture.reading.cards()).toBe(selected)
    download.resolve({status: 'complete'})
    await pending
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('discards a cancelled result and retries with the same cards and question', async () => {
    const fixture = getFixture()
    fixture.reading.setQuestion('선택을 돌아보고 싶어요')
    fixture.reading.draw()
    const selected = fixture.reading.cards()
    await flush()
    const oldRequestId = vi.mocked(mocks.generate).mock.lastCall?.[0].requestId as string
    fixture.reading.cancel()
    expect(mocks.dispose).toHaveBeenCalledOnce()
    expect(fixture.reading.output()).toBe('')

    fixture.reading.retry()
    await flush()
    const newRequestId = vi.mocked(mocks.generate).mock.lastCall?.[0].requestId as string
    expect(newRequestId).not.toBe(oldRequestId)
    expect(fixture.reading.cards()).toBe(selected)
    expect(vi.mocked(mocks.generate).mock.lastCall?.[0].cards).toEqual(selected)
    expect(
      selected.every((card) => card.orientation === 'upright' || card.orientation === 'reversed'),
    ).toBe(true)
    expect(vi.mocked(mocks.generate).mock.lastCall?.[0].question).toBe('선택을 돌아보고 싶어요')

    mocks.onResponse?.({requestId: oldRequestId, text: '늦은 응답', type: 'complete'})
    expect(fixture.reading.output()).toBe('')
    mocks.onResponse?.({requestId: newRequestId, text: '새 응답', type: 'complete'})
    expect(fixture.reading.output()).toBe('새 응답')
  })

  it('keeps the result while editing a question and uses the edited question on retry', async () => {
    const fixture = getFixture()
    fixture.reading.setQuestion('지금 필요한 것은?')
    fixture.reading.draw()
    await flush()
    const requestId = vi.mocked(mocks.generate).mock.lastCall?.[0].requestId as string
    mocks.onResponse?.({requestId, text: '기존 해석', type: 'complete'})
    const selected = fixture.reading.cards()

    fixture.reading.setQuestion('앞으로 어떤 선택을 할까요?')
    expect(fixture.reading.cards()).toBe(selected)
    expect(fixture.reading.output()).toBe('기존 해석')
    expect(fixture.reading.status()).toBe('complete')
    expect(mocks.generate).toHaveBeenCalledOnce()

    fixture.reading.retry()
    await flush()
    expect(fixture.reading.cards()).toBe(selected)
    expect(vi.mocked(mocks.generate).mock.lastCall?.[0].cards).toEqual(selected)
    expect(
      selected.every((card) => card.orientation === 'upright' || card.orientation === 'reversed'),
    ).toBe(true)
    expect(vi.mocked(mocks.generate).mock.lastCall?.[0].question).toBe('앞으로 어떤 선택을 할까요?')
  })

  it('keeps the cards but clears the old language interpretation when locale changes', async () => {
    const fixture = getFixture()
    fixture.reading.draw()
    await flush()
    const requestId = vi.mocked(mocks.generate).mock.lastCall?.[0].requestId as string
    mocks.onResponse?.({requestId, text: '한국어 해석', type: 'complete'})
    const selected = fixture.reading.cards()

    fixture.setLocale('en')
    expect(fixture.reading.cards()).toBe(selected)
    expect(fixture.reading.output()).toBe('')
    expect(fixture.reading.status()).toBe('idle')
    fixture.reading.retry()
    await flush()
    expect(vi.mocked(mocks.generate).mock.lastCall?.[0].locale).toBe('en')
  })

  it('should use the chosen LFM model for consent, download, and the worker request', async () => {
    const fixture = getFixture()
    mocks.setModelId?.('lfm-2.6b-qad')
    mocks.downloaded.mockResolvedValue(false)
    fixture.reading.draw()
    await flush()
    expect(mocks.downloaded).toHaveBeenCalledWith({modelId: 'lfm-2.6b-qad'})
    expect(fixture.reading.status()).toBe('consent')
    mocks.setModelId?.('gemma-4-e2b')
    expect(fixture.reading.status()).toBe('consent')
    await fixture.reading.startDownload()
    expect(mocks.startTextModel).toHaveBeenCalledWith('lfm-2.6b-qad')
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({modelId: 'lfm-2.6b-qad'}))
  })
})
