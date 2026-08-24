import {randomBytes} from 'node:crypto'

import type {Middleware} from 'h3'
import {getRequestEvent} from 'solid-js/web'

import {BASE_SECURITY_HEADERS, createContentSecurityPolicy} from '../config/security-headers'

const NONCE_BYTES = 16

const createNonce = (): string => randomBytes(NONCE_BYTES).toString('base64')

const applySecurityHeaders = (headers: Headers, nonce: string): void => {
  for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    headers.set(name, value)
  }

  headers.set('Content-Security-Policy-Report-Only', createContentSecurityPolicy(nonce))
}

export const securityHeadersMiddleware: Middleware = async (event, next) => {
  const requestEvent = getRequestEvent()

  if (requestEvent === undefined) {
    throw new Error('SolidStart request context is unavailable')
  }

  const nonce = createNonce()

  requestEvent.locals.securityNonce = nonce
  applySecurityHeaders(event.res.headers, nonce)
  applySecurityHeaders(event.res.errHeaders, nonce)
  const response = await next()
  applySecurityHeaders(event.res.headers, nonce)
  applySecurityHeaders(event.res.errHeaders, nonce)

  if (!(response instanceof Response)) {
    return response
  }

  const headers = new Headers(response.headers)
  applySecurityHeaders(headers, nonce)

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}
