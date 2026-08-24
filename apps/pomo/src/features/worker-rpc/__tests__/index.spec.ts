import {afterEach, describe, expect, it, vi} from 'vitest'

import {createWorkerRpcTransport, isWorkerRpcFailure} from '../index'

interface ProgressResponse {
  readonly progress: number
  readonly type: 'progress'
}

interface ResultResponse {
  readonly requestId: number
  readonly type: 'result'
  readonly value: string
}

type TestResponse = ProgressResponse | ResultResponse

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

  emitError(message: string) {
    this.#emit('error', {message} as ErrorEvent)
  }

  emitMessage(response: TestResponse) {
    this.#emit('message', {data: response} as MessageEvent<TestResponse>)
  }

  emitMessageError() {
    this.#emit('messageerror', {} as MessageEvent)
  }

  #emit(type: string, event: ErrorEvent | MessageEvent<TestResponse>) {
    for (const listener of this.#listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

const createTransport = (worker: FakeWorker, onEvent = vi.fn()) =>
  createWorkerRpcTransport<{readonly requestId: number; readonly value: string}, TestResponse>({
    getRequestId: (response) => (response.type === 'result' ? response.requestId : null),
    onEvent,
    worker: worker as unknown as Worker,
  })

afterEach(() => {
  vi.clearAllMocks()
})

describe('createWorkerRpcTransport', () => {
  it('should correlate concurrent requests and send transferables', async () => {
    const worker = new FakeWorker()
    const onEvent = vi.fn()
    const transport = createTransport(worker, onEvent)
    const buffer = new ArrayBuffer(4)
    const firstRequest = transport.request({
      createRequest: (requestId) => ({requestId, value: 'first'}),
      transfer: [buffer],
    })
    const secondRequest = transport.request({
      createRequest: (requestId) => ({requestId, value: 'second'}),
    })

    expect(transport.getFailure()).toBeNull()

    worker.emitMessage({progress: 40, type: 'progress'})
    worker.emitMessage({requestId: 99, type: 'result', value: 'late'})
    worker.emitMessage({requestId: 2, type: 'result', value: 'second result'})
    worker.emitMessage({requestId: 1, type: 'result', value: 'first result'})

    await expect(firstRequest).resolves.toEqual({
      requestId: 1,
      type: 'result',
      value: 'first result',
    })
    await expect(secondRequest).resolves.toEqual({
      requestId: 2,
      type: 'result',
      value: 'second result',
    })
    expect(worker.postMessage).toHaveBeenNthCalledWith(1, {requestId: 1, value: 'first'}, [buffer])
    expect(worker.postMessage).toHaveBeenNthCalledWith(2, {requestId: 2, value: 'second'}, [])
    expect(onEvent).toHaveBeenCalledWith({progress: 40, type: 'progress'})
  })

  it('should reject all work and future requests after a worker error', async () => {
    const worker = new FakeWorker()
    const onFailure = vi.fn()
    const transport = createWorkerRpcTransport<
      {readonly requestId: number; readonly value: string},
      TestResponse
    >({
      getRequestId: (response) => (response.type === 'result' ? response.requestId : null),
      onEvent: vi.fn(),
      onFailure,
      worker: worker as unknown as Worker,
    })
    const firstRequest = transport.request({
      createRequest: (requestId) => ({requestId, value: 'first'}),
    })
    const secondRequest = transport.request({
      createRequest: (requestId) => ({requestId, value: 'second'}),
    })

    worker.emitError('연결 끊김')
    worker.emitMessage({requestId: 1, type: 'result', value: 'late'})

    await expect(firstRequest).rejects.toMatchObject({code: 'worker-error', detail: '연결 끊김'})
    await expect(secondRequest).rejects.toMatchObject({code: 'worker-error', detail: '연결 끊김'})
    await expect(
      transport.request({createRequest: (requestId) => ({requestId, value: 'retry'})}),
    ).rejects.toMatchObject({code: 'worker-error', detail: '연결 끊김'})
    expect(transport.getFailure()).toMatchObject({code: 'worker-error', detail: '연결 끊김'})
    transport.dispose()
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure).toHaveBeenCalledWith(
      expect.objectContaining({code: 'worker-error', detail: '연결 끊김'}),
    )
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('should isolate failure observers', async () => {
    const worker = new FakeWorker()
    const transport = createWorkerRpcTransport<
      {readonly requestId: number; readonly value: string},
      TestResponse
    >({
      getRequestId: (response) => (response.type === 'result' ? response.requestId : null),
      onEvent: vi.fn(),
      onFailure: () => {
        throw new Error('observer failed')
      },
      worker: worker as unknown as Worker,
    })
    const request = transport.request({
      createRequest: (requestId) => ({requestId, value: 'request'}),
    })

    expect(() => worker.emitError('연결 끊김')).not.toThrow()
    await expect(request).rejects.toMatchObject({code: 'worker-error', detail: '연결 끊김'})
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('should reject pending work after messageerror and disposal', async () => {
    const messageWorker = new FakeWorker()
    const messageTransport = createTransport(messageWorker)
    const unreadableRequest = messageTransport.request({
      createRequest: (requestId) => ({requestId, value: 'message'}),
    })

    messageWorker.emitMessageError()

    await expect(unreadableRequest).rejects.toMatchObject({
      code: 'message-error',
      detail: 'Worker 응답을 읽지 못했습니다.',
    })

    const disposedWorker = new FakeWorker()
    const disposedTransport = createTransport(disposedWorker)
    const cancelledRequest = disposedTransport.request({
      createRequest: (requestId) => ({requestId, value: 'dispose'}),
    })
    disposedTransport.dispose()
    disposedTransport.dispose()

    await expect(cancelledRequest).rejects.toMatchObject({
      code: 'disposed',
      detail: 'Worker가 종료되었습니다.',
    })
    expect(disposedWorker.terminate).toHaveBeenCalledTimes(1)
  })

  it('should reject pending work when response handling throws', async () => {
    const worker = new FakeWorker()
    const transport = createWorkerRpcTransport<
      {readonly requestId: number; readonly value: string},
      TestResponse
    >({
      getRequestId: () => {
        throw new Error('응답 계약 오류')
      },
      onEvent: vi.fn(),
      worker: worker as unknown as Worker,
    })
    const request = transport.request({
      createRequest: (requestId) => ({requestId, value: 'request'}),
    })

    expect(() =>
      worker.emitMessage({requestId: 1, type: 'result', value: 'response'}),
    ).not.toThrow()
    await expect(request).rejects.toMatchObject({
      code: 'message-error',
      detail: '응답 계약 오류',
    })
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('should reject only the request when postMessage throws', async () => {
    const worker = new FakeWorker()
    worker.postMessage.mockImplementationOnce(() => {
      throw new DOMException('복제 실패', 'DataCloneError')
    })
    const transport = createTransport(worker)

    await expect(
      transport.request({createRequest: (requestId) => ({requestId, value: 'invalid'})}),
    ).rejects.toMatchObject({code: 'send-error', detail: '복제 실패'})

    const nextRequest = transport.request({
      createRequest: (requestId) => ({requestId, value: 'valid'}),
    })
    worker.emitMessage({requestId: 2, type: 'result', value: 'done'})

    await expect(nextRequest).resolves.toEqual({requestId: 2, type: 'result', value: 'done'})
    expect(worker.terminate).not.toHaveBeenCalled()
  })
})

describe('isWorkerRpcFailure', () => {
  it('should accept only complete transport failure values', () => {
    expect(isWorkerRpcFailure({code: 'disposed', detail: 'closed'})).toBe(true)
    expect(isWorkerRpcFailure({code: 'unknown', detail: 'closed'})).toBe(false)
    expect(isWorkerRpcFailure({code: 'disposed'})).toBe(false)
    expect(isWorkerRpcFailure(null)).toBe(false)
  })
})
