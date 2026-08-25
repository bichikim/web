export type WorkerRpcFailureCode = 'disposed' | 'message-error' | 'send-error' | 'worker-error'

export interface WorkerRpcFailure {
  readonly code: WorkerRpcFailureCode
  readonly detail: string
}

export const isWorkerRpcFailure = (value: unknown): value is WorkerRpcFailure => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  if (!('code' in value) || !('detail' in value) || typeof value.detail !== 'string') {
    return false
  }

  switch (value.code) {
    case 'disposed':
    case 'message-error':
    case 'send-error':
    case 'worker-error':
      return true
  }

  return false
}

export interface WorkerRpcRequestOptions<Request> {
  readonly createRequest: (requestId: number) => Request
  readonly transfer?: Array<Transferable>
}

export interface WorkerRpcTransport<Request, Response> {
  readonly dispose: () => void
  readonly getFailure: () => WorkerRpcFailure | null
  readonly request: (options: WorkerRpcRequestOptions<Request>) => Promise<Response>
}

export interface CreateWorkerRpcTransportOptions<Response> {
  readonly getRequestId: (response: Response) => number | null
  readonly onFailure?: (failure: WorkerRpcFailure) => void
  readonly onEvent: (response: Response) => void
  readonly worker: Worker
}

interface PendingRequest<Response> {
  readonly reject: (failure: WorkerRpcFailure) => void
  readonly resolve: (response: Response) => void
}

class WorkerRpcError extends Error implements WorkerRpcFailure {
  readonly code: WorkerRpcFailureCode
  readonly detail: string

  constructor(code: WorkerRpcFailureCode, detail: string, cause?: unknown) {
    super(detail, cause === undefined ? undefined : {cause})
    this.name = 'WorkerRpcError'
    this.code = code
    this.detail = detail
  }
}

const getErrorDetail = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.length > 0
  ) {
    return error.message
  }

  return fallback
}

/** Owns request correlation and the fatal lifecycle of one Worker. */
export const createWorkerRpcTransport = <Request, Response>(
  options: CreateWorkerRpcTransportOptions<Response>,
): WorkerRpcTransport<Request, Response> => {
  const pendingRequests = new Map<number, PendingRequest<Response>>()
  let failure: WorkerRpcError | null = null
  let nextRequestId = 1

  const terminate = () => {
    options.worker.terminate()
  }

  const fail = (nextFailure: WorkerRpcError) => {
    if (failure !== null) {
      return
    }

    failure = nextFailure

    try {
      options.onFailure?.(nextFailure)
    } catch {
      // Failure observation must not replace Worker lifecycle cleanup.
    }

    for (const pendingRequest of pendingRequests.values()) {
      pendingRequest.reject(nextFailure)
    }

    pendingRequests.clear()
    terminate()
  }

  const handleResponse = (response: Response) => {
    if (failure !== null) {
      return
    }

    const requestId = options.getRequestId(response)

    if (requestId === null) {
      options.onEvent(response)
      return
    }

    const pendingRequest = pendingRequests.get(requestId)

    if (pendingRequest === undefined) {
      return
    }

    pendingRequests.delete(requestId)
    pendingRequest.resolve(response)
  }

  options.worker.addEventListener('message', (event: MessageEvent<Response>) => {
    try {
      handleResponse(event.data)
    } catch (error) {
      fail(
        new WorkerRpcError('message-error', getErrorDetail(error, 'Worker 응답 처리 오류'), error),
      )
    }
  })
  options.worker.addEventListener('error', (event) => {
    fail(new WorkerRpcError('worker-error', event.message || 'Worker 실행 오류'))
  })
  options.worker.addEventListener('messageerror', () => {
    fail(new WorkerRpcError('message-error', 'Worker 응답을 읽지 못했습니다.'))
  })

  const request: WorkerRpcTransport<Request, Response>['request'] = (requestOptions) => {
    if (failure !== null) {
      return Promise.reject(failure)
    }

    const requestId = nextRequestId
    nextRequestId += 1

    return new Promise((resolve, reject) => {
      pendingRequests.set(requestId, {reject, resolve})

      try {
        options.worker.postMessage(
          requestOptions.createRequest(requestId),
          requestOptions.transfer ?? [],
        )
      } catch (error) {
        pendingRequests.delete(requestId)
        reject(
          new WorkerRpcError('send-error', getErrorDetail(error, 'Worker 요청 전송 오류'), error),
        )
      }
    })
  }

  return {
    dispose: () => {
      fail(new WorkerRpcError('disposed', 'Worker가 종료되었습니다.'))
    },
    getFailure: () => failure,
    request,
  }
}
