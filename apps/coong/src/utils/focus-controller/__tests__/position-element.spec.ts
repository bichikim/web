/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {getElementLine} from '../position-element'

describe('getElementLine', () => {
  it('should build a directional line from the element rectangle', () => {
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

    const nextPoint = getElementLine(element, {x: 1, y: 0}, 2, true)

    expect(nextPoint()).toEqual({x: 20, y: 10})
    expect(nextPoint()).toEqual({x: 21, y: 11})
    expect(nextPoint()).toBeUndefined()
  })
})
