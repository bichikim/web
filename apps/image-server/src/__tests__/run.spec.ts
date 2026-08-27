import express, {json, urlencoded} from 'express'
import * as dotenv from 'dotenv'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {imageFormat, imageRequest, imageTransform, imageTransformContext} from '../middleware'
import {ImageRequestError} from '../middleware/safe-image-request'

vi.mock('express', () => ({default: vi.fn(), json: vi.fn(), urlencoded: vi.fn()}))
vi.mock('dotenv', () => ({config: vi.fn()}))
vi.mock('../middleware', () => ({
  imageFormat: vi.fn(),
  imageRequest: vi.fn(),
  imageTransform: vi.fn(),
  imageTransformContext: {use: vi.fn()},
}))

interface ResponseStub {
  headersSent: boolean
  json: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
  status: ReturnType<typeof vi.fn>
  type: ReturnType<typeof vi.fn>
}

const createResponse = (): ResponseStub => {
  const response: ResponseStub = {
    headersSent: false,
    json: vi.fn(),
    send: vi.fn(),
    status: vi.fn(),
    type: vi.fn(),
  }
  response.status.mockReturnValue(response)

  return response
}

describe('image server startup', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('should configure middleware, routes, errors, and the configured listener', async () => {
    const use = vi.fn()
    const get = vi.fn()
    const listen = vi.fn()
    vi.mocked(express).mockReturnValue({get, listen, use} as never)
    vi.mocked(json).mockReturnValue('json-middleware' as never)
    vi.mocked(urlencoded).mockReturnValue('urlencoded-middleware' as never)
    vi.mocked(imageFormat).mockReturnValue('format-middleware' as never)
    vi.mocked(imageRequest).mockReturnValue('request-middleware' as never)
    vi.mocked(imageTransform).mockReturnValue('transform-middleware' as never)
    vi.stubEnv('PORT', '9090')
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await import('../run')

    expect(dotenv.config).toHaveBeenCalledOnce()
    expect(urlencoded).toHaveBeenCalledWith({extended: false})
    expect(use.mock.calls.slice(0, 5).map(([middleware]) => middleware)).toEqual([
      'json-middleware',
      'urlencoded-middleware',
      'format-middleware',
      'request-middleware',
      'transform-middleware',
    ])
    expect(listen).toHaveBeenCalledWith('9090', expect.any(Function))
    listen.mock.calls[0]?.[1]?.()
    expect(info).toHaveBeenCalledWith('http://localhost:9090')

    const route = get.mock.calls[0]?.[1]
    const imageResponse = createResponse()
    vi.mocked(imageTransformContext.use).mockReturnValue({format: 'webp', image: 'image'} as never)
    route({}, imageResponse)
    expect(imageResponse.type).toHaveBeenCalledWith('image/webp')
    expect(imageResponse.send).toHaveBeenCalledWith('image')

    const missingResponse = createResponse()
    vi.mocked(imageTransformContext.use).mockReturnValue(undefined)
    route({}, missingResponse)
    expect(missingResponse.status).toHaveBeenCalledWith(404)
    expect(missingResponse.send).toHaveBeenCalledWith('Not found')

    const handleError = use.mock.calls.at(-1)?.[0]
    const requestErrorResponse = createResponse()
    handleError(new ImageRequestError('Bad image', 422), {}, requestErrorResponse, vi.fn())
    expect(requestErrorResponse.status).toHaveBeenCalledWith(422)
    expect(requestErrorResponse.json).toHaveBeenCalledWith({message: 'Bad image'})

    const internalResponse = createResponse()
    const internalError = new Error('unexpected')
    handleError(internalError, {}, internalResponse, vi.fn())
    expect(errorLog).toHaveBeenCalledWith(internalError)
    expect(internalResponse.status).toHaveBeenCalledWith(500)
    expect(internalResponse.json).toHaveBeenCalledWith({message: 'Internal server error'})

    const sentResponse = createResponse()
    sentResponse.headersSent = true
    const next = vi.fn()
    handleError(internalError, {}, sentResponse, next)
    expect(next).toHaveBeenCalledWith(internalError)
  })
})
