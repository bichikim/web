/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi} from 'vitest'
import {getBounds} from '../get-bounds'

describe('getBounds', () => {
  it('should return viewport bounds for window with x and y at zero', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 720,
    })

    expect(getBounds(window)).toEqual({
      height: 720,
      width: 1280,
      x: 0,
      y: 0,
    })
  })

  it('should return element bounds from getBoundingClientRect', () => {
    const element = document.createElement('button')

    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })

    expect(getBounds(element)).toEqual({
      height: 32,
      width: 224,
      x: 100,
      y: 8,
    })
  })
})
