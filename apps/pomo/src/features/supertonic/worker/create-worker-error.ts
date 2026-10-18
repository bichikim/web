import {getErrorDetail, type WorkerFailedError} from '../errors'

export const createWorkerError = (
  phase: WorkerFailedError['phase'],
  error: unknown,
): WorkerFailedError => ({
  code: 'worker-failed',
  detail: getErrorDetail(error),
  phase,
  retryable: true,
})
