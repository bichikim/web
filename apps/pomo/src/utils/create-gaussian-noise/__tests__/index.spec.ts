/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import {createGaussianNoise} from '..'

describe('createGaussianNoise', () => {
  it('should return ordered Float32 samples using two random draws per sample', () => {
    const random = vi
      .fn()
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(Math.exp(-0.5))
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(Math.exp(-2))
      .mockReturnValueOnce(0)

    const noise = createGaussianNoise({length: 3, random})

    expect(noise).toEqual(Float32Array.of(-0, -1, 2))
    expect(random).toHaveBeenCalledTimes(6)
  })

  it.each([0, 0.00001, 0.0001])(
    'should bound a radial draw of %j before taking its logarithm',
    (radial) => {
      const random = vi.fn().mockReturnValueOnce(radial).mockReturnValueOnce(0)

      expect(createGaussianNoise({length: 1, random})).toEqual(Float32Array.of(4.291932106018066))
      expect(random).toHaveBeenCalledTimes(2)
    },
  )

  it('should allocate an empty array without drawing random values', () => {
    const random = vi.fn()

    expect(createGaussianNoise({length: 0, random})).toEqual(new Float32Array())
    expect(random).not.toHaveBeenCalled()
  })

  it.each([-1, Number.POSITIVE_INFINITY])(
    'should reject an unallocatable length %j before drawing',
    (length) => {
      const random = vi.fn()

      expect(() => createGaussianNoise({length, random})).toThrow(RangeError)
      expect(random).not.toHaveBeenCalled()
    },
  )

  it.each([1, 2])(
    'should propagate a failure on random draw %j without further draws',
    (failureDraw) => {
      const failure = new Error('Random source failed')
      const random = vi.fn(() => {
        if (random.mock.calls.length === failureDraw) {
          throw failure
        }
        return 0.5
      })

      expect(() => createGaussianNoise({length: 2, random})).toThrow(failure)
      expect(random).toHaveBeenCalledTimes(failureDraw)
    },
  )
})
