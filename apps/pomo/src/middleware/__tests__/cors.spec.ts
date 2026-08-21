import {afterEach, describe, expect, it, vi} from 'vitest'

import {corsMiddleware} from '../cors'

const VERCEL_HOST_VARIABLES = [
  'VERCEL_URL',
  'VERCEL_BRANCH_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
] as const

const createMiddlewareEvent = (request: Request) => ({
  req: request,
  res: {headers: new Headers()},
})

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

const useProductionEnvironment = () => {
  vi.stubEnv('NODE_ENV', 'production')

  for (const variable of VERCEL_HOST_VARIABLES) {
    vi.stubEnv(variable, '')
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('corsMiddleware', () => {
  it.each([
    'https://pomo-app.apps.tossmini.com',
    'https://pomo-app.private-apps.tossmini.com',
    'https://pomo-app.private-web.tossmini.com',
    'https://pomo-app.web.tossmini.com',
  ])('should allow the Apps in Toss origin %s', async (origin) => {
    useProductionEnvironment()
    const response = await applyResponseMiddleware(
      new Request('https://api.pomofi.example/api/test', {headers: {Origin: origin}}),
    )

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it('should allow the request self origin only in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const origin = 'http://localhost:3000'
    const developmentResponse = await applyResponseMiddleware(
      new Request(`${origin}/api/test`, {headers: {Origin: origin}}),
    )

    expect(developmentResponse.headers.get('Access-Control-Allow-Origin')).toBe(origin)

    useProductionEnvironment()
    const productionResponse = await applyResponseMiddleware(
      new Request(`${origin}/api/test`, {headers: {Origin: origin}}),
    )

    expect(productionResponse.headers.has('Access-Control-Allow-Origin')).toBe(false)
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

    const preflightResponse = response
    expect(preflightResponse.status).toBe(204)
    expect(preflightResponse.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(preflightResponse.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, HEAD, OPTIONS, POST',
    )
    expect(preflightResponse.headers.get('Access-Control-Allow-Headers')).toBe(
      'Authorization, Content-Type',
    )
    expect(preflightResponse.headers.get('Vary')).toBe(
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
        headers: {Origin: 'https://pomo-app.apps.tossmini.com'},
      }),
      originalResponse,
    )

    expect(response).toBe(originalResponse)
    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false)
    expect(response.headers.has('Vary')).toBe(false)
  })

  it('should add CORS headers to API output that is not a Response', async () => {
    useProductionEnvironment()
    const origin = 'https://pomo-app.apps.tossmini.com'
    const event = createMiddlewareEvent(
      new Request('https://api.pomofi.example/api/test', {headers: {Origin: origin}}),
    )
    const body = {ok: true}

    await expect(corsMiddleware(event, async () => body)).resolves.toBe(body)
    expect(event.res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(event.res.headers.get('Vary')).toBe('Origin')
  })
})
