import {paraglideMiddleware} from '@paraglide/server'
import {createMiddleware} from '@solidjs/start/middleware'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {handleAdminAuthRequest} from '../admin-auth'
import {corsMiddleware} from '../cors'
import {handleLegacyRedirectRequest} from '../legacy-redirect'
import {securityHeadersMiddleware} from '../security-headers'
import {handleUserAuthRequest} from '../user-auth'

vi.mock('@paraglide/server', () => ({
  paraglideMiddleware: vi.fn(),
}))

vi.mock('@solidjs/start/middleware', () => ({
  createMiddleware: vi.fn(),
}))

vi.mock('../admin-auth', () => ({
  handleAdminAuthRequest: vi.fn(),
}))

vi.mock('../cors', () => ({
  corsMiddleware: vi.fn(),
}))

vi.mock('../legacy-redirect', () => ({
  handleLegacyRedirectRequest: vi.fn(),
}))

vi.mock('../security-headers', () => ({
  securityHeadersMiddleware: vi.fn(),
}))

vi.mock('../user-auth', () => ({
  handleUserAuthRequest: vi.fn(),
}))

interface MiddlewareEvent {
  readonly req: Request
  readonly res: {
    readonly headers: Headers
  }
  readonly url: URL
}

type Next = () => Promise<Response>
type Middleware = (event: MiddlewareEvent, next: Next) => Promise<Response> | Response

const createEvent = () => {
  const request = new Request('https://pomo.example/focus?scene=night')

  return {
    req: request,
    res: {
      headers: new Headers({'x-existing': 'value'}),
    },
    url: new URL(request.url),
  } satisfies MiddlewareEvent
}

const importMiddleware = async (isAppsInToss: boolean) => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', isAppsInToss ? '1' : '')
  await import('../index')

  const middleware = vi.mocked(createMiddleware).mock.calls.at(-1)?.[0]

  if (!Array.isArray(middleware)) {
    throw new Error('Expected createMiddleware to receive a middleware array')
  }

  return middleware as unknown as readonly Middleware[]
}

describe('middleware index', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.mocked(handleLegacyRedirectRequest).mockReturnValue(null)
    vi.mocked(handleUserAuthRequest).mockResolvedValue(null)
    vi.mocked(handleAdminAuthRequest).mockResolvedValue(null)
    vi.mocked(paraglideMiddleware).mockImplementation(async (_request, resolve) =>
      (resolve as unknown as () => Promise<Response>)(),
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should register middleware in order and bridge the next response through Paraglide', async () => {
    const middleware = await importMiddleware(false)
    const event = createEvent()
    const nextResponse = new Response('next')
    const next = vi.fn(async () => nextResponse)

    expect(middleware).toHaveLength(4)
    expect(middleware[0]).toBe(securityHeadersMiddleware)
    expect(middleware[1]).toBe(corsMiddleware)

    await expect(middleware[2]?.(event, next)).resolves.toBe(nextResponse)
    expect(paraglideMiddleware).toHaveBeenCalledWith(event.req, expect.any(Function))
    expect(next).toHaveBeenCalledOnce()
  })

  it('should return a legacy redirect before authentication on the web', async () => {
    const legacyRedirect = new Response(null, {status: 308})
    vi.mocked(handleLegacyRedirectRequest).mockReturnValue(legacyRedirect)
    const middleware = await importMiddleware(false)
    const event = createEvent()
    const next = vi.fn(async () => new Response('next'))

    await expect(middleware[3]?.(event, next)).resolves.toBe(legacyRedirect)
    expect(handleLegacyRedirectRequest).toHaveBeenCalledWith(event.req)
    expect(handleUserAuthRequest).not.toHaveBeenCalled()
    expect(handleAdminAuthRequest).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('should return a user authentication response before admin authentication', async () => {
    const userAuthResponse = new Response('user auth', {status: 401})
    vi.mocked(handleUserAuthRequest).mockResolvedValue(userAuthResponse)
    const middleware = await importMiddleware(false)
    const event = createEvent()
    const next = vi.fn(async () => new Response('next'))

    await expect(middleware[3]?.(event, next)).resolves.toBe(userAuthResponse)
    expect(handleLegacyRedirectRequest).toHaveBeenCalledWith(event.req)
    expect(handleUserAuthRequest).toHaveBeenCalledWith({
      request: event.req,
      responseHeaders: event.res.headers,
      url: event.url,
    })
    expect(handleAdminAuthRequest).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('should return an admin authentication response before the route handler', async () => {
    const adminAuthResponse = new Response('admin auth', {status: 403})
    vi.mocked(handleAdminAuthRequest).mockResolvedValue(adminAuthResponse)
    const middleware = await importMiddleware(false)
    const event = createEvent()
    const next = vi.fn(async () => new Response('next'))

    await expect(middleware[3]?.(event, next)).resolves.toBe(adminAuthResponse)
    expect(handleAdminAuthRequest).toHaveBeenCalledWith({
      request: event.req,
      responseHeaders: event.res.headers,
      url: event.url,
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should continue to the route handler when web middleware passes', async () => {
    const middleware = await importMiddleware(false)
    const event = createEvent()
    const nextResponse = new Response('next')
    const next = vi.fn(async () => nextResponse)

    await expect(middleware[3]?.(event, next)).resolves.toBe(nextResponse)
    expect(handleLegacyRedirectRequest).toHaveBeenCalledWith(event.req)
    expect(handleUserAuthRequest).toHaveBeenCalledOnce()
    expect(handleAdminAuthRequest).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledOnce()
  })

  it('should skip legacy redirects in Apps in Toss and continue normally', async () => {
    const middleware = await importMiddleware(true)
    const event = createEvent()
    const nextResponse = new Response('next')
    const next = vi.fn(async () => nextResponse)

    await expect(middleware[3]?.(event, next)).resolves.toBe(nextResponse)
    expect(handleLegacyRedirectRequest).not.toHaveBeenCalled()
    expect(handleUserAuthRequest).toHaveBeenCalledOnce()
    expect(handleAdminAuthRequest).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledOnce()
  })
})
