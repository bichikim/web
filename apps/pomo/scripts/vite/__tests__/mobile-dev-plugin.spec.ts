/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'
import type {Plugin, ViteDevServer} from 'vite'

import {createMobileDevPlugin} from '../mobile-dev-plugin'

interface CallablePlugin {
  readonly configureServer: (server: ViteDevServer) => void
}

interface MiddlewareRequest {
  readonly url?: string
}

interface MiddlewareResponse {
  statusCode: number
  readonly end: (body: string) => void
  readonly setHeader: (name: string, value: string) => void
}

type Middleware = (
  request: MiddlewareRequest,
  response: MiddlewareResponse,
  next: (error?: unknown) => void,
) => Promise<void> | void

const asCallablePlugin = (plugin: Plugin): CallablePlugin => plugin as unknown as CallablePlugin

const createServer = () => {
  const use = vi.fn()
  const transformRequest = vi.fn()
  const server = {
    middlewares: {use},
    transformRequest,
  } as unknown as ViteDevServer

  return {server, transformRequest, use}
}

const getMiddleware = (use: ReturnType<typeof vi.fn>): Middleware => {
  const middleware = use.mock.calls[0]?.[0]
  if (typeof middleware !== 'function') {
    throw new Error('모바일 개발 미들웨어가 등록되지 않았어요.')
  }
  return middleware as Middleware
}

const createResponse = () => ({
  end: vi.fn(),
  setHeader: vi.fn(),
  statusCode: 0,
})

describe('createMobileDevPlugin', () => {
  it('should avoid registering mobile JSON middleware for desktop development', () => {
    const plugin = asCallablePlugin(createMobileDevPlugin(false))
    const {server, use} = createServer()

    plugin.configureServer(server)

    expect(use).not.toHaveBeenCalled()
  })

  it('should serve transformed JSON imports for mobile WebViews', async () => {
    const plugin = asCallablePlugin(createMobileDevPlugin(true))
    const {server, transformRequest, use} = createServer()
    const code = 'export const value = 1'
    transformRequest.mockResolvedValue({code})
    plugin.configureServer(server)
    const middleware = getMiddleware(use)
    const response = createResponse()
    const next = vi.fn()
    const url = '/src/features/text-mood/classifier-info.json?import'

    await middleware({url}, response, next)

    expect(transformRequest).toHaveBeenCalledWith(url)
    expect(response.statusCode).toBe(200)
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/javascript')
    expect(response.end).toHaveBeenCalledWith(code)
    expect(next).not.toHaveBeenCalled()
  })

  it('should pass through when a mobile JSON import cannot be transformed', async () => {
    const plugin = asCallablePlugin(createMobileDevPlugin(true))
    const {server, transformRequest, use} = createServer()
    transformRequest.mockResolvedValue(null)
    plugin.configureServer(server)
    const middleware = getMiddleware(use)
    const response = createResponse()
    const next = vi.fn()

    await middleware({url: '/src/features/missing.json?import'}, response, next)

    expect(next).toHaveBeenCalledOnce()
    expect(response.end).not.toHaveBeenCalled()
  })
})
