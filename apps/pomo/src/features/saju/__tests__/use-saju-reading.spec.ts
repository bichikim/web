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
  createClient: vi.fn(),
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
    mocks.generate.mockReset()
    modelId = 'gemma-4-e2b'
    supported = true
    receive = null
    mocks.downloaded.mockResolvedValue(true)
    mocks.startTextModel.mockResolvedValue({status: 'complete'})
    mocks.createClient.mockImplementation((onResponse) => {
      receive = onResponse
      return {dispose: mocks.dispose, generate: mocks.generate}
    })
    const services: SajuReadingServices = {
      createClient: mocks.createClient,
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

  it('should select a cloud client and complete without downloading a device model', async () => {
    modelId = 'cloud'
    reading.submit({birth, gender: 'N', question: '제 일은 어떨까요?'})
    await flush()
    expect(mocks.createClient).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'cloud')
    expect(mocks.startTextModel).not.toHaveBeenCalled()
    const request = mocks.generate.mock.lastCall?.[0]
    receive?.({requestId: request.requestId, type: 'started'})
    expect(reading.status()).toBe('generating')
    receive?.({requestId: request.requestId, text: '클라우드 풀이', type: 'complete'})
    expect(reading.status()).toBe('complete')
    expect(reading.answer()).toBe('클라우드 풀이')
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

  it('should retain the active reading when another request is skipped', async () => {
    reading.submit({birth, gender: 'N', question: '제 일은 어떨까요?'})
    await flush()
    const request = mocks.generate.mock.lastCall?.[0]
    receive?.({requestId: request.requestId, type: 'started'})
    receive?.({reason: 'busy', request: {...request, requestId: 'rejected'}, type: 'skipped'})
    expect(reading.status()).toBe('generating')
    expect(mocks.dispose).not.toHaveBeenCalled()
    receive?.({requestId: request.requestId, text: '진행하던 풀이', type: 'complete'})
    expect(reading.status()).toBe('complete')
    expect(reading.answer()).toBe('진행하던 풀이')
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

  describe.each([
    ['detail', new TypeError('detail'), 'detail'],
    ['empty message', new Error(''), ''],
    ['whitespace message', new Error(' '), ' '],
    ['message-like object', {message: 'ignored'}, null],
    ['null', null, null],
  ])('%s failure', (_label, cause, message) => {
    it('should select the calculation error and stop before model checks', () => {
      const input = {
        birth,
        gender: 'N' as const,
        get question(): string {
          throw cause
        },
      }
      reading.submit(input)
      expect(reading.error()).toBe(message ?? '사주 계산에 실패했어요.')
      expect(reading.status()).toBe('error')
      expect(reading.canRetry()).toBe(false)
      expect(mocks.downloaded).not.toHaveBeenCalled()
    })

    it('should select the model-check error and retain retry', async () => {
      mocks.downloaded.mockRejectedValueOnce(cause)
      reading.submit({birth, gender: 'N', question: '제 일은 어떨까요?'})
      await flush()
      expect(reading.error()).toBe(message ?? '모델 상태를 확인하지 못했어요.')
      expect(reading.status()).toBe('error')
      expect(reading.canRetry()).toBe(true)
      expect(mocks.generate).not.toHaveBeenCalled()
    })

    it('should select the generation error after disposing the client', async () => {
      mocks.generate.mockImplementationOnce(() => {
        throw cause
      })
      reading.submit({birth, gender: 'N', question: '제 일은 어떨까요?'})
      await flush()
      expect(reading.error()).toBe(message ?? '사주 풀이를 시작하지 못했어요.')
      expect(reading.status()).toBe('error')
      expect(mocks.dispose).toHaveBeenCalledOnce()
    })

    it('should select the download error and retain retry', async () => {
      mocks.downloaded.mockResolvedValueOnce(false)
      mocks.startTextModel.mockRejectedValueOnce(cause)
      reading.submit({birth, gender: 'N', question: '제 일은 어떨까요?'})
      await flush()
      await reading.startDownload()
      expect(reading.error()).toBe(message ?? '모델을 내려받지 못했어요.')
      expect(reading.status()).toBe('error')
      expect(reading.canRetry()).toBe(true)
      expect(mocks.generate).not.toHaveBeenCalled()
    })
  })

  it('should ignore a rejected model check after cancellation without reading its message', async () => {
    const pending = Promise.withResolvers<boolean>()
    const cause = new Error()
    const readMessage = vi.fn(() => 'late failure')
    Object.defineProperty(cause, 'message', {get: readMessage})
    mocks.downloaded.mockReturnValueOnce(pending.promise)
    reading.submit({birth, gender: 'N', question: '제 일은 어떨까요?'})
    reading.cancel()
    pending.reject(cause)
    await flush()
    expect(reading.status()).toBe('idle')
    expect(reading.error()).toBeNull()
    expect(readMessage).not.toHaveBeenCalled()
  })
})
