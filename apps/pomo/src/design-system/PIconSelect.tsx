import {Select} from '@kobalte/core/select'
import {cx} from 'class-variance-authority'

export interface PIconSelectOption<TValue extends string> {
  readonly icon: string
  readonly label: string
  readonly value: TValue
}

export interface PIconSelectProps<TValue extends string> {
  readonly class?: string
  readonly label: string
  readonly onChange: (value: TValue) => void
  readonly options: readonly PIconSelectOption<TValue>[]
  readonly value: TValue
}

export const PIconSelect = <TValue extends string>(props: PIconSelectProps<TValue>) => {
  const options = () => [...props.options]
  const selectedOption = () =>
    options().find((option) => option.value === props.value) ?? options()[0]

  return (
    <Select<PIconSelectOption<TValue>>
      class={cx('pomo-icon-select block', props.class)}
      disallowEmptySelection
      gutter={6}
      itemComponent={(itemProps) => (
        <Select.Item
          class={
            'grid min-h-10 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center ' +
            'gap-2.5 whitespace-nowrap rounded-3 px-[var(--pomo-padding-md)] ' +
            'py-[var(--pomo-padding-sm)] text-sm font-600 leading-5 text-[var(--pomo-text-muted)] ' +
            'outline-none transition-[background-color_120ms_ease,color_120ms_ease] ' +
            'ui-highlighted:bg-[var(--pomo-secondary-soft)] ui-highlighted:text-[var(--pomo-text)] ' +
            'ui-selected:bg-[var(--pomo-accent-soft)] ui-selected:text-[var(--pomo-text)] ' +
            'motion-reduce:transition-none'
          }
          item={itemProps.item}
        >
          <span
            aria-hidden="true"
            class={cx('size-5 text-[var(--pomo-brass)]', itemProps.item.rawValue.icon)}
          />
          <Select.ItemLabel>{itemProps.item.rawValue.label}</Select.ItemLabel>
          <Select.ItemIndicator class="inline-flex text-[var(--pomo-accent)]">
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
      placement="bottom-end"
      value={selectedOption()}
    >
      <Select.Trigger
        aria-label={`${props.label} ${selectedOption().label}`}
        class={
          'pomo-backdrop pomo-interactive-glass grid size-[var(--pomo-control-height-medium)] ' +
          'place-items-center rounded-[var(--pomo-radius-control)] bg-[var(--pomo-glass)] ' +
          'text-[var(--pomo-brass)] shadow-[var(--pomo-shadow)] outline-none ' +
          'transition-[border-color_160ms_ease,background-color_160ms_ease] ' +
          'motion-reduce:transition-none'
        }
      >
        <span aria-hidden="true" class={cx('size-5', selectedOption().icon)} />
        <span class="sr-only">{selectedOption().label}</span>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          class={
            'pomo-backdrop max-h-[min(18rem,var(--kb-popper-available-height))] w-max min-w-40 ' +
            'max-w-[calc(100vw-2rem)] overflow-hidden rounded-4 bg-[var(--pomo-surface-strong)] ' +
            'p-[var(--pomo-padding-sm)] text-[var(--pomo-text)] shadow-[var(--pomo-shadow)] ' +
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
