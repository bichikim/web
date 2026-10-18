export type WorkerTransportFailureCode = 'message-error' | 'worker-error'

export interface WorkerTransportFailure {
  readonly cause: unknown
  readonly code: WorkerTransportFailureCode
  readonly detail: string
}

export interface WorkerTransport<Request> {
  readonly dispose: () => void
  readonly send: (request: Request, transfer?: Array<Transferable>) => void
}

export interface CreateWorkerTransportOptions<Response> {
  /** Worker 실행 오류나 응답 역직렬화 실패 시 오류 정보를 받는다. 반환값은 사용하지 않는다. */
  readonly onFailure: (failure: WorkerTransportFailure) => void
  /** Worker의 메시지 이벤트에서 추출한 응답 데이터를 받는다. 반환값은 사용하지 않는다. */
  readonly onResponse: (response: Response) => void
  /** 전송 객체가 사용할 Worker. 종료 책임을 전송 객체에 넘기며 dispose를 호출하면 Worker를 종료한다. */
  readonly worker: Worker
}

/** 생성 시점의 Worker와 콜백을 사용하는 전송 객체를 만든다. dispose를 호출하면 해당 Worker를 종료한다. */
export const createWorkerTransport = <Request, Response>(
  options: CreateWorkerTransportOptions<Response>,
): WorkerTransport<Request> => {
  const {worker, onResponse, onFailure} = options
  worker.addEventListener('message', (event: MessageEvent<Response>) => {
    onResponse(event.data)
  })
  worker.addEventListener('error', (event) => {
    onFailure({
      cause: event.error ?? {message: 'Worker execution failed', name: 'WorkerError'},
      code: 'worker-error',
      detail: event.message,
    })
  })
  worker.addEventListener('messageerror', () => {
    onFailure({
      cause: {message: 'Worker response deserialization failed', name: 'WorkerError'},
      code: 'message-error',
      detail: '',
    })
  })

  return {
    dispose: () => worker.terminate(),
    send: (request, transfer) => {
      if (transfer === undefined) {
        worker.postMessage(request)
        return
      }

      worker.postMessage(request, transfer)
    },
  }
}
