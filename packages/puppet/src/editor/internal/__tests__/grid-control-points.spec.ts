import {describe, expect, test} from 'vitest'

import {isGridDivisionCount, resampleGridControlPoints} from '../grid-control-points'

describe('grid control points', () => {
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
