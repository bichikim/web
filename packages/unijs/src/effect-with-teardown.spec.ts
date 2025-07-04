import {compare, effectWithTeardown, teardown} from './effect-with-teardown'
import {describe, expect, it, vi} from 'vitest'
import {signal} from 'alien-signals'

describe('effectWithTeardown', () => {
  describe('teardown', () => {
    it('should work', () => {
      const effectSpy = vi.fn((value) => value)
      const effectSpy2 = vi.fn((value) => value)
      const teardownSpy = vi.fn()
      const teardownSpy2 = vi.fn()

      const count = signal(0)
      const count2 = signal(0)

      effectWithTeardown(() => {
        effectSpy(count())
        teardown(teardownSpy)
        // expect(result.__isHiddenArg).toBe(true)
      })

      effectWithTeardown(() => {
        effectSpy2(count2())
        teardown(teardownSpy2)
      })
      expect(effectSpy).toHaveBeenCalledTimes(1)
      expect(effectSpy2).toHaveBeenCalledTimes(1)
      expect(teardownSpy).toHaveBeenCalledTimes(0)
      expect(teardownSpy2).toHaveBeenCalledTimes(0)
      count(1)
      expect(effectSpy).toHaveBeenCalledTimes(2)
      expect(effectSpy2).toHaveBeenCalledTimes(1)
      expect(teardownSpy).toHaveBeenCalledTimes(1)
      expect(teardownSpy2).toHaveBeenCalledTimes(0)
      count2(1)
      expect(effectSpy).toHaveBeenCalledTimes(2)
      expect(effectSpy2).toHaveBeenCalledTimes(2)
      expect(teardownSpy).toHaveBeenCalledTimes(1)
      expect(teardownSpy2).toHaveBeenCalledTimes(1)
    })

    it('should get prev value with teardown', () => {
      const effectSpy = vi.fn((value) => value)
      const teardownSpy = vi.fn()
      const count = signal(0)

      effectWithTeardown(() => {
        const prevCount = count()

        effectSpy(count())

        teardown(() => {
          teardownSpy(prevCount)
        })
      })
      expect(effectSpy).toHaveBeenCalledTimes(1)
      expect(teardownSpy).toHaveBeenCalledTimes(0)
      count(1)
      expect(effectSpy).toHaveBeenCalledTimes(2)
      expect(teardownSpy).toHaveBeenCalledTimes(1)
      expect(teardownSpy).toHaveBeenNthCalledWith(1, 0)
      count(2)
      expect(effectSpy).toHaveBeenCalledTimes(3)
      expect(teardownSpy).toHaveBeenCalledTimes(2)
      expect(teardownSpy).toHaveBeenNthCalledWith(2, 1)
    })

    it('should not track effect in teardown', () => {
      const effectSpy = vi.fn((value) => value)
      const teardownSpy = vi.fn()
      const count = signal(0)

      effectWithTeardown(() => {
        const prevCount = count()

        effectSpy(count())

        teardown(() => {
          teardownSpy(
            prevCount,
            // currentCount,
            count(),
          )
        })
      })
      expect(effectSpy).toHaveBeenCalledTimes(1)
      expect(teardownSpy).toHaveBeenCalledTimes(0)
      count(1)
      expect(effectSpy).toHaveBeenCalledTimes(2)
      expect(teardownSpy).toHaveBeenCalledTimes(1)
      expect(teardownSpy).toHaveBeenNthCalledWith(1, 0, 1)
      count(2)
      expect(effectSpy).toHaveBeenCalledTimes(3)
      expect(teardownSpy).toHaveBeenCalledTimes(2)
      expect(teardownSpy).toHaveBeenNthCalledWith(2, 1, 2)
    })
  })

  describe('compare', () => {
    it('should work', () => {
      const effectSpy = vi.fn((value) => value)
      const compareSpy = vi.fn()
      const count = signal(0)

      effectWithTeardown(() => {
        effectSpy(count())

        const currentCount = count()

        compare((prevValue) => {
          compareSpy(prevValue, currentCount)
        })

        // compare 는 반환된 값을 prevValue 로 사용 합니다
        return count()
      })
      expect(effectSpy).toHaveBeenCalledTimes(1)
      expect(compareSpy).toHaveBeenCalledTimes(1)
      expect(compareSpy).toHaveBeenNthCalledWith(1, undefined, 0)
      count(1)
      expect(effectSpy).toHaveBeenCalledTimes(2)
      expect(compareSpy).toHaveBeenCalledTimes(2)
      expect(compareSpy).toHaveBeenNthCalledWith(2, 0, 1)
      count(2)
      expect(effectSpy).toHaveBeenCalledTimes(3)
      expect(compareSpy).toHaveBeenCalledTimes(3)
      expect(compareSpy).toHaveBeenNthCalledWith(3, 1, 2)
    })
  })
})
