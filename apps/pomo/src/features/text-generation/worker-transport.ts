export interface WorkerTransport<Request> {
  readonly dispose: () => void
  readonly send: (request: Request) => void
}

export interface CreateWorkerTransportOptions<Response> {
  readonly createErrorResponse: (event: ErrorEvent) => Response
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
    options.onResponse(options.createErrorResponse(event))
  })

  return {
    dispose: () => options.worker.terminate(),
    send: (request) => options.worker.postMessage(request),
  }
}
