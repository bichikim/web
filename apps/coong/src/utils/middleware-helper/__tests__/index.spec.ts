import {describe, expect, it, vi} from 'vitest'

import {createMiddlewareFragment, mergeMiddleware} from '../index'

describe('createMiddlewareFragment', () => {
  it('should preserve the supplied middleware callbacks', () => {
    const onRequest = vi.fn()
    const fragment = {onRequest}

    expect(createMiddlewareFragment(fragment)).toBe(fragment)
  })
})

describe('mergeMiddleware', () => {
  it('should flatten single and array callbacks while preserving order', () => {
    const firstRequest = vi.fn()
    const secondRequest = vi.fn()
    const firstResponse = vi.fn()
    const secondResponse = vi.fn()

    const result = mergeMiddleware(
      {onBeforeResponse: firstResponse, onRequest: firstRequest},
      {onBeforeResponse: [secondResponse], onRequest: [secondRequest]},
      {},
    )

    expect(result.onRequest).toEqual([firstRequest, secondRequest])
    expect(result.onBeforeResponse).toEqual([firstResponse, secondResponse])
  })
})
