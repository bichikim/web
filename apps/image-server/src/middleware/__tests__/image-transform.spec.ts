import 'reflect-metadata'

import type {Request, Response} from 'express'
import sharp from 'sharp'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {formatContext} from '../image-format'
import {imageContext} from '../image-request'
import {imageTransform, imageTransformContext} from '../image-transform'

vi.mock('sharp', () => ({
  default: vi.fn(),
}))

const createTransformer = () => ({
  resize: vi.fn(),
  rotate: vi.fn(),
  toBuffer: vi.fn().mockResolvedValue(Buffer.from([9, 8, 7])),
  toFormat: vi.fn(),
})

const createResponse = () => {
  const response = {
    json: vi.fn(),
    status: vi.fn(),
  }
  response.status.mockReturnValue(response)
  return response as unknown as Response
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('imageTransform', () => {
  it('should crop an oversized image while preserving its aspect ratio', async () => {
    const request = {
      query: {crop: 'cover', height: '1000', quality: '70', width: '3000'},
    } as unknown as Request
    const transformer = createTransformer()
    transformer.rotate.mockReturnValue(transformer)
    transformer.resize.mockReturnValue(transformer)
    transformer.toFormat.mockReturnValue(transformer)
    vi.mocked(sharp).mockReturnValue(transformer as unknown as ReturnType<typeof sharp>)
    formatContext.provide(request, 'webp')
    imageContext.provide(request, Buffer.from([1, 2, 3]))
    const next = vi.fn()

    await imageTransform({maxSize: 1200})(request, createResponse(), next)

    expect(transformer.resize).toHaveBeenCalledWith(1200, 400, {
      fit: 'cover',
      position: undefined,
    })
    expect(transformer.toFormat).toHaveBeenCalledWith('webp', {quality: 70})
    expect(imageTransformContext.use(request)).toEqual({
      format: 'webp',
      image: Buffer.from([9, 8, 7]),
    })
    expect(next).toHaveBeenCalledWith()
  })

  it('should clamp a single width for a non-cropped resize', async () => {
    const request = {query: {width: '2400'}} as unknown as Request
    const transformer = createTransformer()
    transformer.rotate.mockReturnValue(transformer)
    transformer.resize.mockReturnValue(transformer)
    transformer.toFormat.mockReturnValue(transformer)
    vi.mocked(sharp).mockReturnValue(transformer as unknown as ReturnType<typeof sharp>)
    formatContext.provide(request, 'jpeg')
    imageContext.provide(request, Buffer.from([1]))

    await imageTransform({maxSize: 1000})(request, createResponse(), vi.fn())

    expect(transformer.resize).toHaveBeenCalledWith(1000, undefined, {
      fit: 'inside',
      withoutEnlargement: true,
    })
  })

  it('should respond with validation errors before invoking sharp', async () => {
    const request = {query: {width: '0'}} as unknown as Request
    const response = createResponse()

    await imageTransform()(request, response, vi.fn())

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({message: 'Invalid image transform parameters'}),
    )
    expect(sharp).not.toHaveBeenCalled()
  })

  it('should continue when no downloaded image is available', async () => {
    const request = {query: {width: '100'}} as unknown as Request
    formatContext.provide(request, 'jpeg')
    const next = vi.fn()

    await imageTransform()(request, createResponse(), next)

    expect(next).toHaveBeenCalledWith()
    expect(sharp).not.toHaveBeenCalled()
  })
})
