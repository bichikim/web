import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  ParentProps,
  Show,
  useContext,
  ValidComponent,
} from 'solid-js'
import {LabelContext} from 'src/components/label'
import {Dynamic, DynamicProps} from 'solid-js/web'

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
  Accessor<CheckboxContextProps> & CheckboxContextActions
>(
  Object.assign(
    () => ({
      checked: false,
      disabled: false,
      id: '',
      required: false,
    }),
    {
      onToggleChecked: () => {
        throw new Error('not implemented')
      },
    },
  ),
)

/**
 * data-toggle 통해
 */
export const CheckboxRoot = (props: ToggleRootProps) => {
  const [checked, setChecked] = createSignal(props.initValue ?? false)

  const labelContext = useContext(LabelContext)

  const instanceId = createUniqueId()

  const id = createMemo(() => {
    return props.id ?? instanceId
  })

  createEffect(() => {
    labelContext.setId(id())
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
    <CheckboxContext.Provider
      value={Object.assign(checkboxContextValue, {onToggleChecked})}
    >
      {props.children}
    </CheckboxContext.Provider>
  )
}

export type CheckboxBodyProps<T extends ValidComponent> = DynamicProps<T>

export const CheckboxBody = <T extends ValidComponent>(props: CheckboxBodyProps<T>) => {
  const checkboxContext = useContext(CheckboxContext)

  return (
    <Dynamic
      {...props}
      aria-checked={checkboxContext().checked}
      aria-required={checkboxContext().required}
      onClick={checkboxContext.onToggleChecked}
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
  const checkboxContext = useContext(CheckboxContext)

  return (
    <Show when={checkboxContext().checked}>
      <Dynamic
        {...props}
        data-checked={checkboxContext().checked}
        data-disabled={checkboxContext().disabled}
      />
    </Show>
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
  const checkboxContext = useContext(CheckboxContext)

  return <Show when={checkboxContext().checked}>{props.children}</Show>
}
