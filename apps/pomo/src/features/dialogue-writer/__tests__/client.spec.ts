import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createDialogueClient} from '../client'
import type {DialogueWorkerResponse} from '../messages'

type WorkerListener = (event: ErrorEvent | MessageEvent<DialogueWorkerResponse>) => void

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

  emitMessage(message: DialogueWorkerResponse) {
    for (const listener of this.#listeners.get('message') ?? []) {
      listener({data: message} as MessageEvent<DialogueWorkerResponse>)
    }
  }

  emitMessageError() {
    for (const listener of this.#listeners.get('messageerror') ?? []) {
      listener({} as MessageEvent<DialogueWorkerResponse>)
    }
  }
}

const getWorker = () => {
  const worker = FakeWorker.current

  if (worker === null) {
    throw new Error('대화문 Worker가 생성되지 않았습니다.')
  }

  return worker
}

beforeEach(() => {
  FakeWorker.current = null
  vi.stubGlobal('Worker', FakeWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('createDialogueClient', () => {
  it('should send requests and forward worker responses', () => {
    const onResponse = vi.fn()
    const client = createDialogueClient({modelId: 'qwen-2b', onResponse})
    const worker = getWorker()

    client.prepare()
    client.generate('삶의 행복에 대해 이야기해줘')
    worker.emitMessage({type: 'ready'})

    expect(worker.postMessage).toHaveBeenNthCalledWith(1, {
      modelId: 'qwen-2b',
      type: 'prepare',
    })
    expect(worker.postMessage).toHaveBeenNthCalledWith(2, {
      modelId: 'qwen-2b',
      request: '삶의 행복에 대해 이야기해줘',
      type: 'generate',
    })
    expect(onResponse).toHaveBeenCalledWith({type: 'ready'})
  })

  it('should translate worker crashes into serializable errors', () => {
    const onResponse = vi.fn()
    createDialogueClient({modelId: 'qwen-0.8b', onResponse})
    const worker = getWorker()

    worker.emitError('GPU 연결이 끊겼습니다.')
    worker.emitError('')

    expect(onResponse).toHaveBeenNthCalledWith(1, {
      message: 'GPU 연결이 끊겼습니다.',
      restartRequired: true,
      type: 'error',
    })
    expect(onResponse).toHaveBeenNthCalledWith(2, {
      message: '대화문 모델 Worker 실행 오류',
      restartRequired: true,
      type: 'error',
    })
  })

  it('should terminate the owned worker on disposal', () => {
    const client = createDialogueClient({modelId: 'qwen-0.8b', onResponse: vi.fn()})
    const worker = getWorker()

    client.dispose()

    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('should translate unreadable Worker responses into restartable errors', () => {
    const onResponse = vi.fn()
    createDialogueClient({modelId: 'qwen-0.8b', onResponse})
    const worker = getWorker()

    worker.emitMessageError()

    expect(onResponse).toHaveBeenCalledWith({
      message: 'Worker 응답을 읽지 못했습니다.',
      restartRequired: true,
      type: 'error',
    })
  })
})
