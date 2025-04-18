import {describe, expect, it} from 'vitest'
import {parseFocusPosition, parsePoint, stringifyFocusPosition, stringifyPoint} from '../'

describe('stringifyPoint', () => {
  it('should stringify a point', () => {
    const point = {x: 1, y: 2}

    expect(stringifyPoint(point)).toBe('1,2')
  })
})

describe('parsePoint', () => {
  it('should parse a point string', () => {
    const pointString = '1,2'

    expect(parsePoint(pointString)).toEqual({x: 1, y: 2})
  })
})

describe('stringifyFocusPosition', () => {
  it('should stringify a focus position', () => {
    const focusPosition = [
      {x: 1, y: 2},
      {x: 3, y: 4},
    ]

    expect(stringifyFocusPosition(focusPosition)).toBe('1,2|3,4')
  })
})

describe('parseFocusPosition', () => {
  it('should parse a focus position string', () => {
    const focusPositionString = '1,2|3,4'

    expect(parseFocusPosition(focusPositionString)).toEqual([
      {x: 1, y: 2},
      {x: 3, y: 4},
    ])
  })
})
