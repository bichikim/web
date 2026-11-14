/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useSlider, useSliderContext} from '../slider-context'

afterEach(() => vi.unstubAllGlobals())

describe('useSlider', () => {
  it('should follow resized and replaced containers and detach their observers', () => {
    const callbacks: Array<() => void> = []
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          callbacks.push(callback)
        }
        observe = observe
        disconnect = disconnect
      },
    )
    const first = document.createElement('div')
    const second = document.createElement('div')
    const bounds = vi.spyOn(first, 'getBoundingClientRect')
    bounds.mockReturnValue(new DOMRect(5, 10, 20, 200))
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue(new DOMRect(15, 30, 20, 100))
    const {slider, dispose} = createRoot((dispose) => ({dispose, slider: useSlider('vertical')}))
    slider.setContainerElement(first)
    slider.setPercent(0.5)
    expect(slider.value()).toMatchObject({containerPosition: 10, containerSize: 200, percent: 0.5})
    expect(observe).toHaveBeenCalledWith(first)
    bounds.mockReturnValue(new DOMRect(5, 10, 20, 400))
    callbacks[0]()
    callbacks[0]()
    expect(slider.value()).toMatchObject({containerSize: 400, percent: 0.5})
    slider.setContainerElement(second)
    expect(disconnect).toHaveBeenCalledOnce()
    expect(observe).toHaveBeenLastCalledWith(second)
    expect(slider.value()).toMatchObject({containerPosition: 30, containerSize: 100, percent: 0.5})
    slider.setContainerElement(null)
    expect(disconnect).toHaveBeenCalledTimes(2)
    dispose()
    expect(disconnect).toHaveBeenCalledTimes(2)
  })

  it('should expose horizontal geometry and mutable percentages', () => {
    createRoot((dispose) => {
      const slider = useSlider('horizontal', 10, 80)
      const element = {
        getBoundingClientRect: () => ({height: 20, left: 5, top: 7, width: 200}),
      } as HTMLElement

      expect(slider.value()).toEqual({
        containerPosition: 0,
        containerSize: 0,
        endPercent: 0,
        percent: 0,
        type: 'horizontal',
      })

      slider.setContainerElement(element)
      slider.setPercent(25)
      slider.setEndPercent(75)

      expect(slider.value()).toEqual({
        containerPosition: 5,
        containerSize: 200,
        endPercent: 75,
        percent: 25,
        type: 'horizontal',
      })
      dispose()
    })
  })

  it('should use vertical geometry for a vertical slider', () => {
    createRoot((dispose) => {
      const slider = useSlider('vertical')
      slider.setContainerElement({
        getBoundingClientRect: () => ({height: 300, left: 5, top: 7, width: 20}),
      } as HTMLElement)

      expect(slider.value()).toMatchObject({containerPosition: 7, containerSize: 300})
      dispose()
    })
  })
})

describe('useSliderContext', () => {
  it('should reject access outside a slider provider', () => {
    expect(() => {
      createRoot(() => useSliderContext())
    }).toThrow('useSliderContext must be used within a Slider')
  })
})
