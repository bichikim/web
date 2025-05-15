import {createSync, MaybeAccessor, resolveAccessor} from '@winter-love/solid-use'
import {Accessor, createContext, createMemo, createSignal, Setter, useContext} from 'solid-js'

export interface SliderContextValue {
  setContainerElement: Setter<HTMLElement | null>
  setEndPercent: (percent: number) => void
  setPercent: (percent: number) => void
  value: Accessor<SliderValue>
}

export type SliderType = 'horizontal' | 'vertical'

export interface SliderValue {
  containerPosition: number
  containerSize: number
  endPercent: number
  percent: number
  type?: SliderType
}

export const SliderContext = createContext<SliderContextValue>()

export const useSliderContext = () => {
  const context = useContext(SliderContext)

  if (context === undefined) {
    throw new Error('useSliderContext must be used within a Slider')
  }

  return context
}

export const useSlider = (
  type: MaybeAccessor<SliderType>,
  percent: MaybeAccessor<number> = 0,
  endPercent: MaybeAccessor<number> = 0,
): SliderContextValue => {
  const typeAccessor = resolveAccessor(type)
  const percentAccessor = resolveAccessor(percent)
  const endPercentAccessor = resolveAccessor(endPercent)
  const [getPercentValue, setPercentValue] = createSync(percentAccessor)
  const [getEndPercentValue, setEndPercentValue] = createSync(endPercentAccessor)
  const [containerElement, setContainerElement] = createSignal<HTMLElement | null>(null)

  const sliderValue = createMemo(() => {
    const element = containerElement()
    const type = typeAccessor()

    if (!element) {
      return {
        containerPosition: 0,
        containerSize: 0,
        endPercent: 0,
        percent: 0,
        type,
      }
    }

    const {width, height, top: y, left: x} = element.getBoundingClientRect()
    const percent = getPercentValue()
    const endPercent = getEndPercentValue()

    if (type === 'horizontal') {
      return {
        containerPosition: x,
        containerSize: width,
        endPercent,
        percent,
        type,
      }
    }

    return {
      containerPosition: y,
      containerSize: height,
      endPercent,
      percent,
      type,
    }
  })

  const setPercent = (percent: number) => {
    setPercentValue(percent)
  }

  const setEndPercent = (percent: number) => {
    setEndPercentValue(percent)
  }

  return {
    setContainerElement,
    setEndPercent,
    setPercent,
    value: sliderValue,
  }
}
