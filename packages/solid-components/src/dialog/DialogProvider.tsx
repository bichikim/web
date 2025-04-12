import {ParentProps, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {Close} from 'src/close'

export interface DialogProviderProps extends ParentProps {
  onShowChange?: (value: boolean) => void
  show?: boolean
}

export const DialogProvider = (props: DialogProviderProps) => {
  return (
    <Close.Provider show={props.show} onShowChange={props.onShowChange}>
      <Show when={props.show}>
        <Portal>{props.children}</Portal>
      </Show>
    </Close.Provider>
  )
}
