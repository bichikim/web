import {isPromise} from '../'
import {describe, expect, expectTypeOf, it, vi} from 'vitest'

describe('is-promise', () => {
  it('should return false without promise', () => {
    expect(isPromise(null)).toBe(false)
    expect(isPromise(undefined)).toBe(false)
    expect(isPromise({})).toBe(false)
  })

  it('should return true with promise like', () => {
    const promiseLike = {
      catch: vi.fn(),
      finally: vi.fn(),
      then: vi.fn(),
    }

    expect(isPromise(promiseLike)).toBe(true)
  })

  it('should narrow an unknown value to a promise', () => {
    const value: unknown = Promise.resolve('value')

    if (isPromise(value)) {
      expectTypeOf(value).toEqualTypeOf<Promise<unknown>>()
    }
  })

  it('should return false without promise like', () => {
    const promiseLike = {
      then: vi.fn(),
    }

    expect(isPromise(promiseLike)).toBe(false)
  })

  it('should return false instead of throwing for an inaccessible property', () => {
    const value = new Proxy(
      {},
      {
        get: () => {
          throw new Error('inaccessible')
        },
      },
    )

    expect(isPromise(value)).toBe(false)
  })
})
