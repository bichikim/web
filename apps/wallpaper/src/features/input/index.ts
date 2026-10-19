import {type Accessor, createEffect, createSignal, untrack} from 'solid-js'
export * from './retain-input-focus'

interface UseInputValueProps<Value> {
  readonly value: Accessor<Value>
}

interface InputValue<Value> {
  readonly value: Accessor<Value>
  readonly reset: () => void
}

/** Tracks an external value and restores it after a native input edit. */
export const useInputValue = <Value>(props: UseInputValueProps<Value>): InputValue<Value> => {
  const [value, setValue] = createSignal(untrack(props.value), {equals: false})
  createEffect(() => {
    const current = props.value()
    setValue(() => current)
  })
  return {
    // Native inputs mutate themselves even when the committed value stays unchanged.
    reset: () => setValue(() => untrack(props.value)),
    value,
  }
}
