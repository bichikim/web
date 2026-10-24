import {isWorkerRpcFailure, type WorkerRpcFailure} from './index'
export const createRpcCancelledError = <Phase extends string>(phase: Phase) =>
  ({code: 'cancelled', phase, retryable: false}) as const
export const createRpcWorkerFailedError = <Phase extends string>(phase: Phase, detail: string) =>
  ({code: 'worker-failed', detail, phase, retryable: true}) as const
export const mapWorkerRpcFailureToPhaseError = <Phase extends string>(
  error: unknown,
  phase: Phase,
  fallbackDetail: string,
) =>
  isWorkerRpcFailure(error) && error.code === 'disposed'
    ? createRpcCancelledError(phase)
    : createRpcWorkerFailedError(phase, isWorkerRpcFailure(error) ? error.detail : fallbackDetail)
/** Suppresses expected disposal while reporting transport failures through the caller's policy. */
export const createWorkerRpcFailureReporter =
  (report: (failure: WorkerRpcFailure) => void) =>
  (failure: WorkerRpcFailure): void => {
    if (failure.code !== 'disposed') {
      report(failure)
    }
  }
