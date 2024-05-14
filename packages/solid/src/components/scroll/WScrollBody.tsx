import {createMemo, JSXElement, mergeProps, ParentProps, ValidComponent} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {SCROLL_X_PERCENT, SCROLL_Y_PERCENT} from 'src/components/css-var'
import {sx, ValidStyle} from 'src/use'
import {useScrollBodyContext} from './scroll-body-context'
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
  xBar?: JSXElement
  yBar?: JSXElement
}

export const WScrollBody = (_props: WScrollBodyProps) => {
  const props = mergeProps({as: 'div'}, _props)
  const [, setScrollElement] = useScrollBodyContext()

  const scrollContext = useScrollContext()
  const scrollId = createMemo(() => scrollContext().id)

  const style = createMemo(() => {
    const {percentX, percentY} = scrollContext()

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
      ref={setScrollElement}
      class={props.class}
    >
      {props.children}
    </Dynamic>
  )
}
