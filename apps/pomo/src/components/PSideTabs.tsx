import {createSignal, For, type JSX, Show} from 'solid-js'
import {PSelect} from './PSelect'

export interface PSideTabItem<TValue extends string = string> {
  readonly icon?: string
  readonly label: string
  readonly value: TValue
}

export interface PSideTabsProps<TValue extends string = string> {
  readonly accessibleLabel: string
  readonly children?: JSX.Element
  readonly items: ReadonlyArray<PSideTabItem<TValue>>
  readonly onChange?: (value: TValue) => void
  readonly value?: TValue
}

/** Displays side navigation and content, using a select on narrow screens; absent values fall back to the first item. */
export const PSideTabs = <TValue extends string>(props: PSideTabsProps<TValue>) => {
  const [selected, setSelected] = createSignal<TValue | null>(null)
  const active = () => {
    const value = props.value ?? selected()
    return props.items.find((item) => item.value === value) ?? props.items[0]
  }
  const handleChange = (value: TValue) => {
    setSelected(() => value)
    props.onChange?.(value)
  }

  return (
    <div class="grid grid-cols-[12rem_minmax(0,1fr)] gap-6 max-lg:grid-cols-1 max-lg:gap-4">
      <nav aria-label={props.accessibleLabel} class="flex flex-col gap-1 max-lg:hidden">
        <For each={props.items}>
          {(item) => (
            <button
              type="button"
              aria-current={active()?.value === item.value ? 'page' : undefined}
              onClick={() => handleChange(item.value)}
              class={
                'flex min-h-12 items-center gap-3 rounded-control border-0 bg-transparent px-3 py-2 ' +
                'text-left text-sm text-muted-foreground outline-none hover:bg-surface-interactive ' +
                'focus-visible:shadow-focus aria-[current=page]:bg-primary-soft ' +
                'aria-[current=page]:text-foreground aria-[current=page]:font-750'
              }
            >
              <Show when={item.icon}>
                {(icon) => <span aria-hidden="true" class={`${icon()} size-5 flex-none`} />}
              </Show>
              {item.label}
            </button>
          )}
        </For>
      </nav>
      <div class="hidden max-lg:block">
        <Show when={active()}>
          {(item) => (
            <PSelect
              label={props.accessibleLabel}
              value={item().value}
              options={props.items}
              onChange={handleChange}
            />
          )}
        </Show>
      </div>
      <div class="min-w-0">{props.children}</div>
    </div>
  )
}
