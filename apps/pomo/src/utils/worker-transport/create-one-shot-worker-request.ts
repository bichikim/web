export interface OneShotWorkerReply<Value> {
  readonly resolve: (value: Value) => void
  readonly reject: (error: unknown) => void
}
export interface OneShotWorkerRequestOptions<Request, Response, Value> {
  readonly worker: Worker | (() => Worker)
  readonly request: Request
  readonly transfer?: Transferable[]
  readonly signal?: AbortSignal
  readonly onMessage: (response: Response, reply: OneShotWorkerReply<Value>) => void
  readonly failureMessage: string
  readonly messageFailureMessage?: string
  readonly abortError?: (signal: AbortSignal) => unknown
  readonly sendError?: (error: unknown) => unknown
}
/** Settles one Worker request and owns abort, handlers and termination. */
export const createOneShotWorkerRequest = <Request, Response, Value>(
  options: OneShotWorkerRequestOptions<Request, Response, Value>,
): Promise<Value> =>
  new Promise((resolve, reject) => {
    const abortError = () =>
      options.signal === undefined
        ? new DOMException('Worker request cancelled', 'AbortError')
        : (options.abortError?.(options.signal) ?? options.signal.reason)
    if (options.signal?.aborted) {
      reject(abortError())
      return
    }
    const worker = typeof options.worker === 'function' ? options.worker() : options.worker
    let settled = false
    const cleanUp = () => {
      options.signal?.removeEventListener('abort', handleAbort)
      worker.onmessage = null
      worker.onerror = null
      worker.onmessageerror = null
      worker.terminate()
    }
    const settle = (action: () => void) => {
      if (settled) {
        return
      }
      settled = true
      cleanUp()
      action()
    }
    const reply: OneShotWorkerReply<Value> = {
      reject: (error) => settle(() => reject(error)),
      resolve: (value) => settle(() => resolve(value)),
    }
    function handleAbort() {
      if (options.signal !== undefined) {
        reply.reject(abortError())
      }
    }
    worker.onmessage = (event: MessageEvent<Response>) => {
      if (settled) {
        return
      }
      try {
        options.onMessage(event.data, reply)
      } catch (error: unknown) {
        reply.reject(error)
      }
    }
    worker.onerror = (event) => reply.reject(new Error(event.message || options.failureMessage))
    worker.onmessageerror = () =>
      reply.reject(new Error(options.messageFailureMessage ?? options.failureMessage))
    options.signal?.addEventListener('abort', handleAbort, {once: true})
    try {
      if (options.transfer === undefined) {
        worker.postMessage(options.request)
      } else {
        worker.postMessage(options.request, options.transfer)
      }
    } catch (error: unknown) {
      reply.reject(options.sendError?.(error) ?? error)
    }
  })
