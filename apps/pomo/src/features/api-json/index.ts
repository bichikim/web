import type {z} from 'zod'

import {apiFetch} from '../http-client'

export interface ApiJsonRequestOptions extends Omit<RequestInit, 'body'> {
  readonly body?: object
}

export interface ApiJsonOptions<Output> extends ApiJsonRequestOptions {
  readonly responseSchema: z.ZodType<Output>
}

export type ApiJsonErrorKind = 'http' | 'parse' | 'schema'

interface ApiJsonErrorOptions {
  readonly cause?: unknown
  readonly kind: ApiJsonErrorKind
  readonly response: Response
}

const getErrorMessage = (options: ApiJsonErrorOptions): string => {
  switch (options.kind) {
    case 'http': {
      return `JSON API request failed with status ${options.response.status}`
    }
    case 'parse': {
      return 'JSON API response is not valid JSON'
    }
    case 'schema': {
      return 'JSON API response does not match its schema'
    }
    default: {
      const exhaustiveKind: never = options.kind
      return exhaustiveKind
    }
  }
}

export class ApiJsonError extends Error {
  readonly kind: ApiJsonErrorKind
  readonly response: Response

  constructor(options: ApiJsonErrorOptions) {
    super(getErrorMessage(options), {cause: options.cause})
    this.name = 'ApiJsonError'
    this.kind = options.kind
    this.response = options.response
  }
}

const createJsonRequestInit = (options: ApiJsonRequestOptions): RequestInit => {
  const {body, ...init} = options

  if (body === undefined) {
    return init
  }

  const headers = new Headers(init.headers)

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return {...init, body: JSON.stringify(body), headers}
}

const isAbortError = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && 'name' in value && value.name === 'AbortError'

const isCancellationReason = (value: unknown, signal?: AbortSignal | null): boolean =>
  isAbortError(value) || (signal?.aborted === true && value === signal.reason)

/** Sends a JSON request while preserving the raw response status, headers, and body. */
export const apiJsonRequest = (
  input: RequestInfo | URL,
  options: ApiJsonRequestOptions,
): Promise<Response> => apiFetch(input, createJsonRequestInit(options))

export const parseJsonResponse = async <Output>(
  response: Response,
  responseSchema: z.ZodType<Output>,
  signal?: AbortSignal | null,
): Promise<Output> => {
  let value: unknown

  try {
    value = await response.json()
  } catch (cause: unknown) {
    if (isCancellationReason(cause, signal)) {
      throw cause
    }

    throw new ApiJsonError({cause, kind: 'parse', response})
  }

  const result = await responseSchema.safeParseAsync(value)

  if (!result.success) {
    throw new ApiJsonError({cause: result.error, kind: 'schema', response})
  }

  return result.data
}

/** Fetches a successful JSON DTO and validates it before returning application data. */
export const apiJson = async <Output>(
  input: RequestInfo | URL,
  options: ApiJsonOptions<Output>,
): Promise<Output> => {
  const {responseSchema, ...requestOptions} = options
  const response = await apiJsonRequest(input, requestOptions)

  if (!response.ok) {
    throw new ApiJsonError({kind: 'http', response})
  }

  return parseJsonResponse(response, responseSchema, requestOptions.signal)
}
