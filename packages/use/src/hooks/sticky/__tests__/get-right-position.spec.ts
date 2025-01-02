import {getEndPosition} from '../get-end-position'
import {describe, expect, it} from 'vitest'

describe('getEndPosition', () => {
  it('should return end', () => {
    const center = getEndPosition(
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

    expect(center).toEqual({x: 100, y: 350})
  })
})
