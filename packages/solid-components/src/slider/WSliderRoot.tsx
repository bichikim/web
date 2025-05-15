import {createMemo, mergeProps, ParentProps} from 'solid-js'
import {SliderContext, SliderType, useSlider} from './slider-context'
import {SliderAriaContext, SliderAriaContextValue} from './slider-aria-context'

export interface WSliderRootProps extends ParentProps {
  max?: number
  min?: number
  type?: SliderType
}

export const WSliderRoot = (_props: WSliderRootProps) => {
  const props = mergeProps({max: 100, min: 0}, _props)

  const typeAccessor = createMemo(() => {
    return props.type ?? 'horizontal'
  })
  const context = useSlider(typeAccessor)

  const ariaContext = createMemo((): SliderAriaContextValue => {
    return {
      valuemax: String(props.max),
      valuemin: String(props.min),
      valuenow: String((props.max - props.min) * context.value().percent + props.min),
    }
  })

  return (
    <SliderContext.Provider value={context}>
      <SliderAriaContext.Provider value={ariaContext}>{props.children}</SliderAriaContext.Provider>
    </SliderContext.Provider>
  )
}
