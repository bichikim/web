const allowedOrigins = new Set([
  'https://pomofi.io',
  'https://www.pomofi.io',
  'https://pomo-app.apps.tossmini.com',
  'https://pomo-app.private-apps.tossmini.com',
])

if (import.meta.env.DEV) {
  allowedOrigins.add('http://localhost:3000')
  allowedOrigins.add('http://localhost:3100')
  allowedOrigins.add('http://localhost:3200')
  allowedOrigins.add('http://localhost:3300')
  allowedOrigins.add('http://localhost:3400')
}

const allowMethods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
const allowHeaders = ['Authorization', 'Content-Type', 'Range', 'X-CSRF-Token']
const exposeHeaders = [
  'Accept-Ranges',
  'Content-Length',
  'Content-Range',
  'Content-Type',
  'ETag',
  'Last-Modified',
]

const appendVary = (headers: Headers, value: string): void => {
  const values = (headers.get('Vary') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) {
    values.push(value)
  }

  headers.set('Vary', values.join(', '))
}

export const isCorsOriginAllowed = (origin: string | null, selfOrigin: string): origin is string =>
  origin !== null && (origin === selfOrigin || allowedOrigins.has(origin))

export const applyCorsResponseHeaders = (
  headers: Headers,
  origin: string | null,
  selfOrigin: string,
): boolean => {
  appendVary(headers, 'Origin')

  if (!isCorsOriginAllowed(origin, selfOrigin)) {
    return false
  }

  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Expose-Headers', exposeHeaders.join(', '))

  return true
}

export const applyCorsPreflightHeaders = (headers: Headers): void => {
  headers.set('Access-Control-Allow-Headers', allowHeaders.join(', '))
  headers.set('Access-Control-Allow-Methods', allowMethods.join(', '))
  headers.set('Access-Control-Max-Age', '86400')
}
