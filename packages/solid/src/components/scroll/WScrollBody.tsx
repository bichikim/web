import {sx, ValidStyle} from '@winter-love/solid/use'
import {createMemo, mergeProps, ParentProps, ValidComponent} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {SCROLL_X_PERCENT, SCROLL_Y_PERCENT} from 'src/components/css-var'
import {useScrollContext} from './scroll-context'

export interface WScrollBodyProps extends ParentProps {
  as?: ValidComponent
  /**
   * recommend overflow-auto relative w-full h-full scrollbar-none
   */
  class?: string
  keepXBar?: boolean
  keepYBar?: boolean
  style?: ValidStyle
}

export const WScrollBody = (_props: WScrollBodyProps) => {
  const props = mergeProps({as: 'div'}, _props)

  const {setScrollBodyElement, value: ScrollValue} = useScrollContext()
  const scrollId = createMemo(() => ScrollValue().id)

  const style = createMemo(() => {
    const {percentX, percentY} = ScrollValue()

    return {
      [SCROLL_X_PERCENT]: percentX,
      [SCROLL_Y_PERCENT]: percentY,
    }
  })

  return (
    <Dynamic
      style={sx(style(), props.style)}
      component={props.as}
      id={scrollId()}
      ref={setScrollBodyElement}
      class={props.class}
    >
      {props.children}
    </Dynamic>
  )
}
