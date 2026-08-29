import {mockEvent} from 'h3'
import {getRequestEvent} from 'solid-js/web'
import {afterAll, afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('solid-js/web', () => ({getRequestEvent: vi.fn()}))

vi.stubEnv(
  'POMO_CONNECT_SOURCES',
  "'self' https://www.pomofi.io https://storage.pomofi.io https://huggingface.co https://us.aws.cdn.hf.co https://cdn.jsdelivr.net https://pub-0e34511083544f8aaad14d0590013528.r2.dev",
)
vi.stubEnv('POMO_CONTENT_TYPE_OPTIONS', 'nosniff')
vi.stubEnv(
  'POMO_PERMISSIONS_POLICY',
  [
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
)
vi.stubEnv('POMO_REFERRER_POLICY', 'no-referrer')

const {STATIC_SECURITY_HEADERS, WORKER_SECURITY_HEADERS} = await import('../security-header-policy')
const {securityHeadersMiddleware} = await import('../security-headers')

const applySecurityHeaders = async (
  request: Request,
  response = new Response(null, {status: 200}),
) => {
  const event = mockEvent(request)
  const result = await securityHeadersMiddleware(event, async () => response)

  if (!(result instanceof Response)) {
    throw new TypeError('Expected middleware to return a Response')
  }

  return {event, response: result}
}

describe('securityHeadersMiddleware', () => {
  const locals: App.RequestEventLocals = {securityNonce: ''}

  beforeEach(() => {
    vi.mocked(getRequestEvent).mockReturnValue({locals} as ReturnType<typeof getRequestEvent>)
  })

  afterEach(() => {
    vi.clearAllMocks()
    locals.securityNonce = ''
  })

  it('should apply safe global response headers', async () => {
    const {event, response} = await applySecurityHeaders(
      new Request('https://www.pomofi.io/'),
      new Response(null, {headers: {'Cache-Control': 'public, max-age=60'}}),
    )
    const {headers} = response

    expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(headers.get('Cache-Control')).toBe('public, max-age=60')
    expect(event.res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(event.res.errHeaders.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headers.get('Permissions-Policy')?.split(', ')).toEqual([
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
    ])
  })

  it('should create a report-only CSP with a request-specific nonce', async () => {
    const firstHeaders = (await applySecurityHeaders(new Request('https://www.pomofi.io/')))
      .response.headers
    const firstLocalNonce = locals.securityNonce
    const secondHeaders = (await applySecurityHeaders(new Request('https://www.pomofi.io/account')))
      .response.headers
    const firstPolicy = firstHeaders.get('Content-Security-Policy-Report-Only')
    const secondPolicy = secondHeaders.get('Content-Security-Policy-Report-Only')
    const noncePattern = /'nonce-(?<nonce>[A-Za-z0-9+/]{22}==)'/u
    const firstNonce = noncePattern.exec(firstPolicy ?? '')?.groups?.nonce
    const secondNonce = noncePattern.exec(secondPolicy ?? '')?.groups?.nonce

    expect(firstHeaders.has('Content-Security-Policy')).toBe(false)
    expect(firstNonce).toBeDefined()
    expect(secondNonce).toBeDefined()
    expect(firstNonce).not.toBe(secondNonce)
    expect(firstLocalNonce).toBe(firstNonce)
    expect(locals.securityNonce).toBe(secondNonce)
    expect(firstPolicy?.split('; ')).toEqual([
      "default-src 'self'",
      "base-uri 'none'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      `script-src 'self' 'nonce-${firstNonce}' 'wasm-unsafe-eval'`,
      `style-src 'self' 'nonce-${firstNonce}'`,
      "style-src-attr 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob:",
      "media-src 'self' blob: https://storage.pomofi.io",
      "worker-src 'self' blob:",
      "connect-src 'self' https://www.pomofi.io https://storage.pomofi.io https://huggingface.co https://us.aws.cdn.hf.co https://cdn.jsdelivr.net https://pub-0e34511083544f8aaad14d0590013528.r2.dev",
      "manifest-src 'self'",
    ])
    expect(firstPolicy).not.toContain("style-src 'unsafe-inline'")
    expect(firstPolicy).not.toContain("'unsafe-eval'")
    expect(firstPolicy).not.toContain('*')
    expect(firstPolicy).not.toContain('report-uri')
    expect(firstPolicy).not.toContain('report-to')
  })

  it('should provide nonce-free headers for static Nitro responses', () => {
    const policy = STATIC_SECURITY_HEADERS['Content-Security-Policy-Report-Only']

    expect(STATIC_SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff')
    expect(STATIC_SECURITY_HEADERS['Referrer-Policy']).toBe('no-referrer')
    expect(policy).toContain("script-src 'self' 'wasm-unsafe-eval'")
    expect(policy).toContain("style-src 'self'")
    expect(policy).toContain("style-src-attr 'unsafe-inline'")
    expect(policy).not.toContain("'nonce-")
    expect(policy).not.toContain("style-src 'unsafe-inline'")
  })

  it('should constrain fetches and nested workers in worker execution contexts', () => {
    const policy = WORKER_SECURITY_HEADERS['Content-Security-Policy-Report-Only']

    expect(WORKER_SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff')
    expect(policy.split('; ')).toEqual([
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "worker-src 'self' blob:",
      "connect-src 'self' https://www.pomofi.io https://storage.pomofi.io https://huggingface.co https://us.aws.cdn.hf.co https://cdn.jsdelivr.net https://pub-0e34511083544f8aaad14d0590013528.r2.dev",
    ])
    expect(policy).not.toContain("'unsafe-inline'")
    expect(policy).not.toContain("'unsafe-eval'")
    expect(policy).not.toContain('*')
  })

  it('should restore request-specific headers after downstream SSR handling', async () => {
    const event = mockEvent(new Request('https://www.pomofi.io/account'))
    const body = {render: 'stream'}
    const result = await securityHeadersMiddleware(event, async () => {
      event.res.headers.set(
        'Content-Security-Policy-Report-Only',
        STATIC_SECURITY_HEADERS['Content-Security-Policy-Report-Only'],
      )
      event.res.headers.set('Cache-Control', 'no-store')
      return body
    })
    const policy = event.res.headers.get('Content-Security-Policy-Report-Only')

    expect(result).toBe(body)
    expect(policy).toContain(`'nonce-${locals.securityNonce}'`)
    expect(event.res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('should fail closed when the SolidStart request context is unavailable', async () => {
    vi.mocked(getRequestEvent).mockReturnValue(undefined)

    await expect(
      securityHeadersMiddleware(mockEvent(new Request('https://www.pomofi.io/')), vi.fn()),
    ).rejects.toThrow('SolidStart request context is unavailable')
  })
})

afterAll(() => {
  vi.unstubAllEnvs()
})
