export const BASE_SECURITY_HEADERS = {
  'Permissions-Policy': [
    'accelerometer=(self)',
    'autoplay=(self)',
    'camera=()',
    'display-capture=()',
    'encrypted-media=()',
    'fullscreen=(self)',
    'geolocation=()',
    'gyroscope=(self)',
    'magnetometer=()',
    'microphone=(self)',
    'midi=()',
    'payment=()',
    'picture-in-picture=()',
    'screen-wake-lock=(self)',
    'usb=()',
  ].join(', '),
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
} as const

const CONNECT_SOURCES = [
  "'self'",
  'https://www.pomofi.io',
  'https://storage.pomofi.io',
  'https://huggingface.co',
  'https://us.aws.cdn.hf.co',
  'https://cdn.jsdelivr.net',
  'https://pub-0e34511083544f8aaad14d0590013528.r2.dev',
] as const

const createConnectDirective = (): string => `connect-src ${CONNECT_SOURCES.join(' ')}`

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
