import {once} from '../'
import {describe, expect, it, vi} from 'vitest'
describe('create once', () => {
  it('should once that run once', () => {
    const runner = vi.fn()
    const _once = once(runner)
    _once()

    expect(runner).toHaveBeenCalledTimes(1)

    _once()

    expect(runner).toHaveBeenCalledTimes(1)
  })
})
