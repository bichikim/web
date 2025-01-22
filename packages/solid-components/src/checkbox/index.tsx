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
 * data-toggle 통해
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
 * data-checked 와 data-disabled 가 속성으로 추가해주는 element 가 Indicator 로 필요할 경우
 * @constructor
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
 * CheckboxIndicator 과 다르게 element 랩퍼가 필요 없을 경우
 * @param props
 * @constructor
 */
export const CheckboxToggle = (props: CheckboxToggleProps) => {
  const [checkboxContext] = useContext(CheckboxContext)

  return <Show when={checkboxContext().checked}>{props.children}</Show>
}
