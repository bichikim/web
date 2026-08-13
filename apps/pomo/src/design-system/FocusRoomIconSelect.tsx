import {Select} from '@kobalte/core/select'
import {cx} from 'class-variance-authority'

import './FocusRoomIconSelect.css'

export interface FocusRoomIconSelectOption<TValue extends string> {
  readonly icon: string
  readonly label: string
  readonly value: TValue
}

export interface FocusRoomIconSelectProps<TValue extends string> {
  readonly class?: string
  readonly label: string
  readonly onChange: (value: TValue) => void
  readonly options: readonly FocusRoomIconSelectOption<TValue>[]
  readonly value: TValue
}

export const FocusRoomIconSelect = <TValue extends string>(
  props: FocusRoomIconSelectProps<TValue>,
) => {
  const options = () => [...props.options]
  const selectedOption = () =>
    options().find((option) => option.value === props.value) ?? options()[0]

  return (
    <Select<FocusRoomIconSelectOption<TValue>>
      class={cx('focus-room-icon-select', props.class)}
      disallowEmptySelection
      gutter={6}
      itemComponent={(itemProps) => (
        <Select.Item class="focus-room-icon-select__item" item={itemProps.item}>
          <span
            aria-hidden="true"
            class={cx('focus-room-icon-select__item-icon size-5', itemProps.item.rawValue.icon)}
          />
          <Select.ItemLabel>{itemProps.item.rawValue.label}</Select.ItemLabel>
          <Select.ItemIndicator class="focus-room-icon-select__indicator">
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
        class="focus-room-backdrop focus-room-icon-select__trigger"
      >
        <span aria-hidden="true" class={cx('size-5', selectedOption().icon)} />
        <span class="sr-only">{selectedOption().label}</span>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content class="focus-room-backdrop focus-room-icon-select__content">
          <Select.Listbox class="focus-room-icon-select__listbox" />
        </Select.Content>
      </Select.Portal>
      <Select.HiddenSelect />
    </Select>
  )
}
