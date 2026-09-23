/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {createWorkerTransport, type WorkerTransportFailure} from '../index'

interface TestRequest {
  readonly type: 'request'
}

interface TestResponse {
  readonly type: 'complete'
}

type WorkerListener = (event: ErrorEvent | MessageEvent<TestResponse>) => void

class FakeWorker {
  readonly postMessage = vi.fn()
  readonly terminate = vi.fn()
  readonly #listeners = new Map<string, Array<WorkerListener>>()

  addEventListener(type: string, listener: WorkerListener) {
    const listeners = this.#listeners.get(type) ?? []
    listeners.push(listener)
    this.#listeners.set(type, listeners)
  }

  emitError(message: string, error?: unknown) {
    this.#emit('error', {error, message} as ErrorEvent)
  }

  emitMessage(response: TestResponse) {
    this.#emit('message', {data: response} as MessageEvent<TestResponse>)
  }

  emitMessageError() {
    this.#emit('messageerror', {} as MessageEvent<TestResponse>)
  }

  #emit(type: string, event: ErrorEvent | MessageEvent<TestResponse>) {
    for (const listener of this.#listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

const createTransport = (
  worker: FakeWorker,
  onFailure: (failure: WorkerTransportFailure) => void = vi.fn(),
) => {
  const onResponse = vi.fn()
  const transport = createWorkerTransport<TestRequest, TestResponse>({
    onFailure,
    onResponse,
    worker: worker as unknown as Worker,
  })

  return {onResponse, transport}
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('createWorkerTransport', () => {
  it('should forward messages and requests', () => {
    const worker = new FakeWorker()
    const {onResponse, transport} = createTransport(worker)
    const request = {type: 'request'} as const

    transport.send(request)
    worker.emitMessage({type: 'complete'})

    expect(worker.postMessage).toHaveBeenCalledWith(request)
    expect(onResponse).toHaveBeenCalledWith({type: 'complete'})
  })

  it('should let callers handle request delivery failures', () => {
    const worker = new FakeWorker()
    const {transport} = createTransport(worker)
    const error = new DOMException('Unable to clone request', 'DataCloneError')
    worker.postMessage.mockImplementationOnce(() => {
      throw error
    })

    expect(() => transport.send({type: 'request'})).toThrow(error)
  })

  it('should report worker errors', () => {
    const worker = new FakeWorker()
    const onFailure = vi.fn()
    const {onResponse} = createTransport(worker, onFailure)
    const cause = new Error('runtime failed')

    worker.emitError('Worker execution failed', cause)

    expect(onFailure).toHaveBeenCalledWith({
      cause,
      code: 'worker-error',
      detail: 'Worker execution failed',
    })
  })

  it('should preserve an empty Worker error detail', () => {
    const worker = new FakeWorker()
    const onFailure = vi.fn()
    createTransport(worker, onFailure)

    worker.emitError('')

    expect(onFailure).toHaveBeenCalledWith({
      cause: {message: 'Worker execution failed', name: 'WorkerError'},
      code: 'worker-error',
      detail: '',
    })
  })

  it('should report unreadable Worker messages', () => {
    const worker = new FakeWorker()
    const onFailure = vi.fn()
    createTransport(worker, onFailure)

    worker.emitMessageError()

    expect(onFailure).toHaveBeenCalledWith({
      cause: {message: 'Worker response deserialization failed', name: 'WorkerError'},
      code: 'message-error',
      detail: '',
    })
  })

  it('should terminate the Worker when disposed', () => {
    const worker = new FakeWorker()
    const {transport} = createTransport(worker)

    transport.dispose()

    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })
})
