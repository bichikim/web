import {randomBytes} from 'node:crypto'
import {createMiddlewareFragment} from 'src/utils/middleware-helper'

export const cspMiddleware = createMiddlewareFragment({
  onRequest: async (event) => {
    const nonce = randomBytes(16).toString('base64')

    event.locals.nonce = nonce

    const csp = `
      default-src 'self';
      img-src 'self' data:;
      script-src 'nonce-${nonce}' 'strict-dynamic' '${import.meta.env.PROD ? 'unsafe-eval' : 'unsafe-inline'}';
      style-src ${import.meta.env.PROD ? `'nonce-${nonce}'` : `'unsafe-inline'`};
      object-src 'none';
      base-uri 'none';
      frame-ancestors 'none';
      form-action 'self';
    `.replace(/\s+/g, ' ')

    console.log('csp', csp)
    event.response.headers.set('Content-Security-Policy', csp)
  },
})
