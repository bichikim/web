import {createMemo, createSignal, createUniqueId, ParentProps} from 'solid-js'
import {LabelProvider} from '../label'
import {CheckboxContext} from './context'

export interface CheckboxProviderProps extends ParentProps {
  disabled?: boolean
  id?: string
  initValue?: boolean
  onChange?: (value: boolean) => void
  required?: boolean
}

/**
 * A component that passes the toggle state through data-toggle
 * @component
 */
export const CheckboxProvider = (props: CheckboxProviderProps) => {
  // initValue
  const [checked, setChecked] = createSignal(props.initValue ?? false)
  const instanceId = createUniqueId()

  const id = createMemo(() => {
    return props.id ?? instanceId
  })

  const handleToggleChecked = () => {
    if (props.disabled) {
      return
    }

    setChecked((value) => !value)
    props.onChange?.(checked())
  }

  const checkboxContextValue = createMemo(() => {
    return {
      checked: checked(),
      disabled: props.disabled ?? false,
      id: id(),
      required: props.required ?? false,
    }
  })

  return (
    <LabelProvider targetId={id()}>
      <CheckboxContext.Provider value={[checkboxContextValue, {handleToggleChecked}]}>
        {props.children}
      </CheckboxContext.Provider>
    </LabelProvider>
  )
}
