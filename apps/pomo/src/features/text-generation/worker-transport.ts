import {reportClientError} from '../client-error-reporter/reporter'

export interface WorkerTransport<Request> {
  readonly dispose: () => void
  readonly send: (request: Request) => void
}

export interface CreateWorkerTransportOptions<Response> {
  readonly createErrorResponse: (event: ErrorEvent) => Response
  readonly feature: string
  readonly onResponse: (response: Response) => void
  readonly worker: Worker
}

/** Owns a Worker and translates browser events into a typed feature transport. */
export const createWorkerTransport = <Request, Response>(
  options: CreateWorkerTransportOptions<Response>,
): WorkerTransport<Request> => {
  options.worker.addEventListener('message', (event: MessageEvent<Response>) => {
    options.onResponse(event.data)
  })
  options.worker.addEventListener('error', (event) => {
    reportClientError(event.error ?? {message: 'Worker execution failed', name: 'WorkerError'}, {
      feature: options.feature,
      source: 'worker',
    })
    options.onResponse(options.createErrorResponse(event))
  })
  options.worker.addEventListener('messageerror', () => {
    reportClientError(
      {message: 'Worker response deserialization failed', name: 'WorkerError'},
      {
        feature: options.feature,
        source: 'worker',
      },
    )
  })

  return {
    dispose: () => options.worker.terminate(),
    send: (request) => options.worker.postMessage(request),
  }
}
