import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createAlbumTranslationClient} from '../client'
import type {AlbumTranslationWorkerResponse} from '../messages'

type WorkerListener = (event: ErrorEvent | MessageEvent<AlbumTranslationWorkerResponse>) => void

class FakeWorker {
  static current: FakeWorker | null = null

  readonly postMessage = vi.fn()
  readonly terminate = vi.fn()
  readonly #listeners = new Map<string, Array<WorkerListener>>()

  constructor() {
    FakeWorker.current = this
  }

  addEventListener(type: string, listener: WorkerListener) {
    const listeners = this.#listeners.get(type) ?? []
    listeners.push(listener)
    this.#listeners.set(type, listeners)
  }

  emitError(message: string) {
    for (const listener of this.#listeners.get('error') ?? []) {
      listener({message} as ErrorEvent)
    }
  }
}

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

    FakeWorker.current?.emitError('')
    expect(onResponse).toHaveBeenLastCalledWith({
      message: 'Gemma 4 번역 Worker 실행 오류',
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
