import {createSignal, createUniqueId, For, type JSX, Show} from 'solid-js'
import {useInputValue} from '../features/input'

interface SegmentOption<Value extends string> {
  readonly value: Value
  readonly label: string
  readonly title?: string
  readonly icon?: JSX.Element
}
interface SSegmentedControlProps<Value extends string> {
  readonly label: string
  readonly options: readonly SegmentOption<Value>[]
  readonly value?: Value
  readonly onChange?: (value: Value) => void
  readonly disabled?: boolean
  readonly appearance?: 'inset' | 'underline'
}

export const SSegmentedControl = <Value extends string>(props: SSegmentedControlProps<Value>) => {
  const name = createUniqueId()
  const [local, setLocal] = createSignal<Value | null>(null)
  const selection = useInputValue({value: () => props.value ?? local() ?? props.options[0]?.value})
  const select = (value: Value) => {
    setLocal(() => value)
    selection.reset()
    return props.onChange?.(value)
  }
  return (
    <fieldset
      class="m-0 flex min-w-0 gap-1 border-0"
      classList={{
        'border-b border-solid border-stone-200 p-0': props.appearance === 'underline',
        'rounded-lg bg-stone-200/65 p-1': props.appearance !== 'underline',
      }}
    >
      <legend class="sr-only">{props.label}</legend>
      <For each={props.options}>
        {(option) => (
          <label class="min-w-0 flex-1 cursor-pointer" title={option.title}>
            <input
              type="radio"
              name={name}
              value={option.value}
              aria-label={option.label}
              checked={selection.value() === option.value}
              onChange={() => select(option.value)}
              disabled={props.disabled}
              class="peer sr-only"
            />
            <span
              class={
                props.appearance === 'underline' ? 'wallpaper-section-tab' : 'wallpaper-segment'
              }
            >
              <Show when={option.icon}>{option.icon}</Show>
              <span class="truncate">{option.label}</span>
            </span>
          </label>
        )}
      </For>
    </fieldset>
  )
}
