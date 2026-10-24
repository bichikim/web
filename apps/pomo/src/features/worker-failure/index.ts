import type {WorkerTransportFailure} from 'src/utils/worker-transport'
import {reportClientError} from '../client-error-reporter/reporter'

export interface RestartRequiredWorkerResponse {
  readonly type: 'error'
  readonly restartRequired: true
  readonly message: string
}

export interface CreateWorkerFailureHandlerOptions {
  readonly feature: string
  readonly fallbackDetail: string
  readonly onResponse: (response: RestartRequiredWorkerResponse) => void
}

/** Reports transport failures and delivers a feature-specific restart-required response. */
export const createWorkerFailureHandler =
  (options: CreateWorkerFailureHandlerOptions): ((failure: WorkerTransportFailure) => void) =>
  (failure) => {
    reportClientError(failure.cause, {feature: options.feature, source: 'worker'})
    options.onResponse({
      message:
        failure.code === 'message-error'
          ? 'Worker 응답을 읽지 못했습니다.'
          : failure.detail || options.fallbackDetail,
      restartRequired: true,
      type: 'error',
    })
  }
