import {createMemo, splitProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {BAR_PERCENT} from 'src/components/css-var'
import {DynamicParentProps} from 'src/components/types'
import {useSliderContext} from './slider-context'

export interface WSliderBarProps extends DynamicParentProps {
  //
}

export const WSliderBar = (_props: WSliderBarProps) => {
  const [props, restProps] = splitProps(_props, ['as', 'children'])
  const as = createMemo(() => props.as ?? 'div')
  const sliderContext = useSliderContext()

  const onClick = (event: MouseEvent) => {
    const {type, containerSize} = sliderContext.value()
    if (type === 'horizontal') {
      sliderContext.setPercent(event.offsetX / containerSize)
    } else {
      sliderContext.setPercent(event.offsetY / containerSize)
    }
  }

  const barStyle = createMemo(() => {
    const {percent} = sliderContext.value()

    return {
      [BAR_PERCENT]: percent,
    }
  })

  return (
    <Dynamic
      {...restProps}
      component={as()}
      ref={sliderContext.setContainerElement}
      onClick={onClick}
      style={barStyle()}
    >
      {props.children}
    </Dynamic>
  )
}
