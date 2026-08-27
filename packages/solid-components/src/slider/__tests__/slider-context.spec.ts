import {createRoot} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {useSlider, useSliderContext} from '../slider-context'

describe('useSlider', () => {
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
