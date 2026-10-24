import type {ExclusiveAsyncTaskResult} from 'src/utils/create-exclusive-async-task'
import {getErrorMessage} from 'src/utils/get-error-message'

export interface TextGenerationWorkerError {
  readonly message: string
  readonly restartRequired: false
  readonly type: 'error'
}

export interface ListenTextGenerationRequestsOptions<Request> {
  /** Worker 메시지 이벤트를 구독할 대상이다. */
  readonly scope: {
    readonly addEventListener: (
      type: 'message',
      listener: (event: MessageEvent<Request>) => void,
    ) => void
  }
  /** 요청을 처리하고 완료 또는 생략 결과를 반환한다. 별도 결과가 없는 처리도 허용한다. */
  readonly handle: (request: Request) => Promise<ExclusiveAsyncTaskResult | void>
  /** 오류에 메시지가 없을 때 사용할 문구이다. */
  readonly fallback: string
  /** 처리 오류와 그 오류가 발생한 원 요청을 전달한다. */
  readonly onError: (error: TextGenerationWorkerError, request: Request) => void
  /** 실행 중이어서 접수하지 않은 원 요청을 전달한다. 진행 중인 작업의 종료를 뜻하지 않는다. */
  readonly onSkipped: (request: Request) => void
}

/** Handles worker requests and translates rejected operations into protocol errors. */
export const listenTextGenerationRequests = <Request>(
  options: ListenTextGenerationRequestsOptions<Request>,
): void => {
  options.scope.addEventListener('message', (event) => {
    const request = event.data
    options.handle(request).then(
      (result) => {
        if (result?.status === 'skipped') {
          options.onSkipped(request)
        }
      },
      (error: unknown) => {
        options.onError(
          {
            message: getErrorMessage(error, options.fallback),
            restartRequired: false,
            type: 'error',
          },
          request,
        )
      },
    )
  })
}
