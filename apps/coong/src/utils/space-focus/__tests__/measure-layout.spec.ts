/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {measureLayout, measureLayoutBoundingClientRect} from '../measure-layout'

const defineMetric = (element: HTMLElement, property: string, value: unknown) => {
  Object.defineProperty(element, property, {configurable: true, value})
}

describe('measureLayout', () => {
  it('should accumulate offset parents without transform coordinates', () => {
    const parent = document.createElement('div')
    const element = document.createElement('div')
    defineMetric(parent, 'offsetLeft', 10)
    defineMetric(parent, 'offsetTop', 20)
    defineMetric(parent, 'scrollLeft', 2)
    defineMetric(parent, 'scrollTop', 3)
    defineMetric(element, 'offsetLeft', 5)
    defineMetric(element, 'offsetTop', 7)
    defineMetric(element, 'offsetWidth', 100)
    defineMetric(element, 'offsetHeight', 40)
    defineMetric(element, 'offsetParent', parent)

    expect(measureLayout(element)).toEqual({
      bottom: 64,
      cx: 63,
      cy: 44,
      left: 13,
      right: 113,
      top: 24,
    })
    expect(measureLayout(null)).toBeNull()
  })

  it('should map a bounding client rectangle to focus coordinates', () => {
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

    expect(measureLayoutBoundingClientRect(element)).toEqual({
      bottom: 60,
      cx: 60,
      cy: 40,
      left: 10,
      right: 110,
      top: 20,
    })
    expect(measureLayoutBoundingClientRect(null)).toBeNull()
  })
})
