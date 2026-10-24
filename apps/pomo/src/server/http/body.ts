import type {APIEvent} from '@solidjs/start/server'
import {assertBodySize, HTTPError, requireContentType} from 'h3'

const HTTP_BAD_REQUEST = 400
const HTTP_CONTENT_TOO_LARGE = 413
const HTTP_UNSUPPORTED_MEDIA_TYPE = 415
const HTTP_UNPROCESSABLE_CONTENT = 422

type JsonBodyFailureStatus =
  | typeof HTTP_BAD_REQUEST
  | typeof HTTP_CONTENT_TOO_LARGE
  | typeof HTTP_UNSUPPORTED_MEDIA_TYPE
  | typeof HTTP_UNPROCESSABLE_CONTENT

interface JsonBodySuccess {
  readonly body: unknown
  readonly success: true
}

interface JsonBodyFailure {
  readonly status: JsonBodyFailureStatus
  readonly success: false
}

export type JsonBodyResult = JsonBodyFailure | JsonBodySuccess

interface BoundedRequestSuccess {
  readonly request: Request
  readonly success: true
}

interface BoundedRequestFailure {
  readonly status: typeof HTTP_BAD_REQUEST | typeof HTTP_CONTENT_TOO_LARGE
  readonly success: false
}

export type BoundedRequestResult = BoundedRequestFailure | BoundedRequestSuccess

type ApiRequestEvent = Pick<APIEvent, 'nativeEvent'>

const isJsonBodyFailureStatus = (status: number): status is JsonBodyFailureStatus => {
  switch (status) {
    case HTTP_BAD_REQUEST:
    case HTTP_CONTENT_TOO_LARGE:
    case HTTP_UNSUPPORTED_MEDIA_TYPE:
    case HTTP_UNPROCESSABLE_CONTENT:
      return true
    default:
      return false
  }
}

/** Reads one bounded JSON body and preserves H3's precise request error status. */
export const readJsonBody = async (
  event: Pick<APIEvent, 'nativeEvent'>,
  maximumBytes: number,
): Promise<JsonBodyResult> => {
  try {
    assertBodySize(event.nativeEvent, maximumBytes)
    requireContentType(event.nativeEvent, 'application/json')
    return {body: await event.nativeEvent.req.json(), success: true}
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {status: HTTP_BAD_REQUEST, success: false}
    }

    if (HTTPError.isError(error) && isJsonBodyFailureStatus(error.status)) {
      return {status: error.status, success: false}
    }

    throw error
  }
}

/** Materializes one size-limited request before it crosses an upstream proxy boundary. */
export const readBoundedRequest = async (
  event: ApiRequestEvent,
  maximumBytes: number,
): Promise<BoundedRequestResult> => {
  try {
    assertBodySize(event.nativeEvent, maximumBytes)
    const sourceRequest = event.nativeEvent.req
    const headers = new Headers(sourceRequest.headers)
    headers.delete('Content-Length')
    headers.delete('Transfer-Encoding')

    const body = sourceRequest.body === null ? undefined : await sourceRequest.arrayBuffer()

    return {
      // The bounded proxy helper is called only by request methods that permit a body.
      // oxlint-disable-next-line unicorn/no-invalid-fetch-options
      request: new Request(sourceRequest.url, {body, headers, method: sourceRequest.method}),
      success: true,
    }
  } catch (error) {
    if (
      HTTPError.isError(error) &&
      (error.status === HTTP_BAD_REQUEST || error.status === HTTP_CONTENT_TOO_LARGE)
    ) {
      return {status: error.status, success: false}
    }

    throw error
  }
}
