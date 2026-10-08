import {createRoot} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {DefaultTextModelId} from '../../text-generation/settings'
import type {SajuGenerationResponse} from '../generation-messages'
import {
  type SajuReadingController,
  type SajuReadingServices,
  useSajuReading,
} from '../use-saju-reading'

const mocks = {
  cancelDownload: vi.fn(),
  dispose: vi.fn(),
  downloaded: vi.fn(async (_modelId: DefaultTextModelId) => true),
  generate: vi.fn(),
  startTextModel: vi.fn(async (_modelId: DefaultTextModelId) => ({status: 'complete' as const})),
}

const birth = {calendar: 'solar', date: '1995-03-16'} as const
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('useSajuReading', () => {
  let cleanup: () => void
  let reading: SajuReadingController
  let modelId: DefaultTextModelId
  let supported: boolean
  let receive: ((response: SajuGenerationResponse) => void) | null

  beforeEach(() => {
    vi.clearAllMocks()
    modelId = 'gemma-4-e2b'
    supported = true
    receive = null
    mocks.downloaded.mockResolvedValue(true)
    mocks.startTextModel.mockResolvedValue({status: 'complete'})
    const services: SajuReadingServices = {
      createClient: (onResponse) => {
        receive = onResponse
        return {dispose: mocks.dispose, generate: mocks.generate}
      },
      defaultModelId: () => modelId,
      downloads: {
        cancel: mocks.cancelDownload,
        downloads: () => [],
        startTextModel: mocks.startTextModel,
      },
      downloadSize: () => '약 1GB',
      isDownloaded: mocks.downloaded,
      supportsModel: () => supported,
    }
    createRoot((dispose) => {
      cleanup = dispose
      reading = useSajuReading({services})
    })
  })

  afterEach(() => cleanup())

  it('should answer a broad future question without loading a model', () => {
    reading.submit({birth, gender: 'N', question: '나의 미래는?'})
    expect(reading.status()).toBe('complete')
    expect(reading.answer()).toContain('재물, 일, 관계')
    expect(mocks.downloaded).not.toHaveBeenCalled()
  })

  it('should keep the AI setting selected when download consent was requested', async () => {
    modelId = 'lfm-2.6b-qad'
    mocks.downloaded.mockResolvedValue(false)
    reading.submit({birth, gender: 'N', question: '제 일은 어떨까요?'})
    await flush()
    expect(mocks.downloaded).toHaveBeenCalledWith('lfm-2.6b-qad')
    expect(reading.status()).toBe('consent')
    modelId = 'gemma-4-e2b'
    await reading.startDownload()
    expect(mocks.startTextModel).toHaveBeenCalledWith('lfm-2.6b-qad')
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({modelId: 'lfm-2.6b-qad'}))
    const requestId = vi.mocked(mocks.generate).mock.lastCall?.[0].requestId as string
    receive?.({requestId, text: '쉬운 풀이', type: 'complete'})
    expect(reading.answer()).toBe('쉬운 풀이')
  })

  it('should ignore a late Worker answer after cancellation', async () => {
    reading.submit({birth, gender: 'N', question: '제 일은 어떨까요?'})
    await flush()
    const requestId = vi.mocked(mocks.generate).mock.lastCall?.[0].requestId as string
    reading.cancel()
    receive?.({requestId, text: '늦은 풀이', type: 'complete'})
    expect(reading.status()).toBe('idle')
    expect(reading.answer()).toBe('')
    expect(mocks.dispose).toHaveBeenCalledOnce()
  })

  it('should stop before checking a model that the device does not support', () => {
    supported = false
    reading.submit({birth, gender: 'N', question: '제 일은 어떨까요?'})
    expect(reading.status()).toBe('unsupported')
    expect(mocks.downloaded).not.toHaveBeenCalled()
  })

  it('should report a failed model check without starting a Worker', async () => {
    mocks.downloaded.mockRejectedValueOnce(new Error('모델 저장소 오류'))
    reading.submit({birth, gender: 'N', question: '제 일은 어떨까요?'})
    await flush()
    expect(reading.status()).toBe('error')
    expect(reading.error()).toBe('모델 저장소 오류')
    expect(mocks.generate).not.toHaveBeenCalled()
  })
})
