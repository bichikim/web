import {useNumberInput} from '../features/number-input'
import {SChevron} from './SChevron'

interface SNumberInputProps {
  readonly label?: string
  readonly value?: number
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly disabled?: boolean
  readonly onChange?: (value: number) => void | Promise<void>
}

export const SNumberInput = (props: SNumberInputProps) => {
  const input = useNumberInput({
    disabled: () => props.disabled === true,
    max: () => props.max,
    min: () => props.min,
    onChange: (value) => props.onChange?.(value),
    step: () => props.step,
    value: () => props.value,
  })
  const handleKeyboard = (event: KeyboardEvent) => {
    if (props.disabled || event.isComposing) {
      return
    }
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        input.step(1)
        return
      case 'ArrowDown':
        event.preventDefault()
        input.step(-1)
        return
      case 'Enter':
        event.preventDefault()
        input.commit()
        return
      case 'Escape':
        event.preventDefault()
        input.cancel()
    }
  }
  return (
    <span class="wallpaper-number" aria-disabled={props.disabled ?? false}>
      <input
        type="text"
        inputmode="decimal"
        role="spinbutton"
        aria-label={props.label}
        aria-valuemin={props.min}
        aria-valuemax={props.max}
        aria-valuenow={input.value()}
        class="wallpaper-number-text"
        value={input.text()}
        readOnly={props.disabled}
        aria-disabled={props.disabled ?? false}
        onInput={(event) => input.change(event.currentTarget.value)}
        onBlur={input.commit}
        onKeyDown={handleKeyboard}
      />
      <span class="grid grid-rows-2 border-0 border-l border-solid border-stone-300">
        <button
          type="button"
          tabindex="-1"
          class="wallpaper-step"
          aria-label={`${props.label ?? '값'} 늘리기`}
          disabled={props.disabled || (props.max !== undefined && input.value() >= props.max)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => input.step(1)}
        >
          <SChevron up />
        </button>
        <button
          type="button"
          tabindex="-1"
          class="wallpaper-step"
          aria-label={`${props.label ?? '값'} 줄이기`}
          disabled={props.disabled || (props.min !== undefined && input.value() <= props.min)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => input.step(-1)}
        >
          <SChevron />
        </button>
      </span>
    </span>
  )
}
