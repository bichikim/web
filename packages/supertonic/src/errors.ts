export type SupertonicPhase = 'download' | 'generate' | 'initialize' | 'validate'

interface SupertonicErrorBase {
  readonly phase: SupertonicPhase
  readonly retryable: boolean
}

export interface BackendFailedError extends SupertonicErrorBase {
  readonly backend: 'wasm' | 'webgpu'
  readonly code: 'backend-failed'
  readonly detail: string
  readonly phase: 'initialize'
}

export interface CancelledError extends SupertonicErrorBase {
  readonly code: 'cancelled'
  readonly phase: 'download' | 'generate' | 'initialize'
  readonly retryable: false
}

export interface DownloadFailedError extends SupertonicErrorBase {
  readonly code: 'download-failed'
  readonly fileName: string
  readonly phase: 'download'
  readonly status: number | null
}

export interface GenerationBusyError extends SupertonicErrorBase {
  readonly code: 'generation-busy'
  readonly phase: 'generate'
  readonly retryable: true
}

export interface InvalidModelDataError extends SupertonicErrorBase {
  readonly asset: 'config' | 'indexer' | 'manifest' | 'voice'
  readonly code: 'invalid-model-data'
  readonly phase: 'validate'
  readonly retryable: false
}

export interface InvalidModelError extends SupertonicErrorBase {
  readonly code: 'invalid-model'
  readonly modelId: string
  readonly phase: 'initialize'
  readonly retryable: false
}

export interface ModelNotReadyError extends SupertonicErrorBase {
  readonly code: 'model-not-ready'
  readonly phase: 'generate'
  readonly retryable: false
}

export interface WorkerFailedError extends SupertonicErrorBase {
  readonly code: 'worker-failed'
  readonly detail: string
  readonly phase: 'generate' | 'initialize'
  readonly retryable: true
}

export type SupertonicError =
  | BackendFailedError
  | CancelledError
  | DownloadFailedError
  | GenerationBusyError
  | InvalidModelDataError
  | InvalidModelError
  | ModelNotReadyError
  | WorkerFailedError

export const getErrorDetail = (error: unknown) =>
  error instanceof Error ? error.message : '알 수 없는 오류'
