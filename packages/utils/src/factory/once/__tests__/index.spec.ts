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

    const a = _once()
    const b = _once()

    expect(a.count).toBe(0)
    expect(b.count).toBe(0)

    a.count += 1

    expect(a.count).toBe(1)
    expect(b.count).toBe(1)
  })
})
