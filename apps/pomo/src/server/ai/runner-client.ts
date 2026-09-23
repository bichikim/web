import {AiRunnerError} from './runner-error'
// oxlint-disable no-await-in-loop -- The response must be read incrementally to enforce the byte limit.

import {env} from 'src/env'

import {
  type AiRunnerJobRequest,
  type AiRunnerJobStatusResponse,
  aiRunnerJobStatusResponseSchema,
  aiRunnerSubmitResponseSchema,
} from './runner-contract'

const MAXIMUM_RUNNER_RESPONSE_BYTES = 2_000_000
const HTTP_NOT_FOUND = 404
const HTTP_REQUEST_TIMEOUT = 408
const HTTP_TOO_MANY_REQUESTS = 429
const HTTP_SERVER_ERROR_MINIMUM = 500

export {AiRunnerError, type AiRunnerErrorCode} from './runner-error'

export interface AiRunnerClient {
  readonly cancel: (runnerJobId: string) => Promise<void>
  readonly getStatus: (runnerJobId: string) => Promise<AiRunnerJobStatusResponse>
  readonly submit: (request: AiRunnerJobRequest) => Promise<{readonly jobId: string}>
}

export interface CreateAiRunnerClientOptions {
  readonly baseUrl?: string
  readonly fetcher?: typeof fetch
  readonly timeoutMs?: number
  readonly token?: string
}

const resolveRunnerConfiguration = (options: CreateAiRunnerClientOptions) => ({
  baseUrl: options.baseUrl ?? env.POMO_AI_RUNNER_URL,
  fetcher: options.fetcher ?? globalThis.fetch,
  timeoutMs: options.timeoutMs ?? env.POMO_AI_RUNNER_TIMEOUT_MS,
  token: options.token ?? env.POMO_AI_RUNNER_TOKEN,
})

const createRunnerUrl = (baseUrl: string, path: string): string => {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return new URL(path.replace(/^\//u, ''), normalizedBaseUrl).toString()
}

const isRetryableRunnerStatus = (status: number): boolean =>
  status === HTTP_REQUEST_TIMEOUT ||
  status === HTTP_TOO_MANY_REQUESTS ||
  status >= HTTP_SERVER_ERROR_MINIMUM

const createRunnerRequestError = (operation: string, status: number): AiRunnerError =>
  new AiRunnerError('request-failed', `AI runner ${operation} failed (${status})`, {
    retryable: isRetryableRunnerStatus(status),
    status,
  })

const readBoundedResponseBody = async (response: Response): Promise<string> => {
  const reader = response.body?.getReader()
  if (reader === undefined) {
    return response.text()
  }

  const chunks: Array<Uint8Array> = []
  let totalBytes = 0

  try {
    while (true) {
      const {done, value} = await reader.read()
      if (done) {
        break
      }

      totalBytes += value.byteLength
      if (totalBytes > MAXIMUM_RUNNER_RESPONSE_BYTES) {
        await reader.cancel()
        throw new AiRunnerError('invalid-response', 'AI runner response is too large')
      }

      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  return new TextDecoder().decode(body)
}

const parseJsonResponse = async <Value>(
  response: Response,
  parse: (value: unknown) => Value,
): Promise<Value> => {
  const body = await readBoundedResponseBody(response)

  let value: unknown
  try {
    value = JSON.parse(body)
  } catch (error: unknown) {
    throw new AiRunnerError('invalid-response', 'AI runner returned invalid JSON', {cause: error})
  }

  try {
    return parse(value)
  } catch (error: unknown) {
    throw new AiRunnerError('invalid-response', 'AI runner returned an invalid payload', {
      cause: error,
    })
  }
}

/** Creates the server-only client for the separately deployed local-model runner. */
export const createAiRunnerClient = (options: CreateAiRunnerClientOptions = {}): AiRunnerClient => {
  const configuration = resolveRunnerConfiguration(options)

  const request = async (path: string, init: RequestInit = {}): Promise<Response> => {
    if (configuration.baseUrl === undefined || configuration.token === undefined) {
      throw new AiRunnerError(
        'unavailable',
        'POMO_AI_RUNNER_URL and POMO_AI_RUNNER_TOKEN are required for local model execution',
      )
    }

    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    headers.set('Authorization', `Bearer ${configuration.token}`)
    if (init.body !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    try {
      return await configuration.fetcher(createRunnerUrl(configuration.baseUrl, path), {
        ...init,
        headers,
        signal: AbortSignal.timeout(configuration.timeoutMs),
      })
    } catch (error: unknown) {
      throw new AiRunnerError('request-failed', 'AI runner request failed', {cause: error})
    }
  }

  return {
    cancel: async (runnerJobId) => {
      const response = await request(`/v1/jobs/${encodeURIComponent(runnerJobId)}/cancel`, {
        method: 'POST',
      })
      if (!response.ok && response.status !== HTTP_NOT_FOUND) {
        throw createRunnerRequestError('cancellation', response.status)
      }
    },
    getStatus: async (runnerJobId) => {
      const response = await request(`/v1/jobs/${encodeURIComponent(runnerJobId)}`)
      if (!response.ok) {
        throw createRunnerRequestError('status request', response.status)
      }

      return parseJsonResponse(response, (value) => aiRunnerJobStatusResponseSchema.parse(value))
    },
    submit: async (jobRequest) => {
      const response = await request('/v1/jobs', {
        body: JSON.stringify(jobRequest),
        method: 'POST',
      })
      if (!response.ok) {
        throw createRunnerRequestError('submission', response.status)
      }

      return parseJsonResponse(response, (value) => aiRunnerSubmitResponseSchema.parse(value))
    },
  }
}
