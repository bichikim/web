import {mergeProps, Show, splitProps} from 'solid-js'
import {Dynamic, Portal} from 'solid-js/web'
import {DynamicParentProps} from 'src/types'

export interface WDialogRootProps extends DynamicParentProps {
  onShowChange?: (value: boolean) => void
  show?: boolean
}

export const WDialogRoot = (_props: WDialogRootProps) => {
  const [props, restProps] = splitProps(mergeProps({as: 'div'}, _props), [
    'as',
    'show',
    'children',
    'onShowChange',
  ])

  const onShowChange = (value: boolean) => {
    props.onShowChange?.(value)
  }

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
