import {Select} from '@kobalte/core/select'

import './FocusRoomSelect.css'

export interface FocusRoomSelectOption<TValue extends string> {
  readonly label: string
  readonly value: TValue
}

export interface FocusRoomSelectProps<TValue extends string> {
  readonly accessibleLabel?: string
  readonly label: string
  readonly onChange: (value: TValue) => void
  readonly options: readonly FocusRoomSelectOption<TValue>[]
  readonly value: TValue
}

export const FocusRoomSelect = <TValue extends string>(props: FocusRoomSelectProps<TValue>) => {
  const options = () => [...props.options]
  const selectedOption = () =>
    options().find((option) => option.value === props.value) ?? options()[0]

  return (
    <Select<FocusRoomSelectOption<TValue>>
      class="focus-room-select"
      disallowEmptySelection
      gutter={6}
      itemComponent={(itemProps) => (
        <Select.Item class="focus-room-select__item" item={itemProps.item}>
          <Select.ItemLabel>{itemProps.item.rawValue.label}</Select.ItemLabel>
          <Select.ItemIndicator class="focus-room-select__indicator">
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
      <Select.Label class="focus-room-select__label">{props.label}</Select.Label>
      <Select.Trigger
        aria-label={props.accessibleLabel}
        class="focus-room-backdrop focus-room-select__trigger"
      >
        <Select.Value<FocusRoomSelectOption<TValue>>>
          {(state) => state.selectedOption().label}
        </Select.Value>
        <Select.Icon class="focus-room-select__icon">
          <span aria-hidden="true" class="i-tabler-chevron-down size-4" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content class="focus-room-backdrop focus-room-select__content">
          <Select.Listbox class="focus-room-select__listbox" />
        </Select.Content>
      </Select.Portal>
      <Select.HiddenSelect />
    </Select>
  )
}
