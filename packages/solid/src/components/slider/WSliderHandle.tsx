import {stopPropagation, sx, useDrag} from '@winter-love/solid/use'
import {createMemo, createSignal, splitProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {LEFT_VAR, TOP_VAR} from 'src/components/css-var'
import {DynamicParentProps} from 'src/components/types'
import {useSliderContext} from './slider-context'
import {useSliderAriaContext} from './slider-aria-context'

export interface WSliderHandleProps extends DynamicParentProps {
  //
}

const toRangeValue = (value: number, min: number, max: number) => {
  if (value > max) {
    return max
  }
  if (value < min) {
    return min
  }
  return value
}

export const WSliderHandle = (_props: WSliderHandleProps) => {
  const [props, restProps] = splitProps(_props, ['as', 'style', 'children'])
  const sliderContext = useSliderContext()
  const sliderAriaContext = useSliderAriaContext()
  const [handelElement, setHandelElement] = createSignal<HTMLElement | null>(null)

  const elementValue = createMemo(() => {
    const element = handelElement()
    const {width, height} = element
      ? element.getBoundingClientRect()
      : {height: 0, width: 0}
    const {type} = sliderContext.value()

    if (type === 'horizontal') {
      return {
        size: width,
      }
    }
    return {
      size: height,
    }
  })

  const handleStyle = createMemo(() => {
    const {size} = elementValue()
    const {type, percent, containerSize} = sliderContext.value()
    const position = (containerSize - size) * percent
    if (type === 'horizontal') {
      return {
        [LEFT_VAR]: `${position}px`,
      }
    }
    return {
      [TOP_VAR]: `${position}px`,
    }
  })

  useDrag(handelElement, (type, payload) => {
    if (type !== 'move') {
      return
    }

    const {size} = elementValue()
    const {type: barType, containerPosition, containerSize} = sliderContext.value()
    const [currentX, currentY] = payload.currentPoint
    const [relativeX, relativeY] = payload.relativePoint
    const position = toRangeValue(
      barType === 'horizontal'
        ? currentX - relativeX - containerPosition
        : currentY - relativeY - containerPosition,
      0,
      containerSize - size,
    )
    sliderContext.setPercent(position / (containerSize - size))
  })

  const as = createMemo(() => props.as ?? 'div')
  return (
    <Dynamic
      {...restProps}
      component={as()}
      role="slider"
      aria-orientation={sliderContext.value().type}
      aria-valuemin={sliderAriaContext().valuemin}
      aria-valuemax={sliderAriaContext().valuemax}
      aria-valuenow={sliderAriaContext().valuenow}
      tabindex="0"
      ref={setHandelElement}
      style={sx(props.style, handleStyle())}
      onClick={stopPropagation()}
    >
      {props.children}
    </Dynamic>
  )
}
