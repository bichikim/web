import {H3, HTTPError, mockEvent} from 'h3'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {corsMiddleware} from '../cors'

const VERCEL_HOST_VARIABLES = [
  'VERCEL_URL',
  'VERCEL_BRANCH_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
] as const

const createMiddlewareEvent = (request: Request) => mockEvent(request)

const applyResponseMiddleware = async (
  request: Request,
  response = new Response(null, {status: 200}),
): Promise<Response> => {
  const result = await corsMiddleware(createMiddlewareEvent(request), async () => response)

  if (!(result instanceof Response)) {
    throw new TypeError('Expected middleware to return a Response')
  }

  return result
}

const useProductionEnvironment = (): void => {
  for (const variable of VERCEL_HOST_VARIABLES) {
    vi.stubEnv(variable, '')
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('corsMiddleware', () => {
  it.each([
    'http://tauri.localhost',
    'https://pomofi.io',
    'https://www.pomofi.io',
    'https://pomo-app.apps.tossmini.com',
    'https://pomo-app.private-apps.tossmini.com',
    'https://pomo-app.private-web.tossmini.com',
    'https://pomo-app.web.tossmini.com',
    'https://tauri.localhost',
    'tauri://localhost',
  ])('should allow the static origin %s', async (origin) => {
    useProductionEnvironment()
    const response = await applyResponseMiddleware(
      new Request('https://api.pomofi.example/api/test', {headers: {Origin: origin}}),
    )

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it.each(['/api/feeds/today-in-history/rss.xml', '/api/weather/feeds/seoul.json'])(
    'should allow the desktop development origin on %s',
    async (path) => {
      useProductionEnvironment()
      const origin = 'http://127.0.0.1:1420'
      const response = await applyResponseMiddleware(
        new Request(`https://www.pomofi.io${path}`, {headers: {Origin: origin}}),
      )

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
      expect(response.headers.get('Vary')).toBe('Origin')
    },
  )

  it('should allow the request self origin', async () => {
    useProductionEnvironment()
    const origin = 'https://preview.example'
    const response = await applyResponseMiddleware(
      new Request(`${origin}/api/test`, {headers: {Origin: origin}}),
    )

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
  })

  it.each(VERCEL_HOST_VARIABLES)('should allow the Vercel origin from %s', async (variable) => {
    useProductionEnvironment()
    const host = `${variable.toLowerCase().replaceAll('_', '-')}.vercel.app`
    vi.stubEnv(variable, host)
    const response = await applyResponseMiddleware(
      new Request('https://api.pomofi.example/api/test', {
        headers: {Origin: `https://${host}`},
      }),
    )

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(`https://${host}`)
  })

  it.each([
    ['preview.vercel.app/path', 'https://preview.vercel.app'],
    ['preview.vercel.app?token=secret', 'https://preview.vercel.app'],
    ['preview.vercel.app#fragment', 'https://preview.vercel.app'],
    ['user@preview.vercel.app', 'https://preview.vercel.app'],
    ['user:password@preview.vercel.app', 'https://preview.vercel.app'],
    ['[', 'https://untrusted.example'],
  ])('should reject malformed Vercel host configuration %s', async (host, origin) => {
    useProductionEnvironment()
    vi.stubEnv('VERCEL_URL', host)

    const response = await applyResponseMiddleware(
      new Request('https://api.pomofi.example/api/test', {headers: {Origin: origin}}),
    )

    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false)
  })

  it('should allow a configured development origin only in development', async () => {
    useProductionEnvironment()
    vi.stubEnv('DEV', true)
    const origin = 'http://localhost:3000'

    const response = await applyResponseMiddleware(
      new Request('https://api.pomofi.example/api/test', {headers: {Origin: origin}}),
    )

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
  })

  it('should answer an allowed preflight request', async () => {
    useProductionEnvironment()
    const origin = 'https://pomo-app.apps.tossmini.com'
    const next = vi.fn()
    const response = await corsMiddleware(
      createMiddlewareEvent(
        new Request('https://api.pomofi.example/api/test', {
          headers: {
            'Access-Control-Request-Headers': 'authorization, content-type',
            'Access-Control-Request-Method': 'POST',
            Origin: origin,
          },
          method: 'OPTIONS',
        }),
      ),
      next,
    )

    expect(response).toBeInstanceOf(Response)
    if (!(response instanceof Response)) {
      throw new TypeError('Expected preflight middleware to return a Response')
    }

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, HEAD, OPTIONS, POST, PUT, PATCH, DELETE',
    )
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
      'Authorization, Content-Type, Range, X-CSRF-Token, X-Server-Id, X-Server-Instance, X-Start-Type, X-Single-Flight',
    )
    expect(response.headers.get('Access-Control-Max-Age')).toBe('86400')
    expect(response.headers.get('Vary')).toBe(
      'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should answer an allowed SolidStart server-function preflight request', async () => {
    useProductionEnvironment()
    const origin = 'https://pomo-app.apps.tossmini.com'
    const next = vi.fn()
    const response = await corsMiddleware(
      createMiddlewareEvent(
        new Request('https://www.pomofi.io/_server', {
          headers: {
            'Access-Control-Request-Headers':
              'content-type, x-server-id, x-server-instance, x-start-type, x-single-flight',
            'Access-Control-Request-Method': 'POST',
            Origin: origin,
          },
          method: 'OPTIONS',
        }),
      ),
      next,
    )

    expect(response).toBeInstanceOf(Response)
    if (!(response instanceof Response)) {
      throw new TypeError('Expected preflight middleware to return a Response')
    }

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(response.headers.get('Access-Control-Allow-Headers')?.split(', ')).toEqual(
      expect.arrayContaining([
        'Content-Type',
        'X-Server-Id',
        'X-Server-Instance',
        'X-Start-Type',
        'X-Single-Flight',
      ]),
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should expose SolidStart response control headers to an allowed static origin', async () => {
    useProductionEnvironment()
    const origin = 'https://tauri.localhost'
    const response = await applyResponseMiddleware(
      new Request('https://www.pomofi.io/_server', {headers: {Origin: origin}}),
      new Response(null, {
        headers: {
          Location: '/account',
          'X-Revalidate': 'account',
          'X-Start-Type': 'redirect',
        },
        status: 302,
      }),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(response.headers.get('Access-Control-Expose-Headers')?.split(', ')).toEqual(
      expect.arrayContaining([
        'Location',
        'X-Error',
        'X-Revalidate',
        'X-Single-Flight',
        'X-Start-Type',
      ]),
    )
  })

  it('should continue an API preflight without an Origin header', async () => {
    useProductionEnvironment()
    const next = vi.fn(() => new Response(null, {status: 200}))

    const response = await corsMiddleware(
      createMiddlewareEvent(
        new Request('https://api.pomofi.example/api/test', {
          headers: {'Access-Control-Request-Method': 'POST'},
          method: 'OPTIONS',
        }),
      ),
      next,
    )

    expect(response).toBeInstanceOf(Response)
    expect(next).toHaveBeenCalledOnce()
    expect((response as Response).headers.has('Access-Control-Allow-Origin')).toBe(false)
    expect((response as Response).headers.get('Vary')).toBe('Origin')
  })

  it.each(['/api/test', '/_server'])(
    'should omit CORS permission for an untrusted origin on %s',
    async (path) => {
      useProductionEnvironment()
      const response = await applyResponseMiddleware(
        new Request(`https://api.pomofi.example${path}`, {
          headers: {Origin: 'https://untrusted.example'},
        }),
      )

      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false)
      expect(response.headers.get('Vary')).toBe('Origin')
    },
  )

  it('should not add CORS headers outside the supported namespaces', async () => {
    useProductionEnvironment()
    const originalResponse = new Response(null, {status: 200})
    const response = await applyResponseMiddleware(
      new Request('https://api.pomofi.example/outside', {
        headers: {Origin: 'https://pomofi.io'},
      }),
      originalResponse,
    )

    expect(response).toBe(originalResponse)
    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false)
    expect(response.headers.has('Vary')).toBe(false)
  })

  it('should add CORS headers to API output that is not a Response', async () => {
    useProductionEnvironment()
    const origin = 'https://pomofi.io'
    const event = createMiddlewareEvent(
      new Request('https://api.pomofi.example/api/test', {headers: {Origin: origin}}),
    )
    const body = {ok: true}

    await expect(corsMiddleware(event, async () => body)).resolves.toBe(body)
    expect(event.res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(event.res.headers.get('Vary')).toBe('Origin')
  })

  it('should add CORS headers to an H3 error response', async () => {
    useProductionEnvironment()
    const origin = 'https://pomo-app.apps.tossmini.com'
    const app = new H3().use(corsMiddleware).get('/api/test', () => {
      throw HTTPError.status(413)
    })

    const response = await app.request(
      new Request('https://api.pomofi.example/api/test', {headers: {Origin: origin}}),
    )

    expect(response.status).toBe(413)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it('should expose the retry delay to an allowed Apps in Toss origin', async () => {
    useProductionEnvironment()
    const origin = 'https://pomo-app.apps.tossmini.com'
    const response = await applyResponseMiddleware(
      new Request('https://api.pomofi.example/api/weather/feeds', {
        headers: {Origin: origin},
      }),
      Response.json(
        {code: 'weather_collecting'},
        {
          headers: {'Retry-After': '2'},
          status: 503,
        },
      ),
    )

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('2')
    expect(response.headers.get('Access-Control-Expose-Headers')?.split(', ')).toContain(
      'Retry-After',
    )
  })

  it('should preserve multiple cookies while adding CORS to a Response', async () => {
    useProductionEnvironment()
    const headers = new Headers()
    headers.append('Set-Cookie', 'first=1; Path=/; HttpOnly')
    headers.append('Set-Cookie', 'second=2; Path=/; HttpOnly')
    const response = await applyResponseMiddleware(
      new Request('https://api.pomofi.example/api/auth/get-session', {
        headers: {Origin: 'https://pomofi.io'},
      }),
      new Response(null, {headers}),
    )

    expect(response.headers.getSetCookie()).toEqual([
      'first=1; Path=/; HttpOnly',
      'second=2; Path=/; HttpOnly',
    ])
  })

  it('should merge, trim, and deduplicate an existing Vary header', async () => {
    useProductionEnvironment()
    const response = await applyResponseMiddleware(
      new Request('https://api.pomofi.example/api/test'),
      new Response(null, {
        headers: {Vary: 'Accept-Encoding, Origin, , Accept-Encoding'},
      }),
    )

    expect(response.headers.get('Vary')).toBe('Accept-Encoding, Origin')
  })
})
