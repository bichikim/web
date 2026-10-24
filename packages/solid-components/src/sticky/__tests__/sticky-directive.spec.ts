/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {getStickyPosition, sticky} from '../sticky-directive'

const createTarget = () => {
  const element = document.createElement('div')
  element.getBoundingClientRect = () => ({
    bottom: 220,
    height: 200,
    left: 30,
    right: 130,
    toJSON: () => ({}),
    top: 20,
    width: 100,
    x: 30,
    y: 20,
  })

  return element
}

describe('getStickyPosition', () => {
  it('should offset every configured edge from target geometry', () => {
    expect(getStickyPosition(createTarget(), {bottom: 4, left: 5, right: 6, top: 3})).toEqual({
      bottom: 216,
      left: 35,
      right: 124,
      top: 23,
    })
  })
})

describe('sticky', () => {
  it('should apply calculated positions to the directed element', () => {
    createRoot((dispose) => {
      const element = document.createElement('div')
      const target = createTarget()

      sticky(element, () => [() => target, () => ({left: 5, top: 3})])

      expect(element.style.left).toBe('35px')
      expect(element.style.top).toBe('23px')
      dispose()
    })
  })

  it('should leave styles unchanged without a target', () => {
    createRoot((dispose) => {
      const element = document.createElement('div')

      sticky(element, () => [() => null, () => ({top: 3})])

      expect(element.getAttribute('style')).toBeNull()
      dispose()
    })
  })
})
