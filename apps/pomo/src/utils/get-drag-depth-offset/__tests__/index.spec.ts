/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {getDragDepthOffset} from '..'

describe('getDragDepthOffset', () => {
  it('should retain the default drag range of 35 percent', () => {
    expect(getDragDepthOffset({distance: 175, extent: 1000, startOffset: 0})).toBe(-0.5)
  })

  it('should scale the movement using a custom drag range ratio', () => {
    expect(getDragDepthOffset({distance: 250, extent: 1000, rangeRatio: 0.5, startOffset: 0})).toBe(
      -0.5,
    )
  })

  it('should apply a custom range relative to the starting offset', () => {
    expect(
      getDragDepthOffset({distance: 250, extent: 1000, rangeRatio: 0.5, startOffset: 0.5}),
    ).toBe(0)
  })

  it.each([
    [1000, -1],
    [-1000, 1],
  ])('should clamp a drag distance of %s to %s', (distance, expected) => {
    expect(getDragDepthOffset({distance, extent: 1000, rangeRatio: 0.5, startOffset: 0})).toBe(
      expected,
    )
  })

  it('should keep the starting offset when no distance has been dragged', () => {
    expect(getDragDepthOffset({distance: 0, extent: 1000, rangeRatio: 0.5, startOffset: 0.5})).toBe(
      0.5,
    )
  })
})
