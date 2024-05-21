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
    //
  }

  const barStyle = createMemo(() => {
    const {percent} = sliderContext.value()

    return {
      [BAR_PERCENT]: percent,
    }
  })

  return (
    <Dynamic {...restProps} component={as()} ref={sliderContext.setContainerElement}>
      {props.children}
    </Dynamic>
  )
}
