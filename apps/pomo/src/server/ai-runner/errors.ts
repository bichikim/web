// oxlint-disable max-classes-per-file -- These error classes define the runner's small public error taxonomy.

export class RunnerRequestConflictError extends Error {
  readonly code = 'idempotency-conflict'

  constructor(message = 'The runner job ID is already used by a different request') {
    super(message)
    this.name = 'RunnerRequestConflictError'
  }
}

export class RunnerConfigurationError extends Error {
  readonly code = 'configuration-error'

  constructor(message: string) {
    super(message)
    this.name = 'RunnerConfigurationError'
  }
}

export class RunnerExecutionError extends Error {
  readonly code: string

  constructor(code: string, message: string, options?: {readonly cause?: unknown}) {
    super(message, options)
    this.code = code
    this.name = 'RunnerExecutionError'
  }
}

export const getRunnerError = (
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
): {readonly code: string; readonly message: string} => {
  if (error instanceof RunnerExecutionError) {
    return {code: error.code, message: error.message}
  }

  if (error instanceof Error) {
    return {code: fallbackCode, message: error.message || fallbackMessage}
  }

  return {code: fallbackCode, message: fallbackMessage}
}
