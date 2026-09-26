/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'
import {visibility} from '../visibility'

describe('visibility (server)', () => {
  it('should register and clean up without a window', () => {
    const callback = vi.fn()
    const stop = visibility(callback)

    expect(callback).not.toHaveBeenCalled()
    expect(() => stop()).not.toThrow()
    expect(callback).not.toHaveBeenCalled()
  })
})
