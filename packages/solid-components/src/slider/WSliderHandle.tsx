import {stopPropagation, useDrag, useStyles, StyleType} from '@winter-love/solid-use'
import {createMemo, createSignal, splitProps, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {POSITION_VAR} from 'src/css-var'
import {useSliderAriaContext} from './slider-aria-context'
import {useSliderContext} from './slider-context'
import {cx} from 'class-variance-authority'

type InnerProps = {
  style?: StyleType
}

export type WSliderHandleProps<T extends ValidComponent> = InnerProps & DynamicProps<T>

const toRangeValue = (value: number, min: number, max: number) => {
  if (value > max) {
    return max
  }

  if (value < min) {
    return min
  }

  return value
}

export const wSliderHandleClassName = 'w-slider-handle'

export const WSliderHandle = <T extends ValidComponent>(props: WSliderHandleProps<T>) => {
  const [innerProps, restProps] = splitProps(props, ['style']) as unknown as [Required<InnerProps>, DynamicProps<T>]
  const sliderContext = useSliderContext()
  const sliderAriaContext = useSliderAriaContext()
  const [handelElement, setHandelElement] = createSignal<HTMLElement | null>(null)

  const elementValue = createMemo(() => {
    const element = handelElement()

    const {width, height} = element ? element.getBoundingClientRect() : {height: 0, width: 0}
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
    const {percent, containerSize} = sliderContext.value()
    const position = (containerSize - size) * percent

    return {
      [POSITION_VAR]: `${position}px`,
    }
  })

  useDrag(handelElement, (type, payload) => {
    if (type !== 'move') {
      return
    }

    const {size} = elementValue()
    const {type: barType, containerPosition, containerSize} = sliderContext.value()
    const {x: currentX, y: currentY} = payload.currentPoint
    const {x: relativeX, y: relativeY} = payload.relativePoint

    const position = toRangeValue(
      barType === 'horizontal' ? currentX - relativeX - containerPosition : currentY - relativeY - containerPosition,
      0,
      containerSize - size,
    )

    sliderContext.setPercent(position / (containerSize - size))
  })

  const style = useStyles(() => [handleStyle(), innerProps.style])

  return (
    <Dynamic
      {...restProps}
      class={cx(props.class, wSliderHandleClassName)}
      role="slider"
      aria-orientation={sliderContext.value().type}
      aria-valuemin={sliderAriaContext().valuemin}
      aria-valuemax={sliderAriaContext().valuemax}
      aria-valuenow={sliderAriaContext().valuenow}
      tabindex="0"
      ref={setHandelElement}
      style={style()}
      onClick={stopPropagation()}
    >
      {props.children}
    </Dynamic>
  )
}
