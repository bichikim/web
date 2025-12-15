import {describe, expect, it} from 'vitest'
import type {Direction} from './direction'
import type {Position} from './deep-position'
import {createTornado, generateTornado} from './tornado'

describe('generateTornado', () => {
  it('should generate spiral points within provided range', () => {
    const origin: Position = {x: 0, y: 0}
    const points = Array.from(generateTornado(origin, 3, 1, true))

    expect(points).toEqual([
      {x: 0, y: 0},
      {x: 1, y: 0},
      {x: 1, y: 1},
      {x: 0, y: 1},
      {x: -1, y: 1},
      {x: -1, y: 0},
      {x: -1, y: -1},
      {x: 0, y: -1},
      {x: 1, y: -1},
      {x: 2, y: -1},
      {x: 2, y: 0},
      {x: 2, y: 1},
      {x: 2, y: 2},
      {x: 1, y: 2},
      {x: 0, y: 2},
      {x: -1, y: 2},
      {x: -2, y: 2},
      {x: -2, y: 1},
      {x: -2, y: 0},
      {x: -2, y: -1},
      {x: -2, y: -2},
      {x: -1, y: -2},
      {x: 0, y: -2},
      {x: 1, y: -2},
      {x: 2, y: -2},
    ])
  })

  it('should respect the configured gap between generated points', () => {
    const origin: Position = {x: 0, y: 0}
    const points = Array.from(generateTornado(origin, 5, 2, true))

    expect(points).toEqual([
      {x: 0, y: 0},
      {x: 2, y: 0},
      {x: 2, y: 2},
      {x: 0, y: 2},
      {x: -2, y: 2},
      {x: -2, y: 0},
      {x: -2, y: -2},
      {x: 0, y: -2},
      {x: 2, y: -2},
      {x: 4, y: -2},
      {x: 4, y: 0},
      {x: 4, y: 2},
      {x: 4, y: 4},
      {x: 2, y: 4},
      {x: 0, y: 4},
      {x: -2, y: 4},
      {x: -4, y: 4},
      {x: -4, y: 2},
      {x: -4, y: 0},
      {x: -4, y: -2},
      {x: -4, y: -4},
      {x: -2, y: -4},
      {x: 0, y: -4},
      {x: 2, y: -4},
      {x: 4, y: -4},
    ])
  })
})

describe('createTornado', () => {
  it('should return successive points from the underlying generator', () => {
    const origin: Position = {x: 5, y: 5}
    const direction: Direction = {x: 1, y: 0}
    const nextPosition = createTornado(origin, direction, 3, 1, true)

    expect(nextPosition()).toEqual({x: 5, y: 5})
    expect(nextPosition()).toEqual({x: 6, y: 5})
    expect(nextPosition()).toEqual({x: 6, y: 6})
  })
})
