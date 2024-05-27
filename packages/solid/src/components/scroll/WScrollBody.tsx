import {sx, ValidStyle} from '@winter-love/solid/use'
import {createMemo, mergeProps, ParentProps, splitProps, ValidComponent} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {X_PERCENT_VAR, Y_PERCENT_VAR} from 'src/components/css-var'
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
  const [props, restProps] = splitProps(mergeProps({as: 'div'}, _props), [
    'as',
    'class',
    'children',
    'style',
  ])

  const {setScrollBodyElement, value: ScrollValue} = useScrollContext()
  const scrollId = createMemo(() => ScrollValue().id)

  const style = createMemo(() => {
    const {percentX, percentY} = ScrollValue()

    return {
      [X_PERCENT_VAR]: percentX,
      [Y_PERCENT_VAR]: percentY,
    }
  })

  return (
    <Dynamic
      {...restProps}
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
