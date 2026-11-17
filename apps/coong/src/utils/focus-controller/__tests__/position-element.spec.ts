/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {getDirection} from '../direction'
import {getElementLine} from '../position-element'

describe('getElementLine', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    {
      direction: getDirection('right'),
      expected: [
        {x: 11, y: 20},
        {x: 12, y: 20},
      ],
      name: 'right',
    },
    {
      direction: getDirection('left'),
      expected: [
        {x: 9, y: 20},
        {x: 8, y: 20},
      ],
      name: 'left',
    },
    {
      direction: getDirection('down'),
      expected: [
        {x: 10, y: 21},
        {x: 10, y: 22},
      ],
      name: 'down',
    },
    {
      direction: getDirection('up'),
      expected: [
        {x: 10, y: 19},
        {x: 10, y: 18},
      ],
      name: 'up',
    },
  ])('should use left as x and top as y when moving $name', ({direction, expected}) => {
    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      bottom: 60,
      height: 40,
      left: 10,
      right: 110,
      toJSON: () => ({}),
      top: 20,
      width: 100,
      x: 10,
      y: 20,
    })

    const nextPoint = getElementLine(element, direction, 3, true)

    expect(nextPoint()).toEqual({x: 10, y: 20})
    expect(nextPoint()).toEqual(expected[0])
    expect(nextPoint()).toEqual(expected[1])
    expect(nextPoint()).toBeUndefined()
  })

  it('should omit the origin by default and stop at the supplied range', () => {
    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 20, 100, 40))

    const nextPoint = getElementLine(element, getDirection('right'), 2)

    expect(nextPoint()).toEqual({x: 11, y: 20})
    expect(nextPoint()).toBeUndefined()
  })
})
