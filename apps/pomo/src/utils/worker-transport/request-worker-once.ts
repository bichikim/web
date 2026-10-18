export interface RequestWorkerOnceReply<Value> {
  /** 결과값으로 Promise를 이행하고 Worker를 종료한다. 최초 완료 요청만 반영한다. */
  readonly resolve: (value: Value) => void
  /** 전달한 사유로 Promise를 거부하고 Worker를 종료한다. 최초 완료 요청만 반영한다. */
  readonly reject: (error: unknown) => void
}
export interface RequestWorkerOnceOptions<Request, Response, Value> {
  /**
   * 요청 전용 Worker 또는 요청 시작 시 호출해 Worker를 반환하는 생성 함수.
   * 요청이 시작되면 이 함수가 Worker의 메시지·오류 핸들러와 종료를 맡는다.
   * 요청이 완료·실패·취소되면 Worker를 종료하므로 다른 요청과 공유하지 않는다.
   * 이미 취소된 요청에서는 생성 함수를 호출하지 않는다.
   */
  readonly worker: Worker | (() => Worker)
  /** Worker에 한 번 전송할 요청 데이터. */
  readonly request: Request
  /**
   * 요청과 함께 전송하며 Worker로 소유권을 넘길 자원 목록.
   * 생략하면 전송 목록 없이 요청 데이터를 보낸다.
   */
  readonly transfer?: Transferable[]
  /**
   * 요청을 취소할 신호. 취소되면 Promise를 거부하고 실행 중인 Worker를 종료한다.
   * 생략하면 외부 취소 신호를 연결하지 않는다.
   */
  readonly signal?: AbortSignal
  /**
   * 요청이 끝나기 전 도착하는 각 응답 데이터와 완료 제어 객체를 받는다.
   * reply.resolve 또는 reply.reject를 호출해 요청을 끝내며, 호출하지 않으면 계속 기다린다.
   * 반환값은 사용하거나 기다리지 않는다. 동기 예외를 던지면 해당 사유로 요청을 거부한다.
   */
  readonly handleResponse: (response: Response, reply: RequestWorkerOnceReply<Value>) => void
  /** Worker 오류 이벤트에 메시지가 없을 때 사용할 오류 메시지. */
  readonly failureMessage: string
  /** Worker 응답을 역직렬화하지 못했을 때 사용할 오류 메시지. 생략하면 failureMessage를 사용한다. */
  readonly messageFailureMessage?: string
  /**
   * 취소된 signal을 받아 Promise의 거부 사유를 반환한다.
   * 생략하거나 null·undefined를 반환하면 signal.reason을 사용한다.
   */
  readonly getAbortError?: (signal: AbortSignal) => unknown
  /**
   * 요청 전송 중 postMessage가 던진 값을 받아 Promise의 거부 사유로 변환한다.
   * 생략하거나 null·undefined를 반환하면 원래 던져진 값을 사용한다.
   */
  readonly mapSendError?: (error: unknown) => unknown
}
/** Worker에 요청을 한 번 보내고 결과를 기다린다. 요청이 끝나면 핸들러를 정리하고 Worker를 종료한다. */
export const requestWorkerOnce = <Request, Response, Value>(
  options: RequestWorkerOnceOptions<Request, Response, Value>,
): Promise<Value> =>
  new Promise((resolve, reject) => {
    const {
      getAbortError,
      failureMessage,
      messageFailureMessage,
      handleResponse,
      request,
      mapSendError,
      signal,
      transfer,
      worker: workerSource,
    } = options
    const resolveAbortError = () =>
      signal === undefined
        ? new DOMException('Worker request cancelled', 'AbortError')
        : (getAbortError?.(signal) ?? signal.reason)
    if (signal?.aborted) {
      reject(resolveAbortError())
      return
    }
    const worker = typeof workerSource === 'function' ? workerSource() : workerSource
    let settled = false
    const cleanUp = () => {
      signal?.removeEventListener('abort', handleAbort)
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
    const reply: RequestWorkerOnceReply<Value> = {
      reject: (error) => settle(() => reject(error)),
      resolve: (value) => settle(() => resolve(value)),
    }
    function handleAbort() {
      if (signal !== undefined) {
        reply.reject(resolveAbortError())
      }
    }
    worker.onmessage = (event: MessageEvent<Response>) => {
      if (settled) {
        return
      }
      try {
        handleResponse(event.data, reply)
      } catch (error: unknown) {
        reply.reject(error)
      }
    }
    worker.onerror = (event) => reply.reject(new Error(event.message || failureMessage))
    worker.onmessageerror = () => reply.reject(new Error(messageFailureMessage ?? failureMessage))
    signal?.addEventListener('abort', handleAbort, {once: true})
    try {
      if (transfer === undefined) {
        worker.postMessage(request)
      } else {
        worker.postMessage(request, transfer)
      }
    } catch (error: unknown) {
      reply.reject(mapSendError?.(error) ?? error)
    }
  })
