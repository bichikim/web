/** @vitest-environment node */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createWorkerHarness} from 'src/__tests__/create-worker-harness'

const reportClientError = vi.hoisted(() => vi.fn())

vi.mock('../../client-error-reporter/reporter', () => ({reportClientError}))

import {createAlbumTranslationClient} from '../client'
import type {AlbumTranslationWorkerResponse} from '../messages'

const FakeWorker = createWorkerHarness<AlbumTranslationWorkerResponse>()

beforeEach(() => {
  FakeWorker.current = null
  vi.stubGlobal('Worker', FakeWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('createAlbumTranslationClient', () => {
  it('should send an album translation request to its worker', () => {
    const client = createAlbumTranslationClient({onResponse: vi.fn()})

    client.translate({description: '쉬어가는 밤', title: '밤'})

    expect(FakeWorker.current?.postMessage).toHaveBeenCalledWith({
      description: '쉬어가는 밤',
      title: '밤',
      type: 'translate',
    })
  })

  it('should translate worker crashes into a serializable error', () => {
    const onResponse = vi.fn()
    createAlbumTranslationClient({onResponse})

    FakeWorker.current?.emitError('GPU 연결이 끊겼습니다.')

    expect(onResponse).toHaveBeenCalledWith({
      message: 'GPU 연결이 끊겼습니다.',
      restartRequired: true,
      type: 'error',
    })
    expect(reportClientError).toHaveBeenCalledWith(
      {message: 'Worker execution failed', name: 'WorkerError'},
      {feature: 'album-translation', source: 'worker'},
    )

    FakeWorker.current?.emitError('')
    expect(onResponse).toHaveBeenLastCalledWith({
      message: 'Gemma 4 번역 Worker 실행 오류',
      restartRequired: true,
      type: 'error',
    })

    FakeWorker.current?.emitMessageError()
    expect(onResponse).toHaveBeenLastCalledWith({
      message: 'Worker 응답을 읽지 못했습니다.',
      restartRequired: true,
      type: 'error',
    })
  })

  it('should terminate the worker on disposal', () => {
    const client = createAlbumTranslationClient({onResponse: vi.fn()})

    client.dispose()

    expect(FakeWorker.current?.terminate).toHaveBeenCalledOnce()
  })
})
