export type WorkerTransportFailureCode = 'message-error' | 'worker-error'

export interface WorkerTransportFailure {
  readonly cause: unknown
  readonly code: WorkerTransportFailureCode
  readonly detail: string
}

export interface WorkerTransport<Request> {
  readonly dispose: () => void
  readonly send: (request: Request) => void
}

export interface CreateWorkerTransportOptions<Response> {
  readonly onFailure: (failure: WorkerTransportFailure) => void
  readonly onResponse: (response: Response) => void
  readonly worker: Worker
}

/** Owns a Worker and delivers its browser events through typed consumer callbacks. */
export const createWorkerTransport = <Request, Response>(
  options: CreateWorkerTransportOptions<Response>,
): WorkerTransport<Request> => {
  options.worker.addEventListener('message', (event: MessageEvent<Response>) => {
    options.onResponse(event.data)
  })
  options.worker.addEventListener('error', (event) => {
    options.onFailure({
      cause: event.error ?? {message: 'Worker execution failed', name: 'WorkerError'},
      code: 'worker-error',
      detail: event.message,
    })
  })
  options.worker.addEventListener('messageerror', () => {
    options.onFailure({
      cause: {message: 'Worker response deserialization failed', name: 'WorkerError'},
      code: 'message-error',
      detail: '',
    })
  })

  return {
    dispose: () => options.worker.terminate(),
    send: (request) => options.worker.postMessage(request),
  }
}
