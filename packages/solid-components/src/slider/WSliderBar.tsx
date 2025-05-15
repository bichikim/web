import {createMemo, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {BAR_PERCENT} from '../css-var'
import {useSliderContext} from './slider-context'

export type WSliderBarProps<T extends ValidComponent> = DynamicProps<T>

export const WSliderBar = <T extends ValidComponent>(props: WSliderBarProps<T>) => {
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
    <Dynamic {...props} ref={sliderContext.setContainerElement} onClick={onClick} style={barStyle()}>
      {props.children}
    </Dynamic>
  )
}
