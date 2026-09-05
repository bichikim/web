import {RadioGroup} from '@kobalte/core/radio-group'
import {cx} from 'class-variance-authority'
import {For, type JSX, Show} from 'solid-js'

import type {PSceneStyle} from '../features/focus-room-animation'
import {getPomoIconClass} from './icon-style'

export interface PRadioSwitchOption<TValue extends string> {
  readonly disabled?: boolean
  readonly icon?: string
  readonly label: string
  readonly value: TValue
}

export interface PRadioSwitchProps<TValue extends string> {
  readonly class?: string
  readonly disabled?: boolean
  readonly label: string
  readonly onChange: (value: TValue) => void
  readonly options: readonly PRadioSwitchOption<TValue>[]
  readonly sceneStyle?: PSceneStyle
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

export const PRadioSwitch = <TValue extends string>(props: PRadioSwitchProps<TValue>) => {
  const handleChange = (nextValue: string) => {
    const selectedOption = props.options.find((option) => option.value === nextValue)

    if (selectedOption !== undefined && selectedOption.disabled !== true) {
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
      class={cx('min-w-0', props.class)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      orientation="horizontal"
      value={props.value}
    >
      <RadioGroup.Label class="mb-2 block text-xs font-700 leading-4 text-muted-foreground">
        {props.label}
      </RadioGroup.Label>
      <div
        class="flex gap-1 rounded-3.5 border border-solid border-border bg-surface-overlay p-1"
        role="presentation"
      >
        <For each={props.options}>
          {(option) => (
            <RadioGroup.Item
              class="group min-w-0 flex-1"
              disabled={props.disabled || option.disabled}
              value={option.value}
            >
              <RadioGroup.ItemInput
                aria-label={option.label}
                disabled={props.disabled || option.disabled}
              />
              <RadioGroup.ItemControl
                class={
                  'flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-2.5 px-2 ' +
                  'text-xs font-650 leading-4 text-muted-foreground outline-none ' +
                  'transition-[background-color_140ms_ease,color_140ms_ease] ' +
                  'hover:bg-secondary-soft hover:text-foreground ' +
                  'ui-checked:bg-primary-soft ui-checked:text-foreground ' +
                  'ui-disabled:cursor-not-allowed ui-disabled:opacity-35 ' +
                  'ui-disabled:hover:bg-transparent ui-disabled:hover:text-muted-foreground ' +
                  'group-focus-within:shadow-focus ' +
                  'max-xs:gap-1 max-xs:text-[0.6875rem] motion-reduce:transition-none'
                }
              >
                <Show when={option.icon}>
                  {(icon) => (
                    <span
                      aria-hidden="true"
                      class={cx(
                        'size-4 flex-none text-highlight max-xs:hidden',
                        getPomoIconClass(icon(), props.sceneStyle),
                      )}
                    />
                  )}
                </Show>
                <span class="[word-break:keep-all]">{option.label}</span>
                <RadioGroup.ItemIndicator class="inline-flex flex-none text-primary">
                  <span
                    aria-hidden="true"
                    class={cx(getPomoIconClass('i-tabler-check', props.sceneStyle), 'size-4')}
                  />
                </RadioGroup.ItemIndicator>
              </RadioGroup.ItemControl>
            </RadioGroup.Item>
          )}
        </For>
      </div>
    </RadioGroup>
  )
}
