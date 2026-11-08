import type {IncomingMessage, ServerResponse} from 'node:http'
import {constants} from 'node:http2'

interface AuthorizeOriginOptions {
  readonly request: IncomingMessage
  readonly response: ServerResponse
  readonly url: string
  readonly trustedOrigins?: ReadonlyArray<string>
}

/** Grants CORS only to explicitly trusted app origins; bearer authentication remains separate. */
export const authorizeOrigin = ({
  request,
  response,
  url,
  trustedOrigins = [],
}: AuthorizeOriginOptions) => {
  const {origin, host} = request.headers
  if (
    host !== new URL(url).host ||
    (origin !== undefined && origin !== url && !trustedOrigins.includes(origin))
  ) {
    return false
  }
  if (origin !== undefined && trustedOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }
  if (request.method === 'OPTIONS') {
    const method = request.headers['access-control-request-method']
    const headers = String(request.headers['access-control-request-headers'] ?? '')
      .toLowerCase()
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const allowed = new Set(['authorization', 'content-type', 'x-poffo-client'])
    if (
      origin === undefined ||
      !trustedOrigins.includes(origin) ||
      (method !== 'GET' && method !== 'POST') ||
      headers.some((header) => !allowed.has(header))
    ) {
      return false
    }
    response.writeHead(constants.HTTP_STATUS_NO_CONTENT, {
      'Access-Control-Allow-Headers': [...allowed].join(', '),
      'Access-Control-Allow-Methods': 'GET, POST',
      'Cache-Control': 'no-store',
    })
    response.end()
  }
  return true
}
