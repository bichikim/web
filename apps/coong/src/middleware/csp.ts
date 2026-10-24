import {randomBytes} from 'node:crypto'
import {createMiddlewareFragment} from 'src/utils/middleware-helper'
import {getSupabaseClientKeys} from 'src/env'

const supabaseOrigin = new URL(getSupabaseClientKeys().url).origin

const connectSrc = [
  //
  `'self'`,
  // Dev-only: allow sourcemaps and HMR connections.
  ...(import.meta.env.PROD ? [] : [`data:`, `ws:`, `wss:`]),
  // @vercel/analytics
  `https://vitals.vercel-insights.com`,
  // supabase for browser operations (realtime, storage, etc.)
  supabaseOrigin,
]
  .filter(Boolean)
  .join(' ')

const RANDOM_BYTES_LENGTH = 16

export const cspMiddleware = createMiddlewareFragment({
  onRequest: async (event) => {
    const nonce = randomBytes(RANDOM_BYTES_LENGTH).toString('base64')

    event.locals.nonce = nonce

    // unsafe-inline is used for development HMR purposes
    // strict-dynamic is used for trust Propagation
    const csp = `
      default-src 'self';
      img-src 'self' data:;
      script-src 'nonce-${nonce}' 'strict-dynamic' ${import.meta.env.PROD ? '' : `'unsafe-inline' 'unsafe-eval'`};
      style-src ${import.meta.env.PROD ? `'self' 'nonce-${nonce}' 'unsafe-inline'` : `'unsafe-inline'`};
      style-src-elem ${import.meta.env.PROD ? `'self' 'nonce-${nonce}' 'unsafe-inline'` : `'unsafe-inline'`};
      style-src-attr 'unsafe-inline';
      connect-src ${connectSrc};
      object-src 'none';
      base-uri 'none';
      frame-ancestors 'none';
      form-action 'self';
    `.replaceAll(/\s+/gu, ' ')

    event.response.headers.set('Content-Security-Policy', csp)
  },
})
