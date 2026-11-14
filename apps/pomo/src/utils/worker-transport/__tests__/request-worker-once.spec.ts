/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'
import {requestWorkerOnce, type RequestWorkerOnceReply} from '../request-worker-once'

const createWorker = () => ({
  onerror: null as ((event: ErrorEvent) => void) | null,
  onmessage: null as ((event: MessageEvent<string>) => void) | null,
  onmessageerror: null as (() => void) | null,
  postMessage: vi.fn(),
  terminate: vi.fn(),
})

it('should reject the returned Promise when reading an option throws', async () => {
  const worker = createWorker()
  const failure = new Error('option read failed')
  const options = {
    failureMessage: 'worker failed',
    handleResponse: vi.fn(),
    request: 'request',
    get signal(): AbortSignal {
      throw failure
    },
    worker,
  }

  await expect(requestWorkerOnce<string, string, string>(options)).rejects.toBe(failure)
  expect(worker.postMessage).not.toHaveBeenCalled()
})

it('should keep the original message callback after options are reassigned', async () => {
  const worker = createWorker()
  const handleResponse = vi.fn((value: string, reply: RequestWorkerOnceReply<string>) =>
    reply.resolve(value),
  )
  const options = {
    failureMessage: 'worker failed',
    handleResponse,
    request: 'request',
    worker,
  }
  const result = requestWorkerOnce<string, string, string>(options)
  options.handleResponse = vi.fn((_: string, reply: RequestWorkerOnceReply<string>) =>
    reply.resolve('replacement'),
  )
  worker.onmessage?.(new MessageEvent('message', {data: 'original'}))

  await expect(result).resolves.toBe('original')
  expect(handleResponse).toHaveBeenCalledOnce()
  expect(options.handleResponse).not.toHaveBeenCalled()
  expect(worker.terminate).toHaveBeenCalledOnce()
})

it('should keep the original abort signal and callback and remove its listener', async () => {
  const worker = createWorker()
  const original = new AbortController()
  const replacement = new AbortController()
  const removeListener = vi.spyOn(original.signal, 'removeEventListener')
  const failure = new Error('original abort')
  const getAbortError = vi.fn((_signal: AbortSignal) => failure)
  const options = {
    failureMessage: 'worker failed',
    getAbortError,
    handleResponse: vi.fn(),
    request: 'request',
    signal: original.signal,
    worker,
  }
  const result = requestWorkerOnce<string, string, string>(options)
  const assertion = expect(result).rejects.toBe(failure)
  options.signal = replacement.signal
  options.getAbortError = vi.fn((_signal: AbortSignal) => new Error('replacement abort'))
  original.abort()

  await assertion
  expect(getAbortError).toHaveBeenCalledWith(original.signal)
  expect(options.getAbortError).not.toHaveBeenCalled()
  expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function))
  expect(worker.terminate).toHaveBeenCalledOnce()
})

it.each(['error', 'messageerror'] as const)(
  'should keep the original fallback message for a later %s event',
  async (event) => {
    const worker = createWorker()
    const options = {
      failureMessage: 'original worker failure',
      handleResponse: vi.fn(),
      messageFailureMessage: 'original message failure',
      request: 'request',
      worker,
    }
    const result = requestWorkerOnce<string, string, string>(options)
    const assertion = expect(result).rejects.toThrow(
      event === 'error' ? 'original worker failure' : 'original message failure',
    )
    options.failureMessage = 'replacement worker failure'
    options.messageFailureMessage = 'replacement message failure'
    if (event === 'error') {
      worker.onerror?.(new ErrorEvent('error'))
    } else {
      worker.onmessageerror?.()
    }

    await assertion
    expect(worker.terminate).toHaveBeenCalledOnce()
  },
)

it('should capture send options before the Worker factory changes them', async () => {
  const worker = createWorker()
  const request = {type: 'original'}
  const transfer: Transferable[] = [new ArrayBuffer(1)]
  const failure = new Error('original send failure')
  const mapSendError = vi.fn((_error: unknown) => failure)
  const options = {
    failureMessage: 'worker failed',
    handleResponse: vi.fn(),
    mapSendError,
    request,
    transfer,
    worker: () => {
      options.request = {type: 'replacement'}
      options.transfer = []
      options.mapSendError = vi.fn((_error: unknown) => new Error('replacement send failure'))
      return worker
    },
  }
  const sendFailure = new Error('postMessage failed')
  worker.postMessage.mockImplementation(() => {
    throw sendFailure
  })

  await expect(requestWorkerOnce<typeof request, string, string>(options)).rejects.toBe(failure)
  expect(worker.postMessage).toHaveBeenCalledWith(request, transfer)
  expect(mapSendError).toHaveBeenCalledWith(sendFailure)
  expect(options.mapSendError).not.toHaveBeenCalled()
  expect(worker.terminate).toHaveBeenCalledOnce()
})
