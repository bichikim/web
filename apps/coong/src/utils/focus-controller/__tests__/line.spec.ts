import {describe, expect, it} from 'vitest'
import {type Direction, getDirection} from '../direction'
import type {Position} from '../deep-position'
import {createLine, generateLine} from '../line'

describe('generateLine', () => {
  it('should yield points starting after the origin by default', () => {
    const origin: Position = {x: 2, y: 3}
    const direction: Direction = {x: 1, y: 0}

    const points = [...generateLine(origin, direction, 4)]

    expect(points).toEqual([
      {x: 3, y: 3},
      {x: 4, y: 3},
      {x: 5, y: 3},
    ])
  })

  it('should include the origin when includeOrigin is true', () => {
    const origin: Position = {x: -1, y: -1}
    const direction: Direction = {x: 0, y: 1}

    const points = [...generateLine(origin, direction, 3, true)]

    expect(points).toEqual([
      {x: -1, y: -1},
      {x: -1, y: 0},
      {x: -1, y: 1},
    ])
  })

  it.each([
    {direction: getDirection('right'), expected: {x: 4, y: 7}, name: 'right'},
    {direction: getDirection('left'), expected: {x: 2, y: 7}, name: 'left'},
    {direction: getDirection('down'), expected: {x: 3, y: 8}, name: 'down'},
    {direction: getDirection('up'), expected: {x: 3, y: 6}, name: 'up'},
    {direction: {x: 0, y: 0}, expected: {x: 3, y: 7}, name: 'zero'},
    {direction: {x: -2, y: 3}, expected: {x: 1, y: 10}, name: 'diagonal'},
  ])('should follow the $name direction', ({direction, expected}) => {
    expect([...generateLine({x: 3, y: 7}, direction, 2)]).toEqual([expected])
  })

  it.each([
    {expected: [], includeOrigin: false, range: -1},
    {expected: [], includeOrigin: true, range: -1},
    {expected: [], includeOrigin: false, range: 0},
    {expected: [], includeOrigin: true, range: 0},
    {expected: [], includeOrigin: false, range: 1},
    {expected: [{x: 2, y: 5}], includeOrigin: true, range: 1},
    {
      expected: [
        {x: 3, y: 6},
        {x: 4, y: 7},
      ],
      includeOrigin: false,
      range: 2.5,
    },
    {
      expected: [
        {x: 2, y: 5},
        {x: 3, y: 6},
        {x: 4, y: 7},
      ],
      includeOrigin: true,
      range: 2.5,
    },
  ])(
    'should preserve range $range with includeOrigin=$includeOrigin',
    ({expected, includeOrigin, range}) => {
      expect([...generateLine({x: 2, y: 5}, {x: 1, y: 1}, range, includeOrigin)]).toEqual(expected)
    },
  )
})

describe('createLine', () => {
  it('should return successive points from the underlying generator', () => {
    const origin: Position = {x: 0, y: 0}
    const direction: Direction = {x: 1, y: 1}

    const nextPoint = createLine(origin, direction, 3, true)

    expect(nextPoint()).toEqual({x: 0, y: 0})
    expect(nextPoint()).toEqual({x: 1, y: 1})
    expect(nextPoint()).toEqual({x: 2, y: 2})
    expect(nextPoint()).toBeUndefined()
    expect(nextPoint()).toBeUndefined()
  })

  it('should retain the finite range for a zero direction without the origin', () => {
    const nextPoint = createLine({x: 2, y: 5}, {x: 0, y: 0}, 3)

    expect(nextPoint()).toEqual({x: 2, y: 5})
    expect(nextPoint()).toEqual({x: 2, y: 5})
    expect(nextPoint()).toBeUndefined()
  })
})
