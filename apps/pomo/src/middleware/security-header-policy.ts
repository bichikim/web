export const BASE_SECURITY_HEADERS = {
  'Permissions-Policy': import.meta.env.POMO_PERMISSIONS_POLICY,
  'Referrer-Policy': import.meta.env.POMO_REFERRER_POLICY,
  'X-Content-Type-Options': import.meta.env.POMO_CONTENT_TYPE_OPTIONS,
} as const

const createConnectDirective = (): string => `connect-src ${import.meta.env.POMO_CONNECT_SOURCES}`

export const createContentSecurityPolicy = (nonce?: string): string => {
  const scriptSources = ["'self'", ...(nonce === undefined ? [] : [`'nonce-${nonce}'`])]
  const styleSources = ["'self'", ...(nonce === undefined ? [] : [`'nonce-${nonce}'`])]

  return [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources.join(' ')} 'wasm-unsafe-eval'`,
    `style-src ${styleSources.join(' ')}`,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: https://storage.pomofi.io",
    "worker-src 'self' blob:",
    createConnectDirective(),
    "manifest-src 'self'",
  ].join('; ')
}

const createWorkerContentSecurityPolicy = (): string =>
  [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "worker-src 'self' blob:",
    createConnectDirective(),
  ].join('; ')

export const STATIC_SECURITY_HEADERS = {
  ...BASE_SECURITY_HEADERS,
  'Content-Security-Policy-Report-Only': createContentSecurityPolicy(),
} as const

export const WORKER_SECURITY_HEADERS = {
  ...BASE_SECURITY_HEADERS,
  'Content-Security-Policy-Report-Only': createWorkerContentSecurityPolicy(),
} as const
