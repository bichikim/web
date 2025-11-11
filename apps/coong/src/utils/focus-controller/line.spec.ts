import {describe, expect, it} from 'vitest'
import type {Direction} from './direction'
import type {Position} from './deep-position'
import {createLine, generateLine} from './line'

describe('generateLine', () => {
  it('should yield points starting after the origin by default', () => {
    const origin: Position = {x: 2, y: 3}
    const direction: Direction = {x: 1, y: 0}

    const points = Array.from(generateLine(origin, direction, 4))

    expect(points).toEqual([
      {x: 3, y: 4},
      {x: 4, y: 5},
      {x: 5, y: 6},
    ])
  })

  it('should include the origin when includeOrigin is true', () => {
    const origin: Position = {x: -1, y: -1}
    const direction: Direction = {x: 0, y: 1}

    const points = Array.from(generateLine(origin, direction, 3, true))

    expect(points).toEqual([
      {x: -1, y: -1},
      {x: 0, y: 0},
      {x: 1, y: 1},
    ])
  })
})

describe('createLine', () => {
  it('should return successive points from the underlying generator', () => {
    const origin: Position = {x: 0, y: 0}
    const direction: Direction = {x: 1, y: 1}

    const nextPoint = createLine(origin, direction, 3, true)

    expect(nextPoint()).toEqual({x: 0, y: 0})
    expect(nextPoint()).toEqual({x: 1, y: 1})
    expect(nextPoint()).toEqual({x: 2, y: 2})
  })
})


