import {Select} from '@kobalte/core/select'

export interface PSelectOption<TValue extends string> {
  readonly label: string
  readonly value: TValue
}

export interface PSelectProps<TValue extends string> {
  readonly accessibleLabel?: string
  readonly hideLabel?: boolean
  readonly label: string
  readonly onChange: (value: TValue) => void
  readonly options: readonly PSelectOption<TValue>[]
  readonly value: TValue
}

export const PSelect = <TValue extends string>(props: PSelectProps<TValue>) => {
  const options = () => [...props.options]
  const selectedOption = () =>
    options().find((option) => option.value === props.value) ?? options()[0]

  return (
    <Select<PSelectOption<TValue>>
      class="grid w-full min-w-0 gap-1.5"
      disallowEmptySelection
      gutter={6}
      itemComponent={(itemProps) => (
        <Select.Item
          class={
            'flex min-h-10 min-w-0 cursor-pointer items-center justify-between gap-3 rounded-3 ' +
            'px-3 py-2 text-sm font-600 leading-5 ' +
            'text-muted-foreground outline-none ' +
            'transition-[background-color_120ms_ease,color_120ms_ease] ' +
            'ui-highlighted:bg-secondary-soft ui-highlighted:text-foreground ' +
            'ui-selected:bg-primary-soft ui-selected:text-foreground ' +
            'motion-reduce:transition-none'
          }
          item={itemProps.item}
        >
          <Select.ItemLabel class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {itemProps.item.rawValue.label}
          </Select.ItemLabel>
          <Select.ItemIndicator class="inline-flex flex-none text-primary">
            <span aria-hidden="true" class="i-tabler-check size-4" />
          </Select.ItemIndicator>
        </Select.Item>
      )}
      onChange={(option) => {
        if (option) {
          props.onChange(option.value)
        }
      }}
      optionTextValue="label"
      optionValue="value"
      options={options()}
      placement="bottom-start"
      sameWidth
      value={selectedOption()}
    >
      <Select.Label
        class={props.hideLabel ? 'sr-only' : 'text-xs font-650 leading-4 text-muted-foreground'}
        data-visually-hidden={props.hideLabel ? '' : undefined}
      >
        {props.label}
      </Select.Label>
      <Select.Trigger
        aria-label={props.accessibleLabel}
        class={
          'border border-solid border-border backdrop-blur-surface group flex h-control-md w-full min-w-0 ' +
          'max-w-full items-center overflow-hidden ' +
          'justify-between gap-3 rounded-control bg-surface ' +
          'px-4 text-sm font-650 leading-5 text-foreground ' +
          'outline-none transition-[border-color_160ms_ease,background-color_160ms_ease] ' +
          'hover:border-border-hover focus-visible:border-highlight ' +
          'ui-expanded:border-highlight motion-reduce:transition-none'
        }
      >
        <Select.Value<
          PSelectOption<TValue>
        > class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {(state) => state.selectedOption().label}
        </Select.Value>
        <Select.Icon
          class={
            'inline-flex flex-none items-center justify-center text-highlight ' +
            'transition-transform duration-160 ui-group-expanded:rotate-180 motion-reduce:transition-none'
          }
        >
          <span aria-hidden="true" class="i-tabler-chevron-down size-4" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          class={
            'max-h-[min(18rem,var(--kb-popper-available-height))] ' +
            'border border-solid border-border backdrop-blur-surface ' +
            'w-[var(--kb-popper-anchor-width)] overflow-hidden rounded-4 ' +
            'bg-surface-strong p-2 ' +
            'text-foreground shadow-panel ' +
            '[transform-origin:var(--kb-select-content-transform-origin)] ' +
            'animate-select-in motion-reduce:animate-none'
          }
        >
          <Select.Listbox class="grid max-h-[inherit] gap-0.5 overflow-y-auto outline-none" />
        </Select.Content>
      </Select.Portal>
      <Select.HiddenSelect />
    </Select>
  )
}
