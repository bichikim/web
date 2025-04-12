import {once} from '../'
import {describe, expect, it, vi} from 'vitest'

describe('once', () => {
  it('should run once', () => {
    const runner = vi.fn()
    const _once = once(runner)

    _once()
    expect(runner).toHaveBeenCalledTimes(1)
    _once()
    expect(runner).toHaveBeenCalledTimes(1)
  })
})

describe('once share value example', () => {
  it('should run once ', () => {
    const _once = once(() => {
      let count = 0

      return {
        get count() {
          return count
        },
        set count(value) {
          count = value
        },
      }
    })
    const aValue = _once()
    const bValue = _once()

    expect(aValue.count).toBe(0)
    expect(bValue.count).toBe(0)
    aValue.count += 1
    expect(aValue.count).toBe(1)
    expect(bValue.count).toBe(1)
  })
})
