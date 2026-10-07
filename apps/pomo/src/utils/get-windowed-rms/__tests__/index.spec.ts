import {describe, expect, it} from 'vitest'

import {getWindowedRms} from '..'

describe('getWindowedRms', () => {
  it('should reduce overlapping windows and divide clipped tails by their available count', () => {
    expect(
      getWindowedRms({hopSamples: 2, samples: Float32Array.of(1, 2, 3, 4, 5), windowSamples: 4}),
    ).toEqual([Math.sqrt(30 / 4), Math.sqrt(50 / 3), 5])
  })

  it('should support disjoint windows and gaps between windows', () => {
    const samples = [1, 2, 3, 4, 5, 6, 7, 8]

    expect(getWindowedRms({hopSamples: 2, samples, windowSamples: 2})).toEqual([
      Math.sqrt(5 / 2),
      Math.sqrt(25 / 2),
      Math.sqrt(61 / 2),
      Math.sqrt(113 / 2),
    ])
    expect(getWindowedRms({hopSamples: 3, samples, windowSamples: 2})).toEqual([
      Math.sqrt(5 / 2),
      Math.sqrt(41 / 2),
      Math.sqrt(113 / 2),
    ])
  })

  it('should respect a typed array view and leave its underlying samples unchanged', () => {
    const storage = Float32Array.of(9, 3, -4, 9)
    const original = storage.slice()

    expect(
      getWindowedRms({hopSamples: 1, samples: storage.subarray(1, 3), windowSamples: 10}),
    ).toEqual([Math.sqrt(25 / 2), 4])
    expect(storage).toEqual(original)
  })

  it('should return no windows for empty samples and zero for silence', () => {
    expect(getWindowedRms({hopSamples: 1, samples: [], windowSamples: 2})).toEqual([])
    expect(
      getWindowedRms({hopSamples: 1, samples: Float32Array.of(0, -0, 0), windowSamples: 2}),
    ).toEqual([0, 0, 0])
  })

  it('should include missing samples in the denominator as zeroes', () => {
    expect(
      getWindowedRms({hopSamples: 3, samples: {0: 3, 2: -3, length: 3}, windowSamples: 3}),
    ).toEqual([Math.sqrt(6)])
  })

  it('should treat a window that becomes empty as silence without snapshotting the length', () => {
    const lengths = [1, 0, 0]
    let reads = 0
    const samples = {
      get length() {
        reads += 1
        return lengths.shift() ?? 0
      },
    }

    expect(getWindowedRms({hopSamples: 1, samples, windowSamples: 2})).toEqual([0])
    expect(reads).toBe(3)
  })

  it('should accumulate squares from left to right without regrouping', () => {
    expect(
      getWindowedRms({
        hopSamples: 5,
        samples: Float32Array.of(100_000_000, 1, 1, 1, 1),
        windowSamples: 5,
      }),
    ).toEqual([Math.sqrt(10_000_000_000_000_000 / 5)])
    expect(Math.sqrt(10_000_000_000_000_004 / 5)).not.toBe(Math.sqrt(10_000_000_000_000_000 / 5))
  })

  it.each([NaN, Infinity])('should keep a nonfinite sample local to its window: %s', (sample) => {
    expect(
      getWindowedRms({hopSamples: 2, samples: Float32Array.of(sample, 2, 3, 4), windowSamples: 2}),
    ).toEqual([sample, Math.sqrt(25 / 2)])
  })

  it.each([
    {hopSamples: NaN, levels: [Math.sqrt(5 / 2)], windowSamples: 2},
    {hopSamples: Infinity, levels: [Math.sqrt(5 / 2)], windowSamples: 2},
    {hopSamples: 2, levels: [0, 0], windowSamples: NaN},
    {hopSamples: 2, levels: [Math.sqrt(30 / 4), Math.sqrt(25 / 2)], windowSamples: Infinity},
    {hopSamples: NaN, levels: [0], windowSamples: NaN},
    {hopSamples: Infinity, levels: [Math.sqrt(30 / 4)], windowSamples: Infinity},
  ])('should retain IEEE window behavior for $hopSamples/$windowSamples', (options) => {
    expect(getWindowedRms({...options, samples: Float32Array.of(1, 2, 3, 4)})).toEqual(
      options.levels,
    )
  })

  it.each([0, -1, -Infinity, 0.5, 1.5])('should reject an invalid hop count: %s', (hopSamples) => {
    expect(() => getWindowedRms({hopSamples, samples: [1], windowSamples: 2})).toThrow(RangeError)
  })

  it.each([0, -1, -Infinity, 0.5, 1.5])(
    'should reject an invalid window count even for empty samples: %s',
    (windowSamples) => {
      expect(() => getWindowedRms({hopSamples: 1, samples: [], windowSamples})).toThrow(RangeError)
    },
  )
})
