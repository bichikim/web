import {ComponentProps, Show, useContext} from 'solid-js'
import {SHiddenPanelContext} from './SHiddenPanelProvider'

export interface SHiddenContentProps extends ComponentProps<'div'> {
  //
}

export const SHiddenContent = (props: SHiddenContentProps) => {
  const {isOpen} = useContext(SHiddenPanelContext)

  return <Show when={isOpen()}>{props.children}</Show>
}
