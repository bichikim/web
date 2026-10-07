import {getErrorMessage} from 'src/utils/get-error-message'

export interface TextGenerationWorkerError {
  readonly message: string
  readonly restartRequired: false
  readonly type: 'error'
}

export interface ListenTextGenerationRequestsOptions<Request> {
  readonly scope: {
    readonly addEventListener: (
      type: 'message',
      listener: (event: MessageEvent<Request>) => void,
    ) => void
  }
  readonly handle: (request: Request) => Promise<void>
  readonly fallback: string
  readonly onError: (error: TextGenerationWorkerError, request: Request) => void
}

/** Handles worker requests and translates rejected operations into protocol errors. */
export const listenTextGenerationRequests = <Request>(
  options: ListenTextGenerationRequestsOptions<Request>,
): void => {
  options.scope.addEventListener('message', (event) => {
    options.handle(event.data).catch((error: unknown) => {
      options.onError(
        {message: getErrorMessage(error, options.fallback), restartRequired: false, type: 'error'},
        event.data,
      )
    })
  })
}
