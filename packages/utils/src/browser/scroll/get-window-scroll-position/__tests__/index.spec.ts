/**
 * @vitest-environment jsdom
 */
import {describe, expect, it} from 'vitest'
import {getWindowScrollPosition} from '../'

// todo testing not yet
describe('getWindowScrollPositionX', () => {
  it('should return scroll x for pageXOffset case', () => {
    const scroll = 500

    ;(window.pageXOffset as any) = scroll
    ;(window.pageYOffset as any) = scroll

    expect(getWindowScrollPosition()).toEqual({
      x: scroll,
      y: scroll,
    })
  })

  it('should return scroll x for scrollX case', () => {
    const scroll = 500

    ;(window.scrollX as any) = scroll
    ;(window.scrollY as any) = scroll

    expect(getWindowScrollPosition()).toEqual({
      x: scroll,
      y: scroll,
    })
  })

  it('should return scroll x for scrollTop case', () => {
    const scroll = 500

    ;(document.body.scrollTop as any) = scroll
    ;(document.body.scrollLeft as any) = scroll

    expect(getWindowScrollPosition()).toEqual({
      x: scroll,
      y: scroll,
    })
  })
})
