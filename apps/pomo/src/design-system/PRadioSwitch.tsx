import {RadioGroup} from '@kobalte/core/radio-group'
import {cx} from 'class-variance-authority'
import {For, type JSX, Show} from 'solid-js'

export interface PRadioSwitchOption<TValue extends string> {
  readonly icon?: string
  readonly label: string
  readonly value: TValue
}

export interface PRadioSwitchProps<TValue extends string> {
  readonly class?: string
  readonly label: string
  readonly onChange: (value: TValue) => void
  readonly options: readonly PRadioSwitchOption<TValue>[]
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
      class={cx('min-w-0', props.class)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      orientation="horizontal"
      value={props.value}
    >
      <RadioGroup.Label class="mb-2 block text-xs font-700 leading-4 text-muted-foreground">
        {props.label}
      </RadioGroup.Label>
      <div class="flex gap-1 rounded-3.5 border border-solid border-border bg-[rgb(4_4_3_/_28%)] p-1">
        <For each={props.options}>
          {(option) => (
            <RadioGroup.Item class="group min-w-0 flex-1" value={option.value}>
              <RadioGroup.ItemInput aria-label={option.label} />
              <RadioGroup.ItemControl
                class={
                  'flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-2.5 ' +
                  'text-xs font-650 leading-4 text-muted-foreground outline-none ' +
                  'transition-[background-color_140ms_ease,color_140ms_ease] ' +
                  'hover:bg-secondary-soft hover:text-foreground ' +
                  'ui-checked:bg-primary-soft ui-checked:text-foreground ' +
                  'group-focus-within:shadow-focus ' +
                  'max-xs:gap-1 max-xs:text-[0.6875rem] motion-reduce:transition-none'
                }
              >
                <Show when={option.icon}>
                  {(icon) => (
                    <span
                      aria-hidden="true"
                      class={cx('size-4 flex-none text-highlight max-xs:hidden', icon())}
                    />
                  )}
                </Show>
                <span>{option.label}</span>
                <RadioGroup.ItemIndicator class="inline-flex flex-none text-primary">
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
