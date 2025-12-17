import {randomBytes} from 'node:crypto'
import {createMiddlewareFragment} from 'src/utils/middleware-helper'

export const cspMiddleware = createMiddlewareFragment({
  onRequest: async (event) => {
    const nonce = randomBytes(16).toString('base64')

    event.locals.nonce = nonce

    const csp = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}';
      object-src 'none';
      base-uri 'none';
      frame-ancestors 'none';
      form-action 'self';
    `

    // event.response.headers.set('Content-Security-Policy', csp)
  },
})
