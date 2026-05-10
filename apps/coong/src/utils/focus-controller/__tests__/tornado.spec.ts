import {describe, expect, it} from 'vitest'
import type {Direction} from '../direction'
import type {Position} from '../deep-position'
import {createTornado, generateTornado} from '../tornado'

describe('generateTornado', () => {
  it('should generate spiral points within provided range', () => {
    const origin: Position = {x: 0, y: 0}
    const points = [...generateTornado(origin, 3, 1, true)]

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
    const points = [...generateTornado(origin, 5, 2, true)]

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

  it('should not include origin when includeOrigin is false', () => {
    const origin: Position = {x: 0, y: 0}
    const iterator = generateTornado(origin, 2, 1, false)

    expect(iterator.next().value).toEqual({x: 1, y: 0})
  })

  it('should return empty sequence when range is not large enough and includeOrigin is false', () => {
    const origin: Position = {x: 10, y: 20}
    const points = [...generateTornado(origin, 1, 1, false)]

    expect(points).toEqual([])
  })

  it('should return only origin when range is not large enough and includeOrigin is true', () => {
    const origin: Position = {x: 10, y: 20}
    const points = [...generateTornado(origin, 1, 1, true)]

    expect(points).toEqual([origin])
  })

  it('should use default parameters when range/gap/includeOrigin are not provided', () => {
    const origin: Position = {x: 0, y: 0}
    const iterator = generateTornado(origin)

    expect(iterator.next().value).toEqual({x: 1, y: 0})
  })
})

describe('createTornado', () => {
  it('should return successive points from the underlying generator', () => {
    const origin: Position = {x: 5, y: 5}
    const direction: Direction = {x: 1, y: 0}
    const nextPosition = createTornado(origin, direction, {
      gap: 1,
      includeOrigin: true,
      range: 3,
    })

    expect(nextPosition()).toEqual({x: 5, y: 5})
    expect(nextPosition()).toEqual({x: 6, y: 5})
    expect(nextPosition()).toEqual({x: 6, y: 6})
  })

  it('should use default parameters when range/gap/includeOrigin are not provided', () => {
    const origin: Position = {x: 5, y: 5}
    const direction: Direction = {x: 1, y: 0}
    const nextPosition = createTornado(origin, direction)

    expect(nextPosition()).toEqual({x: 6, y: 5})
  })

  it('should return undefined when the underlying generator is exhausted', () => {
    const origin: Position = {x: 0, y: 0}
    const direction: Direction = {x: 1, y: 0}
    const nextPosition = createTornado(origin, direction, {
      gap: 1,
      includeOrigin: false,
      range: 1,
    })

    expect(nextPosition()).toBeUndefined()
  })
})
