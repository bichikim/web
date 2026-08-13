import {RadioGroup} from '@kobalte/core/radio-group'
import {cx} from 'class-variance-authority'
import {For, type JSX, Show} from 'solid-js'

import './FocusRoomRadioSwitch.css'

export interface FocusRoomRadioSwitchOption<TValue extends string> {
  readonly icon?: string
  readonly label: string
  readonly value: TValue
}

export interface FocusRoomRadioSwitchProps<TValue extends string> {
  readonly class?: string
  readonly label: string
  readonly onChange: (value: TValue) => void
  readonly options: readonly FocusRoomRadioSwitchOption<TValue>[]
  readonly value: TValue
}

const getNextOptionIndex = (key: string, currentIndex: number, optionCount: number) => {
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return (currentIndex + 1) % optionCount
    case 'ArrowLeft':
    case 'ArrowUp':
      return (currentIndex - 1 + optionCount) % optionCount
    case 'End':
      return optionCount - 1
    case 'Home':
      return 0
    default:
      return null
  }
}

export const FocusRoomRadioSwitch = <TValue extends string>(
  props: FocusRoomRadioSwitchProps<TValue>,
) => {
  const handleChange = (nextValue: string) => {
    const selectedOption = props.options.find((option) => option.value === nextValue)

    if (selectedOption !== undefined) {
      props.onChange(selectedOption.value)
    }
  }
  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    const radioInputs = [
      ...event.currentTarget.querySelectorAll<HTMLInputElement>(
        'input[type="radio"]:not(:disabled)',
      ),
    ]
    const currentIndex = radioInputs.indexOf(event.target as HTMLInputElement)

    if (currentIndex === -1 || radioInputs.length === 0) {
      return
    }

    const nextIndex = getNextOptionIndex(event.key, currentIndex, radioInputs.length)
    if (nextIndex === null) {
      return
    }

    event.preventDefault()
    const nextInput = radioInputs[nextIndex]
    nextInput.focus()
    nextInput.click()
  }

  return (
    <RadioGroup
      class={cx('focus-room-radio-switch', props.class)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      orientation="horizontal"
      value={props.value}
    >
      <RadioGroup.Label class="focus-room-radio-switch__label">{props.label}</RadioGroup.Label>
      <div class="focus-room-radio-switch__options">
        <For each={props.options}>
          {(option) => (
            <RadioGroup.Item class="focus-room-radio-switch__item" value={option.value}>
              <RadioGroup.ItemInput
                aria-label={option.label}
                class="focus-room-radio-switch__input"
              />
              <RadioGroup.ItemControl class="focus-room-radio-switch__control">
                <Show when={option.icon}>
                  {(icon) => (
                    <span
                      aria-hidden="true"
                      class={cx('focus-room-radio-switch__icon size-4', icon())}
                    />
                  )}
                </Show>
                <span>{option.label}</span>
                <RadioGroup.ItemIndicator class="focus-room-radio-switch__indicator">
                  <span aria-hidden="true" class="i-tabler-check size-4" />
                </RadioGroup.ItemIndicator>
              </RadioGroup.ItemControl>
            </RadioGroup.Item>
          )}
        </For>
      </div>
    </RadioGroup>
  )
}
