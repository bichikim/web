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
            'px-[var(--pomo-padding-md)] py-[var(--pomo-padding-sm)] text-sm font-600 leading-5 ' +
            'text-[var(--pomo-text-muted)] outline-none ' +
            'transition-[background-color_120ms_ease,color_120ms_ease] ' +
            'ui-highlighted:bg-[var(--pomo-secondary-soft)] ui-highlighted:text-[var(--pomo-text)] ' +
            'ui-selected:bg-[var(--pomo-accent-soft)] ui-selected:text-[var(--pomo-text)] ' +
            'motion-reduce:transition-none'
          }
          item={itemProps.item}
        >
          <Select.ItemLabel class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {itemProps.item.rawValue.label}
          </Select.ItemLabel>
          <Select.ItemIndicator class="inline-flex flex-none text-[var(--pomo-accent)]">
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
        class={
          props.hideLabel ? 'sr-only' : 'text-xs font-650 leading-4 text-[var(--pomo-text-muted)]'
        }
        data-visually-hidden={props.hideLabel ? '' : undefined}
      >
        {props.label}
      </Select.Label>
      <Select.Trigger
        aria-label={props.accessibleLabel}
        class={
          'pomo-backdrop group flex h-[var(--pomo-control-height-medium)] w-full min-w-0 ' +
          'max-w-full items-center overflow-hidden ' +
          'justify-between gap-3 rounded-[var(--pomo-radius-control)] bg-[var(--pomo-surface)] ' +
          'px-[var(--pomo-padding-lg)] text-sm font-650 leading-5 text-[var(--pomo-text)] ' +
          'outline-none transition-[border-color_160ms_ease,background-color_160ms_ease] ' +
          'hover:border-[var(--pomo-border-hover)] focus-visible:border-[var(--pomo-brass)] ' +
          'ui-expanded:border-[var(--pomo-brass)] motion-reduce:transition-none'
        }
      >
        <Select.Value<
          PSelectOption<TValue>
        > class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {(state) => state.selectedOption().label}
        </Select.Value>
        <Select.Icon
          class={
            'inline-flex flex-none items-center justify-center text-[var(--pomo-brass)] ' +
            'transition-transform duration-160 ui-group-expanded:rotate-180 motion-reduce:transition-none'
          }
        >
          <span aria-hidden="true" class="i-tabler-chevron-down size-4" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          class={
            'pomo-backdrop max-h-[min(18rem,var(--kb-popper-available-height))] ' +
            'w-[var(--kb-popper-anchor-width)] overflow-hidden rounded-4 ' +
            'bg-[var(--pomo-surface-strong)] p-[var(--pomo-padding-sm)] ' +
            'text-[var(--pomo-text)] shadow-[var(--pomo-shadow)] ' +
            '[transform-origin:var(--kb-select-content-transform-origin)] ' +
            '[animation:pomo-select-in_140ms_ease-out] motion-reduce:animate-none'
          }
        >
          <Select.Listbox class="grid max-h-[inherit] gap-0.5 overflow-y-auto outline-none" />
        </Select.Content>
      </Select.Portal>
      <Select.HiddenSelect />
    </Select>
  )
}
