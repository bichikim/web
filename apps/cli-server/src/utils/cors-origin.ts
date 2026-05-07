const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export const resolveAllowedCorsOrigin = (origin: string): string | undefined => {
  try {
    const url = new URL(origin)

    if (ALLOWED_PROTOCOLS.has(url.protocol) && LOOPBACK_HOSTNAMES.has(url.hostname)) {
      return origin
    }
  } catch {
    return
  }
}
