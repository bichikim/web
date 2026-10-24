import type {
  AiRunnerJobRequest,
  AiRunnerJobStatus,
  AiRunnerJobStatusResponse,
} from '../ai/runner-contract.ts'

export interface RunnerError {
  readonly code: string
  readonly message: string
}

export interface RunnerMetrics {
  readonly inferenceMs?: number
  readonly queueMs?: number
}

export interface RunnerJobRecord {
  readonly cancelRequested: boolean
  readonly createdAt: number
  readonly error: RunnerError | null
  readonly finishedAt: number | null
  readonly jobId: string
  readonly metrics: RunnerMetrics | null
  readonly progress: number
  readonly recoveryCount: number
  readonly request: AiRunnerJobRequest
  readonly result: Record<string, unknown> | null
  readonly startedAt: number | null
  readonly status: AiRunnerJobStatus
  readonly updatedAt: number
}

export interface RunnerExecutionContext {
  readonly onProgress: (progress: number) => void
  readonly signal: AbortSignal
}

export interface RunnerTextExecutionResult {
  readonly kind: 'text'
  readonly text: string
}

export interface RunnerArtifactExecutionResult {
  readonly bytes: Uint8Array
  readonly contentType: string
  readonly durationMs?: number
  readonly kind: 'artifact'
}

export type RunnerExecutionResult = RunnerArtifactExecutionResult | RunnerTextExecutionResult

export interface RunnerExecutor {
  execute(job: RunnerJobRecord, context: RunnerExecutionContext): Promise<RunnerExecutionResult>
}

export interface RunnerStoredArtifact {
  readonly contentType: string
  readonly durationMs?: number
  readonly objectKey: string
  readonly sizeBytes: number
}

export interface RunnerArtifactStore {
  delete(objectKey: string): Promise<void>
  put(input: {
    readonly bytes: Uint8Array
    readonly contentType: string
    readonly durationMs?: number
    readonly jobId: string
    readonly objectKeyPrefix: string
    readonly signal?: AbortSignal
  }): Promise<RunnerStoredArtifact>
}

export interface RunnerService {
  cancel(jobId: string): AiRunnerJobStatusResponse | null
  close(): Promise<void>
  getStatus(jobId: string): AiRunnerJobStatusResponse | null
  recover(): void
  submit(request: AiRunnerJobRequest): {readonly created: boolean; readonly jobId: string}
  waitForIdle(): Promise<void>
}
