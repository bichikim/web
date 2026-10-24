export type AiRunnerErrorCode = 'invalid-response' | 'request-failed' | 'unavailable'

export class AiRunnerError extends Error {
  readonly code: AiRunnerErrorCode
  readonly retryable: boolean
  readonly status: number | undefined

  constructor(
    code: AiRunnerErrorCode,
    message: string,
    options?: {readonly cause?: unknown; readonly retryable?: boolean; readonly status?: number},
  ) {
    super(message, options)
    this.code = code
    this.name = 'AiRunnerError'
    this.retryable = options?.retryable ?? code !== 'invalid-response'
    this.status = options?.status
  }
}
