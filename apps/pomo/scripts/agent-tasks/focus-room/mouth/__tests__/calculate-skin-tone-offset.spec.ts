/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {calculateSkinToneOffset} from '../calculate-skin-tone-offset.mjs'

const createSample = () => ({
  generated: new Uint8Array(5 * 4 * 4),
  mouthExclusion: {bottom: 3, left: 2, right: 4, top: 2},
  opaqueAlphaThreshold: 250,
  original: new Uint8Array(5 * 4 * 4),
  patch: {width: 5},
  sampleBounds: {bottom: 4, left: 1, right: 5, top: 1},
})

describe('calculateSkinToneOffset', () => {
  it('should average signed RGB differences over jointly opaque pixels without changing inputs', () => {
    const sample = createSample()
    sample.original.set([50, 30, 20, 250], (1 * 5 + 1) * 4)
    sample.generated.set([30, 40, 20, 255], (1 * 5 + 1) * 4)
    sample.original.set([40, 80, 10, 255], (1 * 5 + 2) * 4)
    sample.generated.set([40, 70, 20, 250], (1 * 5 + 2) * 4)
    sample.original.set([255, 255, 255, 249], (1 * 5 + 3) * 4)
    sample.generated.set([0, 0, 0, 255], (1 * 5 + 3) * 4)
    sample.original.set([255, 255, 255, 255], (1 * 5 + 4) * 4)
    sample.generated.set([0, 0, 0, 249], (1 * 5 + 4) * 4)
    const original = sample.original.slice()
    const generated = sample.generated.slice()

    const first = calculateSkinToneOffset(sample)
    const second = calculateSkinToneOffset(sample)

    expect(first).toEqual([10, 0, -5])
    expect(second).toEqual(first)
    expect(second).not.toBe(first)
    expect(sample.original).toEqual(original)
    expect(sample.generated).toEqual(generated)
  })

  it('should include top and left sample edges and exclude bottom and right edges', () => {
    const sample = createSample()
    sample.sampleBounds = {bottom: 3, left: 1, right: 4, top: 1}
    sample.original.set([11, 22, 33, 255], (1 * 5 + 1) * 4)
    sample.generated.set([10, 20, 30, 255], (1 * 5 + 1) * 4)
    for (const [column, row] of [
      [0, 1],
      [1, 0],
      [4, 1],
      [1, 3],
    ]) {
      sample.original.set([255, 255, 255, 255], (row * 5 + column) * 4)
      sample.generated.set([0, 0, 0, 255], (row * 5 + column) * 4)
    }

    expect(calculateSkinToneOffset(sample)).toEqual([1, 2, 3])
  })

  it('should exclude the half-open mouth rectangle and retain pixels on its right and bottom edges', () => {
    const sample = createSample()
    for (const [column, row] of [
      [2, 2],
      [3, 2],
    ]) {
      sample.original.set([255, 255, 255, 255], (row * 5 + column) * 4)
      sample.generated.set([0, 0, 0, 255], (row * 5 + column) * 4)
    }
    sample.original.set([6, 1, 9, 255], (2 * 5 + 4) * 4)
    sample.generated.set([1, 6, 3, 255], (2 * 5 + 4) * 4)
    sample.original.set([2, 6, 0, 255], (3 * 5 + 2) * 4)
    sample.generated.set([0, 2, 3, 255], (3 * 5 + 2) * 4)

    expect(calculateSkinToneOffset(sample)).toEqual([3.5, -0.5, 1.5])
  })

  it.each(['transparent', 'excluded', 'empty'] as const)(
    'should reject a %s sample with the existing empty-population error',
    (kind) => {
      const sample = createSample()
      if (kind === 'excluded') {
        sample.original.set([5, 10, 15, 255], (2 * 5 + 2) * 4)
        sample.generated.set([1, 2, 3, 255], (2 * 5 + 2) * 4)
      }
      if (kind === 'empty') {
        sample.sampleBounds.bottom = sample.sampleBounds.top
      }

      expect(() => calculateSkinToneOffset(sample)).toThrow(
        new Error('Could not find opaque skin pixels for mouth color matching.'),
      )
    },
  )
})
