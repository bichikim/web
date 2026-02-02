import {afterEach, describe, expect, it, vi} from 'vitest'
import {createScrollState} from '../scroll-stage-scroll'

const createScrollContentElement = (height: number, clientHeight: number) => {
  const element = document.createElement('div')

  element.getBoundingClientRect = () =>
    ({
      bottom: 0,
      height,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 0,
      width: 0,
      x: 0,
      y: 0,
    }) as DOMRect

  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: clientHeight,
  })

  return element
}

describe('scroll-stage-scroll', () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame

  afterEach(() => {
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: originalRequestAnimationFrame,
    })
  })

  it('updates sizes and computes scroll limit', () => {
    const scrollContentElement = createScrollContentElement(1200, 1200)
    const setBodyHeight = vi.fn()
    const controller = createScrollState(scrollContentElement, {setBodyHeight})

    controller.setViewport({height: 600, width: 800})
    controller.updateSizes()
    expect(controller.state.metrics.height).toBe(1200)
    expect(controller.state.metrics.limit).toBe(600)
    expect(setBodyHeight).toHaveBeenCalledWith(1200)
  })

  it('updates scroll metrics based on scrollY', () => {
    const scrollContentElement = createScrollContentElement(1200, 1200)
    const controller = createScrollState(scrollContentElement, {ease: 1, softThreshold: 0})

    controller.setViewport({height: 600, width: 800})
    controller.updateSizes()
    controller.updatePosition(300)
    expect(controller.state.metrics.hard).toBe(300)
    expect(controller.state.metrics.soft).toBe(300)
    expect(controller.state.metrics.normalized).toBe(0.5)
  })

  it('applies soft threshold when scrolling slowly', () => {
    const scrollContentElement = createScrollContentElement(1200, 1200)
    const controller = createScrollState(scrollContentElement, {ease: 1, softThreshold: 10})

    controller.setViewport({height: 600, width: 800})
    controller.updateSizes()
    controller.updatePosition(5)
    expect(controller.state.metrics.soft).toBe(0)
    expect(controller.state.metrics.normalized).toBe(0)
  })

  it('toggles running state during scroll events', () => {
    const scrollContentElement = createScrollContentElement(1200, 1200)
    const controller = createScrollState(scrollContentElement)
    let rafCallback: FrameRequestCallback | undefined

    const rafMock = vi.fn((callback: FrameRequestCallback) => {
      rafCallback = callback

      return 1
    })

    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: rafMock,
    })
    controller.onScroll()
    expect(controller.state.running).toBe(true)
    expect(rafMock).toHaveBeenCalledTimes(1)
    rafCallback?.(0)
    expect(controller.state.running).toBe(false)
  })
})
