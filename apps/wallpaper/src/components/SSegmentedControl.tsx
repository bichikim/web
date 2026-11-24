import {
  createSignal,
  createUniqueId,
  For,
  type JSX,
  onCleanup,
  Show,
  startTransition,
} from 'solid-js'
import {useInputValue} from '../features/input'
import {useSettingsTransition} from '../features/settings-navigation'

interface SegmentOption<Value extends string> {
  readonly value: Value
  readonly label: string
  readonly title?: string
  readonly icon?: JSX.Element
}
interface SSegmentedControlProps<Value extends string> {
  readonly deferred?: boolean
  readonly label: string
  readonly options: readonly SegmentOption<Value>[]
  readonly value?: Value
  readonly onChange?: (value: Value) => void
  readonly disabled?: boolean
  readonly appearance?: 'inset' | 'underline'
  /** Equal-width segments by default; false allocates space according to label width. */
  readonly stretch?: boolean
}

export const SSegmentedControl = <Value extends string>(props: SSegmentedControlProps<Value>) => {
  const name = createUniqueId()
  const [local, setLocal] = createSignal<Value | null>(null)
  const [requested, setRequested] = createSignal<Value | null>(null)
  const transition = useSettingsTransition()
  let revision = 0
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const selection = useInputValue({
    value: () => requested() ?? props.value ?? local() ?? props.options[0]?.value,
  })
  const select = (value: Value) => {
    setLocal(() => value)
    if (props.deferred !== true) {
      selection.reset()
      return props.onChange?.(value)
    }
    const change = props.onChange
    revision += 1
    const request = revision
    setRequested(() => value)
    selection.reset()
    return transition
      .start(() => {
        if (!disposed && request === revision) {
          change?.(value)
        }
      })
      .finally(() => {
        if (!disposed && request === revision) {
          setRequested(null)
          selection.reset()
        }
      })
  }
  return (
    <fieldset
      aria-busy={props.deferred ? requested() !== null : undefined}
      class="m-0 flex min-w-0 gap-1 border-0"
      classList={{
        'border-b border-solid border-stone-200 p-0': props.appearance === 'underline',
        'rounded-lg bg-stone-200/65 p-1': props.appearance !== 'underline',
      }}
    >
      <legend class="sr-only">{props.label}</legend>
      <For each={props.options}>
        {(option) => (
          <label
            class="min-w-0 cursor-pointer"
            title={option.title}
            classList={{'flex-1': props.stretch !== false, 'flex-auto': props.stretch === false}}
          >
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
