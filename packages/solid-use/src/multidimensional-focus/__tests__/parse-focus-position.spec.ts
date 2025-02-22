import {describe, expect, it} from 'vitest'
import {parseFocusPosition} from '../parse-focus-position'

describe('parseFocusPosition', () => {
  it('should parse a focus position string', () => {
    const focusPositionString = '1,2|3,4'

    expect(parseFocusPosition(focusPositionString)).toEqual([
      {x: 1, y: 2},
      {x: 3, y: 4},
    ])
  })

  it('should parse a focus position string with a single point', () => {
    const focusPositionString = '1,2'

    expect(parseFocusPosition(focusPositionString)).toEqual([{x: 1, y: 2}])
  })
})
