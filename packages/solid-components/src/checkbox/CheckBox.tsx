import {
  Accessor,
  createContext,
  createMemo,
  createSignal,
  createUniqueId,
  ParentProps,
  Show,
  useContext,
  ValidComponent,
} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {LabelRoot} from 'src/label'

export interface ToggleRootProps extends ParentProps {
  disabled?: boolean
  id?: string
  initValue?: boolean
  onChange?: (value: boolean) => void
  required?: boolean
}

export interface CheckboxContextProps {
  checked: boolean
  disabled: boolean
  id: string
  required: boolean
}

export interface CheckboxContextActions {
  onToggleChecked: () => void
}

export const CheckboxContext = createContext<
  [Accessor<CheckboxContextProps>, {onToggleChecked(): void}]
>([
  () => ({
    checked: false,
    disabled: false,
    id: '',
    required: false,
  }),
  {
    onToggleChecked: (): void => {
      throw new Error('not implemented')
    },
  },
])

/**
 * A component that passes the toggle state through data-toggle
 * @component
 */
export const CheckboxRoot = (props: ToggleRootProps) => {
  // initValue
  const [checked, setChecked] = createSignal(props.initValue ?? false)
  const instanceId = createUniqueId()

  const id = createMemo(() => {
    return props.id ?? instanceId
  })

  const onToggleChecked = () => {
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
    <LabelRoot targetId={id()}>
      <CheckboxContext.Provider value={[checkboxContextValue, {onToggleChecked}]}>
        {props.children}
      </CheckboxContext.Provider>
    </LabelRoot>
  )
}

export type CheckboxBodyProps<T extends ValidComponent> = DynamicProps<T> & ParentProps

export const CheckboxBody = <T extends ValidComponent>(props: CheckboxBodyProps<T>) => {
  const [checkboxContext, {onToggleChecked}] = useContext(CheckboxContext)

  return (
    <Dynamic
      {...props}
      aria-checked={checkboxContext().checked}
      aria-required={checkboxContext().required}
      onClick={onToggleChecked}
      data-checked={checkboxContext().checked}
      data-disabled={checkboxContext().disabled}
      disabled={checkboxContext().disabled}
      id={checkboxContext().id}
    />
  )
}

export type CheckboxIndicatorProps<T extends ValidComponent> = DynamicProps<T>

/**
 * When an element that adds data-checked and data-disabled attributes is needed as an Indicator
 * @component
 */
export const CheckboxIndicator = <T extends ValidComponent>(
  props: CheckboxIndicatorProps<T>,
) => {
  const [checkboxContext] = useContext(CheckboxContext)

  return (
    <Dynamic
      {...props}
      data-checked={checkboxContext().checked}
      data-disabled={checkboxContext().disabled}
    />
  )
}

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
