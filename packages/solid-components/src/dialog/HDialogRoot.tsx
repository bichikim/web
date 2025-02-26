import {ParentProps, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {HClose} from 'src/close'

export interface HDialogRootProps extends ParentProps {
  onShowChange?: (value: boolean) => void
  show?: boolean
}

export const HDialogRoot = (props: HDialogRootProps) => {
  return (
    <HClose.Root>
      <Show when={props.show}>
        <Portal>{props.children}</Portal>
      </Show>
    </HClose.Root>
  )
}
