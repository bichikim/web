import {Portal} from 'solid-js/web'
import {ParentProps, Show} from 'solid-js'
import {getWindow} from '@winter-love/utils'
import {CloseContext} from 'src/use/close'

export interface HModelProps extends ParentProps {
  onChange?: (value: boolean) => void
  when?: boolean
}

export const HModel = (props: HModelProps) => {
  const window = getWindow()

  const handleClose = () => {
    props.onChange?.(false)
  }

  return (
    <CloseContext.Provider value={handleClose}>
      <Show when={props.when}>
        <Portal mount={window?.document.body}>{props.children}</Portal>
      </Show>
    </CloseContext.Provider>
  )
}
