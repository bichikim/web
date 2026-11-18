import {createMemo, JSX, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {BAR_PERCENT} from '../css-var'
import {useSliderContext} from './slider-context'

export type SSliderBarProps<T extends ValidComponent> = DynamicProps<T>

export const SSliderBar = <T extends ValidComponent>(props: SSliderBarProps<T>) => {
  const sliderContext = useSliderContext()

  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    const {type} = sliderContext.value()
    const {width, height} = event.currentTarget.getBoundingClientRect()
    const containerSize = type === 'horizontal' ? width : height

    if (containerSize <= 0) {
      return
    }

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
      {...props}
      ref={sliderContext.setContainerElement}
      onClick={handleClick}
      style={barStyle()}
    >
      {props.children}
    </Dynamic>
  )
}
