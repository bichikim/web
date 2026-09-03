export interface CorsPolicy {
  readonly allowedOrigins: string
  readonly allowedOriginSuffixes: string
}

export const getAllowedOrigin = (request: Request, policy: CorsPolicy): string | null => {
  const origin = request.headers.get('Origin')

  if (origin === null) {
    return null
  }

  const allowedOrigins = policy.allowedOrigins.split(',').map((value) => value.trim())

  if (allowedOrigins.includes(origin)) {
    return origin
  }

  const allowedSuffixes = policy.allowedOriginSuffixes
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  try {
    const originUrl = new URL(origin)
    const allowedBySuffix = allowedSuffixes.some(
      (suffix) =>
        suffix.startsWith('.') &&
        originUrl.protocol === 'https:' &&
        originUrl.port.length === 0 &&
        originUrl.hostname.length > suffix.length &&
        originUrl.hostname.endsWith(suffix),
    )
    return allowedBySuffix ? origin : null
  } catch {
    return null
  }
}

export const applyCorsHeaders = (headers: Headers, allowedOrigin: string | null): void => {
  if (allowedOrigin === null) {
    return
  }

  headers.set('Access-Control-Allow-Origin', allowedOrigin)
  headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, ETag')
  headers.append('Vary', 'Origin')
}
