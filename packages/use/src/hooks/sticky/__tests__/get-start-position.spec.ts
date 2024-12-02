import {getStartPosition} from '../get-start-position'
import {describe, expect, it} from 'vitest'

describe('getStart', () => {
  it('should return start', () => {
    const center = getStartPosition({
      height: 200,
      width: 100,
      x: 100,
      y: 200,
    })
    expect(center).toEqual({x: 100, y: 200})
  })
})
