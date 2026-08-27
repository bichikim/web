import type {Request} from 'express'
import {describe, expect, it, vi} from 'vitest'

import {formatContext, imageFormat} from '../image-format'

const runImageFormat = (request: Request) => {
  const next = vi.fn()

  imageFormat()(request, {} as Parameters<ReturnType<typeof imageFormat>>[1], next)

  expect(next).toHaveBeenCalledOnce()
  return formatContext.use(request)
}

describe('imageFormat', () => {
  it('should prefer the descriptive format parameter over the alias', () => {
    const request = {
      headers: {},
      query: {f: 'png', format: 'jpeg'},
    } as unknown as Request

    expect(runImageFormat(request)).toBe('jpeg')
  })

  it('should use the short format alias when needed', () => {
    const request = {headers: {}, query: {f: 'png'}} as unknown as Request

    expect(runImageFormat(request)).toBe('png')
  })

  it('should negotiate WebP when no format is requested', () => {
    const request = {
      headers: {accept: 'image/avif,image/webp,*/*'},
      query: {},
    } as unknown as Request

    expect(runImageFormat(request)).toBe('webp')
  })

  it('should leave the format unset when the request has no preference', () => {
    const request = {headers: {}, query: {}} as unknown as Request

    expect(runImageFormat(request)).toBeUndefined()
  })
})
