import {ParentProps, Show, useContext} from 'solid-js'
import {CheckboxContext} from './context'

export interface CheckboxToggleProps extends ParentProps {
  // empty
}

/**
 * Unlike CheckboxIndicator, when no element wrapper is needed
 * @component
 */
export const CheckboxToggle = (props: CheckboxToggleProps) => {
  const [checkboxContext] = useContext(CheckboxContext)

  return <Show when={checkboxContext().checked}>{props.children}</Show>
}
