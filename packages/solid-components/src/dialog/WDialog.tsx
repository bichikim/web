import {mergeProps, Show, splitProps} from 'solid-js'
import {Dynamic, Portal} from 'solid-js/web'
import {DynamicParentProps} from 'src/types'

export interface WDialogRootProps extends DynamicParentProps {
  onShowChange?: (value: boolean) => void
  show?: boolean
}

export const WDialogRoot = (_props: WDialogRootProps) => {
  const defaultProps = mergeProps({as: 'div'}, _props)
  const [props, restProps] = splitProps(defaultProps, [
    'as',
    'show',
    'children',
    'onShowChange',
  ])
  // const onShowChange = (value: boolean) => {
  //   props.onShowChange?.(value)
  // }

  return (
    <Show when={props.show}>
      <Portal>
        <Dynamic {...restProps} component={props.as}>
          {props.children}
        </Dynamic>
      </Portal>
    </Show>
  )
}
