import {describe, expect, it, vi} from 'vitest'

import {releaseCapturedPointer} from '../release-captured-pointer'

describe('releaseCapturedPointer', () => {
  it('should release a captured pointer only when the target reports capture', () => {
    const releasePointerCapture = vi.fn()
    const hasPointerCapture = vi.fn((pointerId: number) => pointerId === 2)
    const target = {hasPointerCapture, releasePointerCapture}

    releaseCapturedPointer(target, 1)
    releaseCapturedPointer(target, 2)

    expect(hasPointerCapture.mock.calls).toEqual([[1], [2]])
    expect(releasePointerCapture).toHaveBeenCalledExactlyOnceWith(2)
  })

  it('should tolerate targets without pointer capture methods', () => {
    expect(() => releaseCapturedPointer({}, 1)).not.toThrow()
    expect(() => releaseCapturedPointer({hasPointerCapture: () => true}, 1)).not.toThrow()
  })
})
