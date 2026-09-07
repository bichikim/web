import {describe, expect, it} from 'vitest'

import {clampFoldTarget, computePageFold, shouldCompletePageFold} from '../fold'

describe('computePageFold', () => {
  it('should remain flat until the grabbed edge meaningfully moves', () => {
    expect(
      computePageFold({
        anchor: {x: 400, y: 250},
        height: 500,
        target: {x: 399, y: 250},
        width: 400,
      }),
    ).toBeNull()
  })

  it('should derive live polygons and a reflection matrix from the pointer position', () => {
    const fold = computePageFold({
      anchor: {x: 400, y: 250},
      height: 500,
      target: {x: 0, y: 250},
      width: 400,
    })

    expect(fold?.progress).toBe(50)
    expect(fold?.flatPage).toHaveLength(4)
    expect(fold?.flap).toHaveLength(4)
    expect(fold?.matrix).toEqual([-1, 0, 0, 1, 400, -0])
  })

  it('should constrain diagonal drags so the fold never crosses the spine corners', () => {
    const anchor = {x: 400, y: 500}
    const target = clampFoldTarget({anchor, height: 500, target: {x: -500, y: -500}})

    expect(Math.hypot(target.x, target.y)).toBeLessThanOrEqual(Math.hypot(400, 500) + 0.001)
    expect(Math.hypot(target.x, target.y - 500)).toBeLessThanOrEqual(400.001)
  })
})

describe('shouldCompletePageFold', () => {
  it('should complete past the threshold or from a fast swipe toward the spine', () => {
    expect(shouldCompletePageFold({anchorX: 400, progress: 50, swiping: false, velocityX: 0})).toBe(
      true,
    )
    expect(shouldCompletePageFold({anchorX: 400, progress: 20, swiping: true, velocityX: -1})).toBe(
      true,
    )
    expect(shouldCompletePageFold({anchorX: -400, progress: 20, swiping: true, velocityX: 1})).toBe(
      true,
    )
  })

  it('should return to rest below the threshold or when swiped away from the spine', () => {
    expect(shouldCompletePageFold({anchorX: 400, progress: 49, swiping: false, velocityX: 0})).toBe(
      false,
    )
    expect(shouldCompletePageFold({anchorX: 400, progress: 20, swiping: true, velocityX: 1})).toBe(
      false,
    )
  })
})
