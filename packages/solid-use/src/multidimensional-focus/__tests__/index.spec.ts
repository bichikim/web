import {describe, expect, it, vi} from 'vitest'
import {stringifyPoint, stringifyFocusPosition, parsePoint, parseFocusPosition} from '../'

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
    const focusPosition = [{x: 1, y: 2}, {x: 3, y: 4}]
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

describe('focus controller', () => {
  // todo
  it('can search next focus position direction', () => {
    const aMap = new Map([[1, 1]])
    const bMap = new Map(aMap)
    // bMap.
    //
    // console.log(aMap)
    // console.log(bMap)
  })
})
