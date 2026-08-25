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
    'https://pomofi.io',
    'https://www.pomofi.io',
    'https://pomo-app.apps.tossmini.com',
    'https://pomo-app.private-apps.tossmini.com',
    'https://pomo-app.private-web.tossmini.com',
    'https://pomo-app.web.tossmini.com',
  ])('should allow the static origin %s', async (origin) => {
    useProductionEnvironment()
    const response = await applyResponseMiddleware(
      new Request('https://api.pomofi.example/api/test', {headers: {Origin: origin}}),
    )

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toBe('Origin')
  })

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
      'Authorization, Content-Type, Range, X-CSRF-Token',
    )
    expect(response.headers.get('Access-Control-Max-Age')).toBe('86400')
    expect(response.headers.get('Vary')).toBe(
      'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should omit CORS permission for an untrusted origin', async () => {
    useProductionEnvironment()
    const response = await applyResponseMiddleware(
      new Request('https://api.pomofi.example/api/test', {
        headers: {Origin: 'https://untrusted.example'},
      }),
    )

    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false)
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it('should not add CORS headers outside the API namespace', async () => {
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
})
