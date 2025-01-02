import {getCenterPosition} from '../get-center-position'
import {describe, expect, it} from 'vitest'

describe('getCenterPosition', () => {
  it('should return center', () => {
    const center = getCenterPosition(
      {
        height: 200,
        width: 100,
        x: 100,
        y: 200,
      },
      {
        height: 50,
        width: 100,
      },
    )

    expect(center).toEqual({x: 100, y: 275})
  })
})
