// oxlint-disable no-await-in-loop -- Model sessions are loaded sequentially to cap peak browser memory.
import {type BackendFailedError, getErrorDetail, type SupertonicError} from './errors'
import {getSupertonicModelFileUrl, type SupertonicModel, type SupertonicModelFile} from './model'
import type {SupertonicBackend, SupertonicRuntime} from './runtime'
import type {SupertonicSessions} from './engine'
import {failureResult, type Result, successResult} from '../result'

export interface LoadBufferOptions {
  readonly expectedSize: number
  readonly fileName: string
  readonly loadedBefore: number
  readonly signal: AbortSignal
  readonly totalBytes: number
  readonly url: string
}

interface LoadSessionsOptions {
  readonly backend: SupertonicBackend
  readonly loadBuffer: (options: LoadBufferOptions) => Promise<Result<ArrayBuffer, SupertonicError>>
  readonly model: SupertonicModel
  readonly runtime: SupertonicRuntime
  readonly signal: AbortSignal
}

type MutableSupertonicSessions = {
  -readonly [Key in keyof SupertonicSessions]?: SupertonicSessions[Key]
}

const createBackendError = (backend: SupertonicBackend, error: unknown): BackendFailedError => ({
  backend,
  code: 'backend-failed',
  detail: getErrorDetail(error),
  phase: 'initialize',
  retryable: backend === 'webgpu',
})

export const releaseSessions = async (sessions: MutableSupertonicSessions) => {
  await Promise.all(
    Object.values(sessions).map(async (session) => {
      await session.release()
    }),
  )
}

const loadSessionBuffer = (
  options: LoadSessionsOptions,
  file: SupertonicModelFile,
  loadedBytes: number,
) =>
  options.loadBuffer({
    expectedSize: file.size,
    fileName: file.name,
    loadedBefore: loadedBytes,
    signal: options.signal,
    totalBytes: options.model.size,
    url: getSupertonicModelFileUrl(options.model, file),
  })

export const loadSessions = async (
  options: LoadSessionsOptions,
): Promise<Result<SupertonicSessions, SupertonicError>> => {
  const sessions: MutableSupertonicSessions = {}
  let loadedBytes = 0

  for (const file of options.model.files) {
    const bufferResult = await loadSessionBuffer(options, file, loadedBytes)

    if (!bufferResult.ok) {
      await releaseSessions(sessions)
      return bufferResult
    }

    try {
      sessions[file.key] = await options.runtime.InferenceSession.create(bufferResult.value, {
        executionProviders: [options.backend],
        graphOptimizationLevel: 'all',
        logSeverityLevel: 3,
      })
      loadedBytes += file.size
    } catch (error: unknown) {
      await releaseSessions(sessions)
      return failureResult(createBackendError(options.backend, error))
    }
  }

  return successResult(sessions as SupertonicSessions)
}
