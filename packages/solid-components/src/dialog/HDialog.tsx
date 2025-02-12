import {ParentProps, Show} from 'solid-js'
import {Portal} from 'solid-js/web'

export interface HDialogRootProps extends ParentProps {
  onShowChange?: (value: boolean) => void
  show?: boolean
}

export const HDialogRoot = (props: HDialogRootProps) => {
  // const onShowChange = (value: boolean) => {
  //   props.onShowChange?.(value)
  // }

  return (
    <Show when={props.show}>
      <Portal>{props.children}</Portal>
    </Show>
  )
}
