import {describe, expect, test} from 'vitest'

import {
  createDeformerControlPoints,
  isGridDivisionCount,
  resampleGridControlPoints,
} from '../grid-control-points'

describe('grid control points', () => {
  test('should create a row-major control lattice over the bounds', () => {
    expect(
      createDeformerControlPoints({
        bounds: {height: 20, width: 20, x: 10, y: 30},
        columns: 2,
        rows: 1,
      }),
    ).toEqual([10, 30, 20, 30, 30, 30, 10, 50, 20, 50, 30, 50])
  })

  test('should preserve the deformed surface while changing its divisions', () => {
    const controlPoints = resampleGridControlPoints({
      columns: 1,
      controlPoints: [0, 0, 100, 0, 0, 100, 120, 100],
      nextColumns: 2,
      nextRows: 2,
      rows: 1,
    })

    expect(controlPoints).toHaveLength(18)
    expect(controlPoints.slice(0, 2)).toEqual([0, 0])
    expect(controlPoints.slice(8, 10)).toEqual([55, 50])
    expect(controlPoints.slice(-2)).toEqual([120, 100])
  })

  test('should accept only bounded positive integer divisions', () => {
    expect(isGridDivisionCount(1)).toBe(true)
    expect(isGridDivisionCount(32)).toBe(true)
    expect(isGridDivisionCount(0)).toBe(false)
    expect(isGridDivisionCount(1.5)).toBe(false)
    expect(isGridDivisionCount(33)).toBe(false)
  })
})
