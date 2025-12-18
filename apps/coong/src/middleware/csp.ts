import {randomBytes} from 'node:crypto'
import {createMiddlewareFragment} from 'src/utils/middleware-helper'
import {getSupabaseClientKeys} from 'src/env'

const supabaseOrigin = new URL(getSupabaseClientKeys().url).origin

const connectSrc = [
  //
  `'self'`,
  // @vercel/analytics
  `https://vitals.vercel-insights.com`,
  // supabase for browser operations (realtime, storage, etc.)
  supabaseOrigin,
]
  .filter(Boolean)
  .join(' ')

export const cspMiddleware = createMiddlewareFragment({
  onRequest: async (event) => {
    const nonce = randomBytes(16).toString('base64')

    event.locals.nonce = nonce

    // unsafe-inline is used for development HMR purposes
    // strict-dynamic is used for trust Propagation
    const csp = `
      default-src 'self';
      img-src 'self' data:;
      script-src 'nonce-${nonce}' 'strict-dynamic' ${import.meta.env.PROD ? '' : `'unsafe-inline' 'unsafe-eval'`};
      style-src ${import.meta.env.PROD ? `'nonce-${nonce}'` : `'unsafe-inline'`};
      connect-src ${connectSrc};
      object-src 'none';
      base-uri 'none';
      frame-ancestors 'none';
      form-action 'self';
    `.replace(/\s+/g, ' ')

    event.response.headers.set('Content-Security-Policy', csp)
  },
})
